import {expect} from '../../chai-setup';
import {zeroAddress} from '../../land/fixtures';
import {waitFor} from '../../utils';
import {setupLandMigration} from './fixtures';
import {deployments, ethers, getNamedAccounts} from 'hardhat';
const {deploy} = deployments;

describe('Land Migration', function () {
  describe('LandTunnel <> LandTunnelV2: Land Migration', function () {
    it("can't set admin to zero address", async function () {
      const {
        deployer,
        MockLandTunnelV2,
        MockLandTunnel,
      } = await setupLandMigration();
      await expect(
        deploy('LandTunnelMigration', {
          from: deployer.address,
          contract: 'LandTunnelMigration',
          args: [
            zeroAddress,
            MockLandTunnelV2.address,
            MockLandTunnel.address,
            deployer.address,
          ],
          log: true,
        })
      ).to.be.reverted;
      await expect(
        deployer.MockLandTunnelMigration.changeAdmin(zeroAddress)
      ).to.revertedWith("LandTunnelMigration: admin can't be zero address");
    });

    it("can't set Land to zero address constructor", async function () {
      const {
        deployer,
        MockLandTunnelV2,
        MockLandTunnel,
      } = await setupLandMigration();
      await expect(
        deploy('LandTunnelMigration', {
          from: deployer.address,
          contract: 'LandTunnelMigration',
          args: [
            zeroAddress,
            MockLandTunnelV2.address,
            MockLandTunnel.address,
            deployer.address,
          ],
          log: true,
        })
      ).to.be.reverted;
    });

    it("can't set LandTunnelV2 to zero address constructor", async function () {
      const {deployer, MockLandTunnel, Land} = await setupLandMigration();
      await expect(
        deploy('LandTunnelMigration', {
          from: deployer.address,
          contract: 'LandTunnelMigration',
          args: [
            Land.address,
            zeroAddress,
            MockLandTunnel.address,
            deployer.address,
          ],
          log: true,
        })
      ).to.be.reverted;
    });

    it("can't set LandTunnel to zero address constructor", async function () {
      const {deployer, MockLandTunnelV2, Land} = await setupLandMigration();
      await expect(
        deploy('LandTunnelMigration', {
          from: deployer.address,
          contract: 'LandTunnelMigration',
          args: [
            Land.address,
            MockLandTunnelV2.address,
            zeroAddress,
            deployer.address,
          ],
          log: true,
        })
      ).to.be.reverted;
    });

    it("can't set admin to zero address through constructor", async function () {
      const {
        deployer,
        MockLandTunnelV2,
        MockLandTunnel,
        Land,
      } = await setupLandMigration();
      await expect(
        deploy('LandTunnelMigration', {
          from: deployer.address,
          contract: 'LandTunnelMigration',
          args: [
            Land.address,
            MockLandTunnelV2.address,
            MockLandTunnel.address,
            zeroAddress,
          ],
          log: true,
        })
      ).to.be.reverted;
    });

    it('admin can set new admin and only admin can set new admin', async function () {
      const {MockLandTunnelMigration} = await setupLandMigration();
      const {deployer, landAdmin} = await getNamedAccounts();
      await MockLandTunnelMigration.connect(
        await ethers.provider.getSigner(deployer)
      ).changeAdmin(landAdmin);
    });

    it("admin can't be set to zero address", async function () {
      const {MockLandTunnelMigration} = await setupLandMigration();
      const {deployer} = await getNamedAccounts();

      await expect(
        MockLandTunnelMigration.connect(
          await ethers.provider.getSigner(deployer)
        ).changeAdmin(zeroAddress)
      ).to.be.revertedWith("LandTunnelMigration: admin can't be zero address");
    });

    it('land Migration from old land Tunnel to new land Tunnel', async function () {
      const {
        landMinter,
        users,
        MockLandTunnel,
        Land,
        deployer,
        getId,
        MockLandTunnelV2,
        landAdmin,
        MockLandTunnelMigration,
      } = await setupLandMigration();
      const numberOfLands = 5;
      const landHolder = users[0];
      const size = 1;
      const x = 0;
      const y = 0;
      const bytes = '0x00';
      const ids = [];
      for (let i = 0; i < numberOfLands; i++) {
        await landMinter.Land.mintQuad(
          landHolder.address,
          size,
          x + i,
          y + i,
          bytes
        );
        ids.push(getId(x + i, y + i));
      }
      await landHolder.Land.setApprovalForAll(MockLandTunnel.address, true);

      await waitFor(
        landHolder.MockLandTunnel.batchTransferQuadToL2(
          landHolder.address,
          [size, size, size, size, size],
          [x, x + 1, x + 2, x + 3, x + 4],
          [y, y + 1, y + 2, y + 3, y + 4],
          bytes
        )
      );
      expect(await Land.balanceOf(landHolder.address)).to.be.equal(0);
      expect(await Land.balanceOf(MockLandTunnel.address)).to.be.equal(
        numberOfLands
      );
      await landAdmin.Land.setSuperOperator(
        MockLandTunnelMigration.address,
        true
      );
      await waitFor(deployer.MockLandTunnelMigration.migrateLandsToTunnel(ids));
      expect(await Land.balanceOf(MockLandTunnelV2.address)).to.be.equal(
        numberOfLands
      );
      expect(await Land.balanceOf(MockLandTunnel.address)).to.be.equal(0);
    });

    it('can only migrate land from the old land tunnel', async function () {
      const {
        landMinter,
        users,
        deployer,
        getId,
        landAdmin,
        MockLandTunnelMigration,
      } = await setupLandMigration();
      const numberOfLands = 5;
      const landHolder = users[0];
      const size = 1;
      const x = 0;
      const y = 0;
      const bytes = '0x00';
      const ids = [];
      for (let i = 0; i < numberOfLands; i++) {
        await landMinter.Land.mintQuad(
          landHolder.address,
          size,
          x + i,
          y + i,
          bytes
        );
        ids.push(getId(x + i, y + i));
      }
      await landAdmin.Land.setSuperOperator(
        MockLandTunnelMigration.address,
        true
      );
      await expect(
        deployer.MockLandTunnelMigration.migrateLandsToTunnel(ids)
      ).to.revertedWith('not owner in batchTransferFrom');
    });

    it('only deployer can migrate land from old tunnel to new tunnel ', async function () {
      const {
        landMinter,
        users,
        MockLandTunnel,
        getId,
        landAdmin,
        MockLandTunnelMigration,
      } = await setupLandMigration();
      const numberOfLands = 5;
      const landHolder = users[0];
      const size = 1;
      const x = 0;
      const y = 0;
      const bytes = '0x00';
      const ids = [];
      for (let i = 0; i < numberOfLands; i++) {
        await landMinter.Land.mintQuad(
          landHolder.address,
          size,
          x + i,
          y + i,
          bytes
        );
        ids.push(getId(x + i, y + i));
      }
      await landHolder.Land.setApprovalForAll(MockLandTunnel.address, true);
      await waitFor(
        landHolder.MockLandTunnel.batchTransferQuadToL2(
          landHolder.address,
          [size, size, size, size, size],
          [x, x + 1, x + 2, x + 3, x + 4],
          [y, y + 1, y + 2, y + 3, y + 4],
          bytes
        )
      );
      await landAdmin.Land.setSuperOperator(
        MockLandTunnelMigration.address,
        true
      );
      await expect(
        users[0].MockLandTunnelMigration.migrateLandsToTunnel(ids)
      ).to.revertedWith('!AUTHORISED');
    });

    it('quads Migration from old land Tunnel to new land Tunnel', async function () {
      const {
        landMinter,
        users,
        MockLandTunnel,
        Land,
        deployer,
        getId,
        MockLandTunnelV2,
        landAdmin,
        MockLandTunnelMigration,
      } = await setupLandMigration();
      const numberOfLands = 5;
      const landHolder = users[0];
      const size = 3;
      const x = 0;
      const y = 0;
      const bytes = '0x00';
      const ids = [];
      for (let i = 0; i < numberOfLands; i++) {
        await landMinter.Land.mintQuad(
          landHolder.address,
          size,
          x + i * 3,
          y + i * 3,
          bytes
        );
        ids.push(getId(x + i, y + i));
      }
      await landHolder.Land.setApprovalForAll(MockLandTunnel.address, true);

      await waitFor(
        landHolder.MockLandTunnel.batchTransferQuadToL2(
          landHolder.address,
          [size, size, size, size, size],
          [x, x + 3, x + 6, x + 9, x + 12],
          [y, y + 3, y + 6, y + 9, y + 12],
          bytes
        )
      );
      expect(await Land.balanceOf(landHolder.address)).to.be.equal(0);
      expect(await Land.balanceOf(MockLandTunnel.address)).to.be.equal(
        numberOfLands * 3 * 3
      );
      await landAdmin.Land.setSuperOperator(
        MockLandTunnelMigration.address,
        true
      );
      await waitFor(
        deployer.MockLandTunnelMigration.migrateQuadsToTunnel(
          [size, size, size, size, size],
          [x, x + 3, x + 6, x + 9, x + 12],
          [y, y + 3, y + 6, y + 9, y + 12]
        )
      );
      expect(await Land.balanceOf(MockLandTunnelV2.address)).to.be.equal(
        numberOfLands * 3 * 3
      );
      expect(await Land.balanceOf(MockLandTunnel.address)).to.be.equal(0);
    });

    it('can only migrate quads from the old land tunnel', async function () {
      const {
        landMinter,
        users,
        deployer,
        getId,
        landAdmin,
        MockLandTunnelMigration,
      } = await setupLandMigration();
      const numberOfLands = 5;
      const landHolder = users[0];
      const size = 3;
      const x = 0;
      const y = 0;
      const bytes = '0x00';
      const ids = [];
      for (let i = 0; i < numberOfLands; i++) {
        await landMinter.Land.mintQuad(
          landHolder.address,
          size,
          x + i * 3,
          y + i * 3,
          bytes
        );
        ids.push(getId(x + i, y + i));
      }
      await landAdmin.Land.setSuperOperator(
        MockLandTunnelMigration.address,
        true
      );
      await expect(
        deployer.MockLandTunnelMigration.migrateQuadsToTunnel(
          [size, size, size, size, size],
          [x, x + 3, x + 6, x + 9, x + 12],
          [y, y + 3, y + 6, y + 9, y + 12]
        )
      ).to.revertedWith('not owner of all sub quads nor parent quads');
    });

    it('only deployer can migrate quads from old tunnel to new tunnel ', async function () {
      const {
        landMinter,
        users,
        MockLandTunnel,
        getId,
        landAdmin,
        MockLandTunnelMigration,
      } = await setupLandMigration();
      const numberOfLands = 5;
      const landHolder = users[0];
      const size = 3;
      const x = 0;
      const y = 0;
      const bytes = '0x00';
      const ids = [];
      for (let i = 0; i < numberOfLands; i++) {
        await landMinter.Land.mintQuad(
          landHolder.address,
          size,
          x + i * 3,
          y + i * 3,
          bytes
        );
        ids.push(getId(x + i, y + i));
      }
      await landHolder.Land.setApprovalForAll(MockLandTunnel.address, true);
      await waitFor(
        landHolder.MockLandTunnel.batchTransferQuadToL2(
          landHolder.address,
          [size, size, size, size, size],
          [x, x + 3, x + 6, x + 9, x + 12],
          [y, y + 3, y + 6, y + 9, y + 12],
          bytes
        )
      );
      await landAdmin.Land.setSuperOperator(
        MockLandTunnelMigration.address,
        true
      );
      await expect(
        users[0].MockLandTunnelMigration.migrateQuadsToTunnel(
          [size, size, size, size, size],
          [x, x + 3, x + 6, x + 9, x + 12],
          [y, y + 3, y + 6, y + 9, y + 12]
        )
      ).to.revertedWith('!AUTHORISED');
    });
  });

  describe('PolygonLandTunnel <> PolygonLandTunnelV2: Land Migration', function () {
    it("can't set admin to zero address", async function () {
      const {deployer} = await setupLandMigration();
      await expect(
        deployer.MockPolygonLandTunnelMigration.changeAdmin(zeroAddress)
      ).to.revertedWith("LandTunnelMigration: admin can't be zero address");
    });

    it('admin can set new admin and only admin can set new admin', async function () {
      const {MockPolygonLandTunnelMigration} = await setupLandMigration();
      const {deployer, landAdmin} = await getNamedAccounts();
      await MockPolygonLandTunnelMigration.connect(
        await ethers.provider.getSigner(deployer)
      ).changeAdmin(landAdmin);
    });

    it("admin can't be set to zero address", async function () {
      const {MockPolygonLandTunnelMigration} = await setupLandMigration();
      const {deployer} = await getNamedAccounts();

      await expect(
        MockPolygonLandTunnelMigration.connect(
          await ethers.provider.getSigner(deployer)
        ).changeAdmin(zeroAddress)
      ).to.be.revertedWith(
        "PolygonLandTunnelMigration: admin can't be zero address"
      );
    });

    it("can't set Land to zero address constructor", async function () {
      const {
        deployer,
        MockLandTunnelV2,
        MockLandTunnel,
      } = await setupLandMigration();
      await expect(
        deploy('PolygonLandTunnelMigration', {
          from: deployer.address,
          contract: 'PolygonLandTunnelMigration',
          args: [
            zeroAddress,
            MockLandTunnelV2.address,
            MockLandTunnel.address,
            deployer.address,
          ],
          log: true,
        })
      ).to.be.reverted;
    });

    it("can't set LandTunnelV2 to zero address constructor", async function () {
      const {deployer, MockLandTunnel, Land} = await setupLandMigration();
      await expect(
        deploy('PolygonLandTunnelMigration', {
          from: deployer.address,
          contract: 'PolygonLandTunnelMigration',
          args: [
            Land.address,
            zeroAddress,
            MockLandTunnel.address,
            deployer.address,
          ],
          log: true,
        })
      ).to.be.reverted;
    });

    it("can't set LandTunnel to zero address constructor", async function () {
      const {deployer, MockLandTunnelV2, Land} = await setupLandMigration();
      await expect(
        deploy('PolygonLandTunnelMigration', {
          from: deployer.address,
          contract: 'PolygonLandTunnelMigration',
          args: [
            Land.address,
            MockLandTunnelV2.address,
            zeroAddress,
            deployer.address,
          ],
          log: true,
        })
      ).to.be.reverted;
    });

    it("can't set admin to zero address through constructor", async function () {
      const {
        deployer,
        MockLandTunnelV2,
        MockLandTunnel,
        Land,
      } = await setupLandMigration();
      await expect(
        deploy('PolygonLandTunnelMigration', {
          from: deployer.address,
          contract: 'PolygonLandTunnelMigration',
          args: [
            Land.address,
            MockLandTunnelV2.address,
            MockLandTunnel.address,
            zeroAddress,
          ],
          log: true,
        })
      ).to.be.reverted;
    });

    it('Can receive ERC721 tokens', async function () {
      const {
        landMinter,
        users,
        PolygonLand,
        getId,
        MockPolygonLandTunnelMigration,
      } = await setupLandMigration();
      await landMinter.PolygonLand.mintQuad(users[0].address, 1, 0, 0, '0x');
      const id = getId(0, 0);
      await users[0].PolygonLand.transferFrom(
        users[0].address,
        MockPolygonLandTunnelMigration.address,
        id
      );

      expect(await PolygonLand.ownerOf(id)).to.be.equal(
        MockPolygonLandTunnelMigration.address
      );
    });

    it('land Migration from old Polygon land Tunnel to new Polygon land Tunnel', async function () {
      const {
        landMinter,
        users,
        MockLandTunnel,
        Land,
        PolygonLand,
        deployer,
        getId,
        MockPolygonLandTunnelV2,
        MockPolygonLandTunnelMigration,
        MockPolygonLandTunnel,
      } = await setupLandMigration();
      const numberOfLands = 5;
      const landHolder = users[0];
      const size = 1;
      const x = 0;
      const y = 0;
      const bytes = '0x00';
      const ids = [];
      for (let i = 0; i < numberOfLands; i++) {
        await landMinter.Land.mintQuad(
          landHolder.address,
          size,
          x + i,
          y + i,
          bytes
        );
        ids.push(getId(x + i, y + i));
      }
      await landHolder.Land.setApprovalForAll(MockLandTunnel.address, true);

      await waitFor(
        landHolder.MockLandTunnel.batchTransferQuadToL2(
          landHolder.address,
          [size, size, size, size, size],
          [x, x + 1, x + 2, x + 3, x + 4],
          [y, y + 1, y + 2, y + 3, y + 4],
          bytes
        )
      );
      expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(
        numberOfLands
      );
      expect(await Land.balanceOf(MockLandTunnel.address)).to.be.equal(
        numberOfLands
      );
      await landHolder.PolygonLand.setApprovalForAll(
        MockPolygonLandTunnel.address,
        true
      );
      await landHolder.MockPolygonLandTunnel.batchTransferQuadToL1(
        landHolder.address,
        [size, size, size, size, size],
        [x, x + 1, x + 2, x + 3, x + 4],
        [y, y + 1, y + 2, y + 3, y + 4],
        bytes
      );

      expect(
        await PolygonLand.balanceOf(MockPolygonLandTunnel.address)
      ).to.be.equal(numberOfLands);
      await deployer.PolygonLand.setSuperOperator(
        MockPolygonLandTunnelMigration.address,
        true
      );
      await waitFor(
        deployer.MockPolygonLandTunnelMigration.migrateLandsToTunnel(ids)
      );
      expect(
        await PolygonLand.balanceOf(MockPolygonLandTunnelV2.address)
      ).to.be.equal(numberOfLands);
      expect(
        await PolygonLand.balanceOf(MockPolygonLandTunnel.address)
      ).to.be.equal(0);
    });

    it('can only migrate land from the old polygon land tunnel', async function () {
      const {
        landMinter,
        users,
        MockLandTunnel,
        Land,
        PolygonLand,
        deployer,
        getId,
        MockPolygonLandTunnelMigration,
      } = await setupLandMigration();
      const numberOfLands = 5;
      const landHolder = users[0];
      const size = 1;
      const x = 0;
      const y = 0;
      const bytes = '0x00';
      const ids = [];
      for (let i = 0; i < numberOfLands; i++) {
        await landMinter.Land.mintQuad(
          landHolder.address,
          size,
          x + i,
          y + i,
          bytes
        );
        ids.push(getId(x + i, y + i));
      }
      await landHolder.Land.setApprovalForAll(MockLandTunnel.address, true);

      await waitFor(
        landHolder.MockLandTunnel.batchTransferQuadToL2(
          landHolder.address,
          [size, size, size, size, size],
          [x, x + 1, x + 2, x + 3, x + 4],
          [y, y + 1, y + 2, y + 3, y + 4],
          bytes
        )
      );
      expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(
        numberOfLands
      );
      expect(await Land.balanceOf(MockLandTunnel.address)).to.be.equal(
        numberOfLands
      );

      await deployer.PolygonLand.setSuperOperator(
        MockPolygonLandTunnelMigration.address,
        true
      );
      await expect(
        deployer.MockPolygonLandTunnelMigration.migrateLandsToTunnel(ids)
      ).to.revertedWith('BATCHTRANSFERFROM_NOT_OWNER');
    });

    it('only deployer can migrate land from old tunnel to new tunnel', async function () {
      const {
        landMinter,
        users,
        MockLandTunnel,
        Land,
        PolygonLand,
        deployer,
        getId,
        MockPolygonLandTunnelMigration,
        MockPolygonLandTunnel,
      } = await setupLandMigration();
      const numberOfLands = 5;
      const landHolder = users[0];
      const size = 1;
      const x = 0;
      const y = 0;
      const bytes = '0x00';
      const ids = [];
      for (let i = 0; i < numberOfLands; i++) {
        await landMinter.Land.mintQuad(
          landHolder.address,
          size,
          x + i,
          y + i,
          bytes
        );
        ids.push(getId(x + i, y + i));
      }
      await landHolder.Land.setApprovalForAll(MockLandTunnel.address, true);

      await waitFor(
        landHolder.MockLandTunnel.batchTransferQuadToL2(
          landHolder.address,
          [size, size, size, size, size],
          [x, x + 1, x + 2, x + 3, x + 4],
          [y, y + 1, y + 2, y + 3, y + 4],
          bytes
        )
      );
      expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(
        numberOfLands
      );
      expect(await Land.balanceOf(MockLandTunnel.address)).to.be.equal(
        numberOfLands
      );
      await landHolder.PolygonLand.setApprovalForAll(
        MockPolygonLandTunnel.address,
        true
      );
      await landHolder.MockPolygonLandTunnel.batchTransferQuadToL1(
        landHolder.address,
        [size, size, size, size, size],
        [x, x + 1, x + 2, x + 3, x + 4],
        [y, y + 1, y + 2, y + 3, y + 4],
        bytes
      );

      expect(
        await PolygonLand.balanceOf(MockPolygonLandTunnel.address)
      ).to.be.equal(numberOfLands);
      await deployer.PolygonLand.setSuperOperator(
        MockPolygonLandTunnelMigration.address,
        true
      );
      await waitFor(
        deployer.MockPolygonLandTunnelMigration.migrateLandsToTunnel(ids)
      );
      await expect(
        users[0].MockPolygonLandTunnelMigration.migrateLandsToTunnel(ids)
      ).to.be.revertedWith('!AUTHORISED');
    });

    it('quad Migration from old Polygon land Tunnel to new Polygon land Tunnel', async function () {
      const {
        landMinter,
        users,
        MockLandTunnel,
        Land,
        PolygonLand,
        deployer,
        getId,
        MockPolygonLandTunnelV2,
        MockPolygonLandTunnelMigration,
        MockPolygonLandTunnel,
      } = await setupLandMigration();
      const numberOfQuads = 5;
      const landHolder = users[0];
      const size = 3;
      const x = 0;
      const y = 0;
      const bytes = '0x00';
      const ids = [];
      for (let i = 0; i < numberOfQuads; i++) {
        await landMinter.Land.mintQuad(
          landHolder.address,
          size,
          x + i * 3,
          y + i * 3,
          bytes
        );
        ids.push(getId(x + i, y + i));
      }
      await landHolder.Land.setApprovalForAll(MockLandTunnel.address, true);

      await waitFor(
        landHolder.MockLandTunnel.batchTransferQuadToL2(
          landHolder.address,
          [size, size, size, size, size],
          [x, x + 3, x + 6, x + 9, x + 12],
          [y, y + 3, y + 6, y + 9, y + 12],
          bytes
        )
      );
      expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(
        numberOfQuads * 3 * 3
      );
      expect(await Land.balanceOf(MockLandTunnel.address)).to.be.equal(
        numberOfQuads * 3 * 3
      );
      await landHolder.PolygonLand.setApprovalForAll(
        MockPolygonLandTunnel.address,
        true
      );
      await landHolder.MockPolygonLandTunnel.batchTransferQuadToL1(
        landHolder.address,
        [size, size, size, size, size],
        [x, x + 3, x + 6, x + 9, x + 12],
        [y, y + 3, y + 6, y + 9, y + 12],
        bytes
      );

      expect(
        await PolygonLand.balanceOf(MockPolygonLandTunnel.address)
      ).to.be.equal(numberOfQuads * 3 * 3);
      await deployer.PolygonLand.setSuperOperator(
        MockPolygonLandTunnelMigration.address,
        true
      );
      await waitFor(
        deployer.MockPolygonLandTunnelMigration.migrateQuadsToTunnel(
          [size, size, size, size, size],
          [x, x + 3, x + 6, x + 9, x + 12],
          [y, y + 3, y + 6, y + 9, y + 12]
        )
      );
      expect(
        await PolygonLand.balanceOf(MockPolygonLandTunnelV2.address)
      ).to.be.equal(numberOfQuads * 3 * 3);
      expect(
        await PolygonLand.balanceOf(MockPolygonLandTunnel.address)
      ).to.be.equal(0);
    });

    it('can only migrate quad from the old polygon land tunnel', async function () {
      const {
        landMinter,
        users,
        MockLandTunnel,
        Land,
        PolygonLand,
        deployer,
        getId,
        MockPolygonLandTunnelMigration,
      } = await setupLandMigration();
      const numberOfQuads = 5;
      const landHolder = users[0];
      const size = 3;
      const x = 0;
      const y = 0;
      const bytes = '0x00';
      const ids = [];
      for (let i = 0; i < numberOfQuads; i++) {
        await landMinter.Land.mintQuad(
          landHolder.address,
          size,
          x + i * 3,
          y + i * 3,
          bytes
        );
        ids.push(getId(x + i, y + i));
      }
      await landHolder.Land.setApprovalForAll(MockLandTunnel.address, true);

      await waitFor(
        landHolder.MockLandTunnel.batchTransferQuadToL2(
          landHolder.address,
          [size, size, size, size, size],
          [x, x + 3, x + 6, x + 9, x + 12],
          [y, y + 3, y + 6, y + 9, y + 12],
          bytes
        )
      );
      expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(
        numberOfQuads * 3 * 3
      );
      expect(await Land.balanceOf(MockLandTunnel.address)).to.be.equal(
        numberOfQuads * 3 * 3
      );

      await deployer.PolygonLand.setSuperOperator(
        MockPolygonLandTunnelMigration.address,
        true
      );
      await expect(
        deployer.MockPolygonLandTunnelMigration.migrateQuadsToTunnel(
          [size, size, size, size, size],
          [x, x + 3, x + 6, x + 9, x + 12],
          [y, y + 3, y + 6, y + 9, y + 12]
        )
      ).to.revertedWith('not owner of all sub quads nor parent quads');
    });

    it('only deployer can migrate quads from old tunnel to new tunnel', async function () {
      const {
        landMinter,
        users,
        MockLandTunnel,
        Land,
        PolygonLand,
        deployer,
        getId,
        MockPolygonLandTunnelMigration,
        MockPolygonLandTunnel,
      } = await setupLandMigration();
      const numberOfQuads = 5;
      const landHolder = users[0];
      const size = 3;
      const x = 0;
      const y = 0;
      const bytes = '0x00';
      const ids = [];
      for (let i = 0; i < numberOfQuads; i++) {
        await landMinter.Land.mintQuad(
          landHolder.address,
          size,
          x + i * 3,
          y + i * 3,
          bytes
        );
        ids.push(getId(x + i, y + i));
      }
      await landHolder.Land.setApprovalForAll(MockLandTunnel.address, true);

      await waitFor(
        landHolder.MockLandTunnel.batchTransferQuadToL2(
          landHolder.address,
          [size, size, size, size, size],
          [x, x + 3, x + 6, x + 9, x + 12],
          [y, y + 3, y + 6, y + 9, y + 12],
          bytes
        )
      );
      expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(
        numberOfQuads * 3 * 3
      );
      expect(await Land.balanceOf(MockLandTunnel.address)).to.be.equal(
        numberOfQuads * 3 * 3
      );
      await landHolder.PolygonLand.setApprovalForAll(
        MockPolygonLandTunnel.address,
        true
      );
      await landHolder.MockPolygonLandTunnel.batchTransferQuadToL1(
        landHolder.address,
        [size, size, size, size, size],
        [x, x + 3, x + 6, x + 9, x + 12],
        [y, y + 3, y + 6, y + 9, y + 12],
        bytes
      );

      expect(
        await PolygonLand.balanceOf(MockPolygonLandTunnel.address)
      ).to.be.equal(numberOfQuads * 3 * 3);
      await deployer.PolygonLand.setSuperOperator(
        MockPolygonLandTunnelMigration.address,
        true
      );
      await expect(
        users[0].MockPolygonLandTunnelMigration.migrateQuadsToTunnel(
          [size, size, size, size, size],
          [x, x + 3, x + 6, x + 9, x + 12],
          [y, y + 3, y + 6, y + 9, y + 12]
        )
      ).to.be.revertedWith('!AUTHORISED');
    });

    it('land Migration and withdrawn from old Polygon land Tunnel to new land Tunnel', async function () {
      const {
        landMinter,
        users,
        MockLandTunnel,
        Land,
        PolygonLand,
        deployer,
        MockPolygonLandTunnelV2,
        MockPolygonLandTunnelMigration,
        MockPolygonLandTunnel,
      } = await setupLandMigration();
      const numberOfQuads = 3;
      const numberOfLands = 3 * 6 * 6;
      const landHolder = users[0];
      const size = 6;
      const x = 0;
      const y = 0;
      const bytes = '0x00';

      for (let i = 0; i < numberOfQuads; i++) {
        await landMinter.Land.mintQuad(
          landHolder.address,
          size,
          x + i * size,
          y + i * size,
          bytes
        );
      }

      await landHolder.Land.setApprovalForAll(MockLandTunnel.address, true);

      await waitFor(
        landHolder.MockLandTunnel.batchTransferQuadToL2(
          landHolder.address,
          [size, size, size],
          [x, x + 6, x + 12],
          [y, y + 6, y + 12],
          bytes
        )
      );
      expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(
        numberOfLands
      );
      expect(await Land.balanceOf(MockLandTunnel.address)).to.be.equal(
        numberOfLands
      );
      await landHolder.PolygonLand.setApprovalForAll(
        MockPolygonLandTunnel.address,
        true
      );
      await landHolder.MockPolygonLandTunnel.batchTransferQuadToL1(
        landHolder.address,
        [size, size, size],
        [x, x + 6, x + 12],
        [y, y + 6, y + 12],
        bytes
      );

      expect(
        await PolygonLand.balanceOf(MockPolygonLandTunnel.address)
      ).to.be.equal(numberOfLands);
      await deployer.PolygonLand.setSuperOperator(
        MockPolygonLandTunnelMigration.address,
        true
      );
      await waitFor(
        deployer.MockPolygonLandTunnelMigration.approveNewLandTunnel()
      );
      await waitFor(
        deployer.MockPolygonLandTunnelMigration.migrateToTunnelWithWithdraw({
          owner: landHolder.address,
          sizes: [size],
          x: [x],
          y: [y],
        })
      );
      await waitFor(
        deployer.MockPolygonLandTunnelMigration.migrateToTunnelWithWithdraw({
          owner: landHolder.address,
          sizes: [size],
          x: [x + 6],
          y: [y + 6],
        })
      );
      await waitFor(
        deployer.MockPolygonLandTunnelMigration.migrateToTunnelWithWithdraw({
          owner: landHolder.address,
          sizes: [size],
          x: [x + 12],
          y: [y + 12],
        })
      );
      expect(
        await PolygonLand.balanceOf(MockPolygonLandTunnelV2.address)
      ).to.be.equal(numberOfLands);
      expect(
        await PolygonLand.balanceOf(MockPolygonLandTunnel.address)
      ).to.be.equal(0);
    });

    it('can only migrate and withdraw land from the old polygon land tunnel', async function () {
      const {
        landMinter,
        users,
        MockLandTunnel,
        Land,
        PolygonLand,
        deployer,
        MockPolygonLandTunnelMigration,
      } = await setupLandMigration();
      const numberOfQuads = 3;
      const numberOfLands = 3 * 6 * 6;
      const landHolder = users[0];
      const size = 6;
      const x = 0;
      const y = 0;
      const bytes = '0x00';

      for (let i = 0; i < numberOfQuads; i++) {
        await landMinter.Land.mintQuad(
          landHolder.address,
          size,
          x + i * size,
          y + i * size,
          bytes
        );
      }
      await landHolder.Land.setApprovalForAll(MockLandTunnel.address, true);

      await waitFor(
        landHolder.MockLandTunnel.batchTransferQuadToL2(
          landHolder.address,
          [size, size, size],
          [x, x + 6, x + 12],
          [y, y + 6, y + 12],
          bytes
        )
      );
      expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(
        numberOfLands
      );
      expect(await Land.balanceOf(MockLandTunnel.address)).to.be.equal(
        numberOfLands
      );

      await deployer.PolygonLand.setSuperOperator(
        MockPolygonLandTunnelMigration.address,
        true
      );

      await waitFor(
        deployer.MockPolygonLandTunnelMigration.approveNewLandTunnel()
      );

      await expect(
        deployer.MockPolygonLandTunnelMigration.migrateToTunnelWithWithdraw({
          owner: landHolder.address,
          sizes: [size],
          x: [x],
          y: [y],
        })
      ).to.be.revertedWith('not owner of all sub quads nor parent quads');
    });

    it('only deployer can Migrate and withdraw land from old polygon land tunnel to new land Tunnel', async function () {
      const {
        landMinter,
        users,
        MockLandTunnel,
        Land,
        PolygonLand,
        deployer,
        MockPolygonLandTunnelMigration,
        MockPolygonLandTunnel,
      } = await setupLandMigration();
      const numberOfQuads = 3;
      const numberOfLands = 3 * 6 * 6;
      const landHolder = users[0];
      const size = 6;
      const x = 0;
      const y = 0;
      const bytes = '0x00';

      for (let i = 0; i < numberOfQuads; i++) {
        await landMinter.Land.mintQuad(
          landHolder.address,
          size,
          x + i * size,
          y + i * size,
          bytes
        );
      }
      await landHolder.Land.setApprovalForAll(MockLandTunnel.address, true);

      await waitFor(
        landHolder.MockLandTunnel.batchTransferQuadToL2(
          landHolder.address,
          [size, size, size],
          [x, x + 6, x + 12],
          [y, y + 6, y + 12],
          bytes
        )
      );
      expect(await PolygonLand.balanceOf(landHolder.address)).to.be.equal(
        numberOfLands
      );
      expect(await Land.balanceOf(MockLandTunnel.address)).to.be.equal(
        numberOfLands
      );
      await landHolder.PolygonLand.setApprovalForAll(
        MockPolygonLandTunnel.address,
        true
      );
      await landHolder.MockPolygonLandTunnel.batchTransferQuadToL1(
        landHolder.address,
        [size, size, size],
        [x, x + 6, x + 12],
        [y, y + 6, y + 12],
        bytes
      );
      expect(
        await PolygonLand.balanceOf(MockPolygonLandTunnel.address)
      ).to.be.equal(numberOfLands);
      await deployer.PolygonLand.setSuperOperator(
        MockPolygonLandTunnelMigration.address,
        true
      );
      await waitFor(
        deployer.MockPolygonLandTunnelMigration.approveNewLandTunnel()
      );
      await expect(
        users[0].MockPolygonLandTunnelMigration.migrateToTunnelWithWithdraw({
          owner: landHolder.address,
          sizes: [size, size, size],
          x: [x],
          y: [y],
        })
      ).to.be.revertedWith('!AUTHORISED');
    });
  });
});
