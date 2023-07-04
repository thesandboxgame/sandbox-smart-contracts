import {expect} from 'chai';
import {ethers, upgrades, deployments} from 'hardhat';
import {runCatalystSetup} from './fixtures/catalystFixture';
import {
  CATALYST_BASE_URI,
  CATALYST_IPFS_CID_PER_TIER,
  CATALYST_DEFAULT_ROYALTY,
} from '../constants';
const catalystArray = [1, 2, 3, 4, 5, 6];
const {deploy} = deployments;
const zeroAddress = '0x0000000000000000000000000000000000000000';

describe('catalyst Contract', () => {
  describe('Contract setup', () => {
    it('Should deploy correctly', async () => {
      const {
        catalyst,
        trustedForwarder,
        catalystAdmin,
        catalystMinter,
        catalystAdminRole,
        minterRole,
      } = await runCatalystSetup();
      expect(await catalyst.getTrustedForwarder()).to.be.equal(
        trustedForwarder
      );
      expect(
        await catalyst.hasRole(catalystAdminRole, catalystAdmin)
      ).to.be.equals(true);
      expect(await catalyst.hasRole(minterRole, catalystMinter)).to.be.equals(
        true
      );
      expect(await catalyst.tokenCount()).to.be.equals(6);
      expect(catalyst.address).to.be.properAddress;
    });
    it("base uri can't be empty in initialization", async () => {
      const {
        trustedForwarder,
        catalystAdmin,
        catalystMinter,
        catalystAdminRole,
        minterRole,
        upgradeAdmin,
        deployer,
        catalystRoyaltyRecipient,
        OperatorFilterSubscription,
      } = await runCatalystSetup();
      const CatalystFactory = await ethers.getContractFactory('Catalyst');

      await expect(
        upgrades.deployProxy(
          CatalystFactory,
          [
            '',
            trustedForwarder,
            catalystRoyaltyRecipient,
            OperatorFilterSubscription.address,
            catalystAdmin, // DEFAULT_ADMIN_ROLE
            catalystMinter, // MINTER_ROLE
            CATALYST_DEFAULT_ROYALTY,
            CATALYST_IPFS_CID_PER_TIER,
          ],
          {
            initializer: 'initialize',
          }
        )
      ).to.revertedWith("Catalyst: base uri can't be empty");
    });
    it("trusted forwarder can't be zero in initialization", async () => {
      const {
        catalyst,
        trustedForwarder,
        catalystAdmin,
        catalystMinter,
        catalystAdminRole,
        minterRole,
        deployer,
        upgradeAdmin,
        catalystRoyaltyRecipient,
        OperatorFilterSubscription,
      } = await runCatalystSetup();
      const CatalystFactory = await ethers.getContractFactory('Catalyst');

      await expect(
        upgrades.deployProxy(
          CatalystFactory,
          [
            CATALYST_BASE_URI,
            zeroAddress,
            catalystRoyaltyRecipient,
            OperatorFilterSubscription.address,
            catalystAdmin, // DEFAULT_ADMIN_ROLE
            catalystMinter, // MINTER_ROLE
            CATALYST_DEFAULT_ROYALTY,
            CATALYST_IPFS_CID_PER_TIER,
          ],
          {
            initializer: 'initialize',
          }
        )
      ).to.revertedWith("Catalyst: trusted forwarder can't be zero");
    });
    it("subscription can't be zero in initialization", async () => {
      const {
        catalyst,
        trustedForwarder,
        catalystAdmin,
        catalystMinter,
        catalystAdminRole,
        minterRole,
        deployer,
        upgradeAdmin,
        catalystRoyaltyRecipient,
        OperatorFilterSubscription,
      } = await runCatalystSetup();
      const CatalystFactory = await ethers.getContractFactory('Catalyst');

      await expect(
        upgrades.deployProxy(
          CatalystFactory,
          [
            CATALYST_BASE_URI,
            trustedForwarder,
            catalystRoyaltyRecipient,
            zeroAddress,
            catalystAdmin,
            catalystMinter,
            CATALYST_DEFAULT_ROYALTY,
            CATALYST_IPFS_CID_PER_TIER,
          ],
          {
            initializer: 'initialize',
          }
        )
      ).to.revertedWith("Catalyst: subscription can't be zero");
    });
    it("admin can't be zero in initialization", async () => {
      const {
        catalyst,
        trustedForwarder,
        catalystAdmin,
        catalystMinter,
        catalystAdminRole,
        minterRole,
        deployer,
        upgradeAdmin,
        catalystRoyaltyRecipient,
        OperatorFilterSubscription,
      } = await runCatalystSetup();
      const CatalystFactory = await ethers.getContractFactory('Catalyst');

      await expect(
        upgrades.deployProxy(
          CatalystFactory,
          [
            CATALYST_BASE_URI,
            trustedForwarder,
            catalystRoyaltyRecipient,
            OperatorFilterSubscription.address,
            zeroAddress,
            catalystMinter,
            CATALYST_DEFAULT_ROYALTY,
            CATALYST_IPFS_CID_PER_TIER,
          ],
          {
            initializer: 'initialize',
          }
        )
      ).to.revertedWith("Catalyst: admin can't be zero");
    });
    it("royalty recipient can't be zero in initialization", async () => {
      const {
        catalyst,
        trustedForwarder,
        catalystAdmin,
        catalystMinter,
        catalystAdminRole,
        minterRole,
        deployer,
        upgradeAdmin,
        catalystRoyaltyRecipient,
        OperatorFilterSubscription,
      } = await runCatalystSetup();
      const CatalystFactory = await ethers.getContractFactory('Catalyst');

      await expect(
        upgrades.deployProxy(
          CatalystFactory,
          [
            CATALYST_BASE_URI,
            trustedForwarder,
            zeroAddress,
            OperatorFilterSubscription.address,
            catalystAdmin,
            catalystMinter,
            CATALYST_DEFAULT_ROYALTY,
            CATALYST_IPFS_CID_PER_TIER,
          ],
          {
            initializer: 'initialize',
          }
        )
      ).to.revertedWith("Catalyst: royalty recipient can't be zero");
    });
    it("royalty can't be zero in initialization", async () => {
      const {
        catalyst,
        trustedForwarder,
        catalystAdmin,
        catalystMinter,
        catalystAdminRole,
        minterRole,
        deployer,
        upgradeAdmin,
        catalystRoyaltyRecipient,
        OperatorFilterSubscription,
      } = await runCatalystSetup();
      const CatalystFactory = await ethers.getContractFactory('Catalyst');

      await expect(
        upgrades.deployProxy(
          CatalystFactory,
          [
            CATALYST_BASE_URI,
            trustedForwarder,
            catalystRoyaltyRecipient,
            OperatorFilterSubscription.address,
            catalystAdmin,
            catalystMinter,
            0,
            CATALYST_IPFS_CID_PER_TIER,
          ],
          {
            initializer: 'initialize',
          }
        )
      ).to.revertedWith("Catalyst: royalty can't be zero");
    });
    it("minter can't be zero in initialization", async () => {
      const {
        catalyst,
        trustedForwarder,
        catalystAdmin,
        catalystMinter,
        catalystAdminRole,
        minterRole,
        deployer,
        upgradeAdmin,
        catalystRoyaltyRecipient,
        OperatorFilterSubscription,
      } = await runCatalystSetup();
      const CatalystFactory = await ethers.getContractFactory('Catalyst');

      await expect(
        upgrades.deployProxy(
          CatalystFactory,
          [
            CATALYST_BASE_URI,
            trustedForwarder,
            catalystRoyaltyRecipient,
            OperatorFilterSubscription.address,
            catalystAdmin,
            zeroAddress,
            CATALYST_DEFAULT_ROYALTY,
            CATALYST_IPFS_CID_PER_TIER,
          ],
          {
            initializer: 'initialize',
          }
        )
      ).to.revertedWith("Catalyst: minter can't be zero");
    });
    it("token CID can't be zero in initialization", async () => {
      const {
        catalyst,
        trustedForwarder,
        catalystAdmin,
        catalystMinter,
        catalystAdminRole,
        minterRole,
        deployer,
        upgradeAdmin,
        catalystRoyaltyRecipient,
        OperatorFilterSubscription,
      } = await runCatalystSetup();
      const CatalystFactory = await ethers.getContractFactory('Catalyst');

      await expect(
        upgrades.deployProxy(
          CatalystFactory,
          [
            CATALYST_BASE_URI,
            trustedForwarder,
            catalystRoyaltyRecipient,
            OperatorFilterSubscription.address,
            catalystAdmin,
            catalystMinter,
            CATALYST_DEFAULT_ROYALTY,
            [''],
          ],
          {
            initializer: 'initialize',
          }
        )
      ).to.revertedWith("Catalyst: CID can't be empty");
    });
  });
  describe('Admin Role', () => {
    it('Admin can set minter', async () => {
      const {catalystAsAdmin, user1, minterRole} = await runCatalystSetup();
      await catalystAsAdmin.grantRole(minterRole, user1);
      expect(await catalystAsAdmin.hasRole(minterRole, user1)).to.be.equal(
        true
      );
    });
    it('only Admin can set minter', async () => {
      const {catalyst, user1, minterRole, catalystAdminRole} =
        await runCatalystSetup();

      await expect(
        catalyst
          .connect(await ethers.getSigner(user1))
          .grantRole(minterRole, user1)
      ).to.be.revertedWith(
        `AccessControl: account ${user1.toLocaleLowerCase()} is missing role ${catalystAdminRole}`
      );
    });
    it('Admin can remove minter', async () => {
      const {catalystAsAdmin, user1, minterRole, catalystMinter} =
        await runCatalystSetup();
      expect(
        await catalystAsAdmin.hasRole(minterRole, catalystMinter)
      ).to.be.equal(true);
      await catalystAsAdmin.revokeRole(minterRole, catalystMinter);
      expect(
        await catalystAsAdmin.hasRole(minterRole, catalystMinter)
      ).to.be.equal(false);
    });
    it('only Admin can remove minter', async () => {
      const {catalyst, user1, minterRole, catalystAdminRole, catalystMinter} =
        await runCatalystSetup();

      await expect(
        catalyst
          .connect(await ethers.getSigner(user1))
          .revokeRole(minterRole, catalystMinter)
      ).to.be.revertedWith(
        `AccessControl: account ${user1.toLocaleLowerCase()} is missing role ${catalystAdminRole}`
      );
    });
    it('Admin can add new catalyst', async () => {
      const {catalystAsAdmin, user1, minterRole, catalystMinter} =
        await runCatalystSetup();
      await catalystAsAdmin.addNewCatalystType(7, '0x01');
      expect(await catalystAsAdmin.uri(7)).to.be.equal('ipfs://0x01');
    });

    it('only Admin can add new catalyst', async () => {
      const {catalyst, user1, minterRole, catalystAdminRole, catalystMinter} =
        await runCatalystSetup();

      await expect(
        catalyst
          .connect(await ethers.getSigner(user1))
          .addNewCatalystType(7, '0x01')
      ).to.be.revertedWith(
        `AccessControl: account ${user1.toLocaleLowerCase()} is missing role ${catalystAdminRole}`
      );
    });
    it('Admin can set trusted forwarder', async () => {
      const {catalystAsAdmin, user1, minterRole, catalystMinter} =
        await runCatalystSetup();
      await catalystAsAdmin.setTrustedForwarder(user1);
      expect(await catalystAsAdmin.getTrustedForwarder()).to.be.equal(user1);
    });
    it('only Admin can set trusted forwarder', async () => {
      const {catalyst, user1, minterRole, catalystAdminRole, catalystMinter} =
        await runCatalystSetup();

      await expect(
        catalyst
          .connect(await ethers.getSigner(user1))
          .setTrustedForwarder(user1)
      ).to.be.revertedWith(
        `AccessControl: account ${user1.toLocaleLowerCase()} is missing role ${catalystAdminRole}`
      );
    });
    it('Admin can set metadata hash', async () => {
      const {catalystAsAdmin, user1, minterRole, catalystMinter} =
        await runCatalystSetup();
      expect(await catalystAsAdmin.uri(1)).to.be.equal(
        `ipfs://${CATALYST_IPFS_CID_PER_TIER[0]}`
      );
      await catalystAsAdmin.setMetadataHash(1, '0x01');
      expect(await catalystAsAdmin.uri(1)).to.be.equal('ipfs://0x01');
    });
    it('only Admin can set metadata hash', async () => {
      const {catalyst, user1, minterRole, catalystAdminRole, catalystMinter} =
        await runCatalystSetup();

      await expect(
        catalyst
          .connect(await ethers.getSigner(user1))
          .setMetadataHash(1, '0x01')
      ).to.be.revertedWith(
        `AccessControl: account ${user1.toLocaleLowerCase()} is missing role ${catalystAdminRole}`
      );
    });
    it('Admin can set base uri', async () => {
      const {catalystAsAdmin, user1, minterRole, catalystMinter} =
        await runCatalystSetup();
      expect(await catalystAsAdmin.uri(1)).to.be.equal(
        `ipfs://${CATALYST_IPFS_CID_PER_TIER[0]}`
      );
      await catalystAsAdmin.setBaseURI('ipfs////');
      expect(await catalystAsAdmin.uri(1)).to.be.equal(
        `ipfs////${CATALYST_IPFS_CID_PER_TIER[0]}`
      );
    });
    it('empty base uri cant be set ', async () => {
      const {catalystAsAdmin, user1, minterRole, catalystMinter} =
        await runCatalystSetup();
      await expect(
        catalystAsAdmin.setBaseURI("")
      ).to.be.revertedWith("Catalyst: base uri can't be empty");
    });
    it('only Admin can set base uri', async () => {
      const {catalyst, user1, minterRole, catalystAdminRole, catalystMinter} =
        await runCatalystSetup();

      await expect(
        catalyst.connect(await ethers.getSigner(user1)).setBaseURI('ipfs////')
      ).to.be.revertedWith(
        `AccessControl: account ${user1.toLocaleLowerCase()} is missing role ${catalystAdminRole}`
      );
    });
    it('Admin can set royalty recipient', async () => {
      const {catalystAsAdmin, user1, minterRole, catalystMinter} =
        await runCatalystSetup();
      await catalystAsAdmin.changeRoyaltyRecipient(user1, 0);
      const royaltyInfo = await catalystAsAdmin.royaltyInfo(1, 300000);
      expect(royaltyInfo[0]).to.be.equal(user1);
      expect(royaltyInfo[1]).to.be.equal(0);
    });
    it('only Admin can set royalty recipient', async () => {
      const {catalyst, user1, minterRole, catalystAdminRole, catalystMinter} =
        await runCatalystSetup();

      await expect(
        catalyst
          .connect(await ethers.getSigner(user1))
          .changeRoyaltyRecipient(user1, 0)
      ).to.be.revertedWith(
        `AccessControl: account ${user1.toLocaleLowerCase()} is missing role ${catalystAdminRole}`
      );
    });
    it('cant add invalid token id', async () => {
      const {catalystAsAdmin} = await runCatalystSetup();
      await expect(
        catalystAsAdmin.addNewCatalystType(0, '0x01')
      ).to.be.revertedWith('Catalyst: invalid catalyst id');
    });
    it('cant add invalid token uri', async () => {
      const {catalystAsAdmin} = await runCatalystSetup();
      expect(
        await catalystAsAdmin.addNewCatalystType(9, zeroAddress)
      ).to.be.revertedWith("Catalyst: CID can't be zero");
    });
    it('cant set invalid trusted forwarder', async () => {
      const {catalystAsAdmin} = await runCatalystSetup();
      await expect(
        catalystAsAdmin.setTrustedForwarder(zeroAddress)
      ).to.be.revertedWith("Catalyst: trusted forwarder can't be zero address");
    });
    it('cant set metadata hash for invalid catalyst', async () => {
      const {catalystAsAdmin} = await runCatalystSetup();
      await expect(
        catalystAsAdmin.setMetadataHash(0, '0x01')
      ).to.be.revertedWith('Catalyst: invalid catalyst id');
    });
    it('cant set empty metadata hash', async () => {
      const {catalystAsAdmin} = await runCatalystSetup();
      await expect(catalystAsAdmin.setMetadataHash(1, '')).to.be.revertedWith(
        "Catalyst: metadataHash can't be empty"
      );
    });
    it('cant set invalid base uri', async () => {
      const {catalystAsAdmin} = await runCatalystSetup();
      expect(await catalystAsAdmin.setBaseURI(zeroAddress)).to.be.revertedWith(
        "Catalyst: base uri can't be zero"
      );
    });
  });
  describe('Mint Token', () => {
    it('minter can mint', async () => {
      const {catalystAsMinter, user1} = await runCatalystSetup();
      await catalystAsMinter.mint(user1, 6, 2);
      expect(await catalystAsMinter.balanceOf(user1, 6)).to.be.equal(2);
    });
    it('Non minter cannot mint', async () => {
      const {catalyst, user2, user1, minterRole} = await runCatalystSetup();
      await expect(
        catalyst
          .connect(await ethers.provider.getSigner(user1))
          .mint(user2, 1, 1)
      ).to.be.revertedWith(
        `AccessControl: account ${user1.toLocaleLowerCase()} is missing role ${minterRole}`
      );
    });

    it('Cannot mint invalid catalyst Id', async () => {
      const {catalystAsMinter, user1} = await runCatalystSetup();
      await expect(catalystAsMinter.mint(user1, 7, 1)).to.be.revertedWith(
        'Catalyst: invalid catalyst id'
      );
    });
    it('Minter can batch mint token', async () => {
      const {catalyst, user1, catalystAsMinter} = await runCatalystSetup();
      let catalystId = [];
      let catalystAmount = [];
      for (let i = 0; i < catalystArray.length; i++) {
        catalystId.push(catalystArray[i]);
        catalystAmount.push(catalystArray[i] * 2);
      }
      await catalystAsMinter.mintBatch(user1, catalystId, catalystAmount);
      for (let i = 0; i < catalystArray.length; i++) {
        expect(await catalyst.balanceOf(user1, catalystArray[i])).to.be.equal(
          catalystArray[i] * 2
        );
      }
    });
    it('Minter can mint token', async () => {
      const {catalyst, user1, catalystAsMinter} = await runCatalystSetup();
      await catalystAsMinter.mint(user1, 1, 10);
      expect(await catalyst.balanceOf(user1, 1)).to.be.equal(10);
    });
  });
  describe('Total Supply', () => {
    it('Total Supply increase on minting', async () => {
      const {catalyst, user1, catalystAsMinter} = await runCatalystSetup();
      for (let i = 0; i < catalystArray.length; i++) {
        expect(await catalyst.totalSupply(catalystArray[i])).to.equal(0);
        await catalystAsMinter.mint(user1, catalystArray[i], 2);
        expect(await catalyst.totalSupply(catalystArray[i])).to.be.equal(2);
      }
    });
    it('Total Supply increase on batch minting', async () => {
      const {catalyst, user1, catalystAsMinter} = await runCatalystSetup();
      let catalystId = [];
      let catalystAmount = [];
      for (let i = 0; i < catalystArray.length; i++) {
        catalystId.push(catalystArray[i]);
        catalystAmount.push(catalystArray[i] * 2);
      }
      await catalystAsMinter.mintBatch(user1, catalystId, catalystAmount);
      for (let i = 0; i < catalystArray.length; i++) {
        expect(await catalyst.totalSupply(catalystArray[i])).to.equal(
          catalystArray[i] * 2
        );
      }
    });
    it('Total Supply decrease on burning', async () => {
      const {catalyst, user1, catalystAsMinter} = await runCatalystSetup();
      let catalystAmount = [];
      for (let i = 0; i < catalystArray.length; i++) {
        expect(await catalyst.totalSupply(catalystArray[i])).to.be.equal(0);
        catalystAmount.push(catalystArray[i] * 2);
      }
      await catalystAsMinter.mintBatch(user1, catalystArray, catalystAmount);
      for (let i = 0; i < catalystArray.length; i++) {
        expect(await catalyst.totalSupply(catalystArray[i])).to.equal(
          catalystAmount[i]
        );

        await catalystAsMinter.burnFrom(user1, catalystArray[i], 2);
        expect(await catalyst.totalSupply(catalystArray[i])).to.be.equal(
          catalystArray[i] * 2 - 2
        );
      }
    });
    it('Total Supply decrease on batch burning', async () => {
      const {catalyst, user1, catalystAsMinter} = await runCatalystSetup();
      for (let i = 0; i < catalystArray.length; i++) {
        expect(await catalyst.totalSupply(catalystArray[i])).to.equal(0);
      }
      let catalystId = [];
      let catalystAmount = [];
      for (let i = 0; i < catalystArray.length; i++) {
        catalystId.push(catalystArray[i]);
        catalystAmount.push(catalystArray[i] * 2);
      }
      await catalystAsMinter.mintBatch(user1, catalystId, catalystAmount);
      for (let i = 0; i < catalystArray.length; i++) {
        expect(await catalyst.totalSupply(catalystArray[i])).to.equal(
          catalystArray[i] * 2
        );
      }
      catalystAmount = [];

      for (let i = 0; i < catalystArray.length; i++) {
        catalystAmount.push(1);
      }

      await catalystAsMinter.burnBatchFrom(user1, catalystId, catalystAmount);
      for (let i = 0; i < catalystArray.length; i++) {
        expect(await catalyst.totalSupply(catalystArray[i])).to.equal(
          catalystArray[i] * 2 - 1
        );
      }
    });
  });
  describe('Burn catalyst', () => {
    it("minter can burn user's catalyst", async () => {
      const {catalyst, user1, catalystAsMinter} = await runCatalystSetup();
      await catalystAsMinter.mint(user1, 1, 5);
      expect(await catalyst.balanceOf(user1, 1)).to.be.equal(5);
      await catalystAsMinter.burnFrom(user1, 1, 2);
      expect(await catalyst.balanceOf(user1, 1)).to.be.equal(3);
    });
    it("minter can batch burn user's catalyst", async () => {
      const {catalyst, user1, catalystAsMinter} = await runCatalystSetup();
      await catalystAsMinter.mint(user1, 1, 5);
      await catalystAsMinter.mint(user1, 2, 6);

      expect(await catalyst.balanceOf(user1, 1)).to.be.equal(5);
      expect(await catalyst.balanceOf(user1, 2)).to.be.equal(6);
      let catalystId = [1, 2];
      let catalystAmount = [2, 2];
      await catalystAsMinter.burnBatchFrom(user1, catalystId, catalystAmount);
      expect(await catalyst.balanceOf(user1, 1)).to.be.equal(3);
      expect(await catalyst.balanceOf(user1, 2)).to.be.equal(4);
    });
    it('user can burn their catalyst', async () => {
      const {catalyst, user1, catalystAsMinter} = await runCatalystSetup();
      await catalystAsMinter.mint(user1, 1, 5);
      expect(await catalyst.balanceOf(user1, 1)).to.be.equal(5);
      await catalyst
        .connect(await ethers.provider.getSigner(user1))
        .burn(user1, 1, 2);
      expect(await catalyst.balanceOf(user1, 1)).to.be.equal(3);
    });
    it('user can batch burn their catalyst', async () => {
      const {catalyst, user1, catalystAsMinter} = await runCatalystSetup();
      await catalystAsMinter.mint(user1, 1, 5);
      await catalystAsMinter.mint(user1, 2, 6);

      expect(await catalyst.balanceOf(user1, 1)).to.be.equal(5);
      expect(await catalyst.balanceOf(user1, 2)).to.be.equal(6);
      let catalystId = [1, 2];
      let catalystAmount = [2, 2];
      await catalyst
        .connect(await ethers.provider.getSigner(user1))
        .burnBatch(user1, catalystId, catalystAmount);
      expect(await catalyst.balanceOf(user1, 1)).to.be.equal(3);
      expect(await catalyst.balanceOf(user1, 2)).to.be.equal(4);
    });
  });
  describe('Metadata', () => {
    it("user can view token's metadata", async () => {
      const {catalyst} = await runCatalystSetup();
      for (let i = 0; i < catalystArray.length; i++) {
        expect(await catalyst.uri(catalystArray[i])).to.be.equal(
          `ipfs://${CATALYST_IPFS_CID_PER_TIER[i]}`
        );
      }
    });
  });

  describe('Token transfer and approval', () => {
    it('owner can approve operator', async () => {
      const {catalyst, user1, catalystAsMinter, user2} =
        await runCatalystSetup();
      await catalystAsMinter.mint(user1, 1, 10);
      expect(await catalyst.balanceOf(user1, 1)).to.be.equal(10);
      await catalyst
        .connect(await ethers.provider.getSigner(user1))
        .setApprovalForAll(user2, true);
      expect(await catalyst.isApprovedForAll(user1, user2)).to.be.equal(true);
    });
    it('approved operator can transfer', async () => {
      const {catalyst, user1, catalystAsMinter, user2} =
        await runCatalystSetup();
      await catalystAsMinter.mint(user1, 1, 10);
      expect(await catalyst.balanceOf(user1, 1)).to.be.equal(10);
      await catalyst
        .connect(await ethers.provider.getSigner(user1))
        .setApprovalForAll(user2, true);
      expect(await catalyst.isApprovedForAll(user1, user2)).to.be.equal(true);
      await catalyst
        .connect(await ethers.provider.getSigner(user1))
        .safeTransferFrom(user1, user2, 1, 10, zeroAddress);
      expect(await catalyst.balanceOf(user2, 1)).to.be.equal(10);
    });
    it('approved operator can batch transfer', async () => {
      const {catalyst, user1, catalystAsMinter, user2} =
        await runCatalystSetup();
      await catalystAsMinter.mint(user1, 1, 10);
      await catalystAsMinter.mint(user1, 2, 10);

      expect(await catalyst.balanceOf(user1, 1)).to.be.equal(10);
      expect(await catalyst.balanceOf(user1, 2)).to.be.equal(10);
      await catalyst
        .connect(await ethers.provider.getSigner(user1))
        .setApprovalForAll(user2, true);
      expect(await catalyst.isApprovedForAll(user1, user2)).to.be.equal(true);
      await catalyst
        .connect(await ethers.provider.getSigner(user1))
        .safeBatchTransferFrom(user1, user2, [1, 2], [10, 10], zeroAddress);
      expect(await catalyst.balanceOf(user2, 1)).to.be.equal(10);
      expect(await catalyst.balanceOf(user2, 2)).to.be.equal(10);
    });
  });
});
