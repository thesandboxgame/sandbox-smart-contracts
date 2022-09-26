import {expect} from '../../chai-setup';
import {waitFor} from '../../utils';
import {setupLandMigration} from './fixtures';

describe('Land Migration', function () {
  describe('LandTunnel <> LandTunnelV2: Land Migartion', function () {
    it('land Migartion from old land Tunnel to new land Tunnel', async function () {
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
      await waitFor(deployer.MockLandTunnelMigration.migrateToTunnel(ids));
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
        deployer.MockLandTunnelMigration.migrateToTunnel(ids)
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
        users[0].MockLandTunnelMigration.migrateToTunnel(ids)
      ).to.revertedWith('!AUTHORISED');
    });
  });

  describe('PolygonLandTunnel <> PolygonLandTunnelV2: Land Migration', function () {
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
        deployer.MockPolygonLandTunnelMigration.migrateToTunnel(ids)
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
        deployer.MockPolygonLandTunnelMigration.migrateToTunnel(ids)
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
        deployer.MockPolygonLandTunnelMigration.migrateToTunnel(ids)
      );
      await expect(
        users[0].MockPolygonLandTunnelMigration.migrateToTunnel(ids)
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
        deployer.MockPolygonLandTunnelMigration.migrateToTunnelWithWithdraw([
          {owner: landHolder.address, ids: ids},
        ])
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
        deployer.MockPolygonLandTunnelMigration.migrateToTunnelWithWithdraw([
          {owner: landHolder.address, ids: ids},
        ])
      ).to.be.revertedWith('BATCHTRANSFERFROM_NOT_OWNER');
    });

    it('only deployer can Migrate and withdraw land from old polygon land tunnel to new land Tunnel', async function () {
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
      await expect(
        users[0].MockPolygonLandTunnelMigration.migrateToTunnelWithWithdraw([
          {owner: landHolder.address, ids: ids},
        ])
      ).to.be.revertedWith('!AUTHORISED');
    });
  });
});
