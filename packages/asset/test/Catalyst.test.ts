import {expect} from 'chai';
import {ethers, upgrades} from 'hardhat';
import {runCatalystSetup} from './fixtures/catalystFixture';
import {
  CATALYST_BASE_URI,
  CATALYST_IPFS_CID_PER_TIER,
  CATALYST_DEFAULT_ROYALTY,
} from '../data/constants';
const catalystArray = [1, 2, 3, 4, 5, 6];
const zeroAddress = '0x0000000000000000000000000000000000000000';

describe('catalyst Contract', function () {
  describe('Contract setup', function () {
    it('Should deploy correctly', async function () {
      const {
        catalyst,
        trustedForwarder,
        catalystAdmin,
        catalystMinter,
        catalystAdminRole,
        minterRole,
      } = await runCatalystSetup();
      expect(await catalyst.getTrustedForwarder()).to.be.equal(
        trustedForwarder.address
      );
      expect(
        await catalyst.hasRole(catalystAdminRole, catalystAdmin.address)
      ).to.be.equals(true);
      expect(
        await catalyst.hasRole(minterRole, catalystMinter.address)
      ).to.be.equals(true);
      expect(await catalyst.tokenCount()).to.be.equals(6);
      expect(catalyst.address).to.be.properAddress;
    });
    it("base uri can't be empty in initialization", async function () {
      const {
        trustedForwarder,
        catalystAdmin,
        catalystMinter,
        catalystRoyaltyRecipient,
        OperatorFilterSubscription,
      } = await runCatalystSetup();
      const CatalystFactory = await ethers.getContractFactory('Catalyst');

      await expect(
        upgrades.deployProxy(
          CatalystFactory,
          [
            '',
            trustedForwarder.address,
            catalystRoyaltyRecipient.address,
            OperatorFilterSubscription.address,
            catalystAdmin.address, // DEFAULT_ADMIN_ROLE
            catalystMinter.address, // MINTER_ROLE
            CATALYST_DEFAULT_ROYALTY,
            CATALYST_IPFS_CID_PER_TIER,
          ],
          {
            initializer: 'initialize',
          }
        )
      ).to.revertedWith("Catalyst: base uri can't be empty");
    });
    it("trusted forwarder can't be zero in initialization", async function () {
      const {
        catalystAdmin,
        catalystMinter,
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
            catalystRoyaltyRecipient.address,
            OperatorFilterSubscription.address,
            catalystAdmin.address, // DEFAULT_ADMIN_ROLE
            catalystMinter.address, // MINTER_ROLE
            CATALYST_DEFAULT_ROYALTY,
            CATALYST_IPFS_CID_PER_TIER,
          ],
          {
            initializer: 'initialize',
          }
        )
      ).to.revertedWith("Catalyst: trusted forwarder can't be zero");
    });
    it("subscription can't be zero in initialization", async function () {
      const {
        trustedForwarder,
        catalystAdmin,
        catalystMinter,
        catalystRoyaltyRecipient,
      } = await runCatalystSetup();
      const CatalystFactory = await ethers.getContractFactory('Catalyst');

      await expect(
        upgrades.deployProxy(
          CatalystFactory,
          [
            CATALYST_BASE_URI,
            trustedForwarder.address,
            catalystRoyaltyRecipient.address,
            zeroAddress,
            catalystAdmin.address,
            catalystMinter.address,
            CATALYST_DEFAULT_ROYALTY,
            CATALYST_IPFS_CID_PER_TIER,
          ],
          {
            initializer: 'initialize',
          }
        )
      ).to.revertedWith("Catalyst: subscription can't be zero");
    });
    it("admin can't be zero in initialization", async function () {
      const {
        trustedForwarder,
        catalystMinter,
        catalystRoyaltyRecipient,
        OperatorFilterSubscription,
      } = await runCatalystSetup();
      const CatalystFactory = await ethers.getContractFactory('Catalyst');

      await expect(
        upgrades.deployProxy(
          CatalystFactory,
          [
            CATALYST_BASE_URI,
            trustedForwarder.address,
            catalystRoyaltyRecipient.address,
            OperatorFilterSubscription.address,
            zeroAddress,
            catalystMinter.address,
            CATALYST_DEFAULT_ROYALTY,
            CATALYST_IPFS_CID_PER_TIER,
          ],
          {
            initializer: 'initialize',
          }
        )
      ).to.revertedWith("Catalyst: admin can't be zero");
    });
    it("royalty recipient can't be zero in initialization", async function () {
      const {
        trustedForwarder,
        catalystAdmin,
        catalystMinter,
        OperatorFilterSubscription,
      } = await runCatalystSetup();
      const CatalystFactory = await ethers.getContractFactory('Catalyst');

      await expect(
        upgrades.deployProxy(
          CatalystFactory,
          [
            CATALYST_BASE_URI,
            trustedForwarder.address,
            zeroAddress,
            OperatorFilterSubscription.address,
            catalystAdmin.address,
            catalystMinter.address,
            CATALYST_DEFAULT_ROYALTY,
            CATALYST_IPFS_CID_PER_TIER,
          ],
          {
            initializer: 'initialize',
          }
        )
      ).to.revertedWith("Catalyst: royalty recipient can't be zero");
    });
    it("royalty can't be zero in initialization", async function () {
      const {
        trustedForwarder,
        catalystAdmin,
        catalystMinter,
        catalystRoyaltyRecipient,
        OperatorFilterSubscription,
      } = await runCatalystSetup();
      const CatalystFactory = await ethers.getContractFactory('Catalyst');

      await expect(
        upgrades.deployProxy(
          CatalystFactory,
          [
            CATALYST_BASE_URI,
            trustedForwarder.address,
            catalystRoyaltyRecipient.address,
            OperatorFilterSubscription.address,
            catalystAdmin.address,
            catalystMinter.address,
            0,
            CATALYST_IPFS_CID_PER_TIER,
          ],
          {
            initializer: 'initialize',
          }
        )
      ).to.revertedWith("Catalyst: royalty can't be zero");
    });
    it("minter can't be zero in initialization", async function () {
      const {
        trustedForwarder,
        catalystAdmin,
        catalystRoyaltyRecipient,
        OperatorFilterSubscription,
      } = await runCatalystSetup();
      const CatalystFactory = await ethers.getContractFactory('Catalyst');

      await expect(
        upgrades.deployProxy(
          CatalystFactory,
          [
            CATALYST_BASE_URI,
            trustedForwarder.address,
            catalystRoyaltyRecipient.address,
            OperatorFilterSubscription.address,
            catalystAdmin.address,
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
    it("token CID can't be zero in initialization", async function () {
      const {
        trustedForwarder,
        catalystAdmin,
        catalystMinter,
        catalystRoyaltyRecipient,
        OperatorFilterSubscription,
      } = await runCatalystSetup();
      const CatalystFactory = await ethers.getContractFactory('Catalyst');

      await expect(
        upgrades.deployProxy(
          CatalystFactory,
          [
            CATALYST_BASE_URI,
            trustedForwarder.address,
            catalystRoyaltyRecipient.address,
            OperatorFilterSubscription.address,
            catalystAdmin.address,
            catalystMinter.address,
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
  describe('Admin Role', function () {
    it('Admin can set minter', async function () {
      const {catalystAsAdmin, user1, minterRole} = await runCatalystSetup();
      await catalystAsAdmin.grantRole(minterRole, user1.address);
      expect(
        await catalystAsAdmin.hasRole(minterRole, user1.address)
      ).to.be.equal(true);
    });
    it('only Admin can set minter', async function () {
      const {catalyst, user1, minterRole, catalystAdminRole} =
        await runCatalystSetup();

      await expect(
        catalyst.connect(user1).grantRole(minterRole, user1.address)
      ).to.be.revertedWith(
        `AccessControl: account ${user1.address.toLocaleLowerCase()} is missing role ${catalystAdminRole}`
      );
    });
    it('Admin can remove minter', async function () {
      const {catalystAsAdmin, minterRole, catalystMinter} =
        await runCatalystSetup();
      expect(
        await catalystAsAdmin.hasRole(minterRole, catalystMinter.address)
      ).to.be.equal(true);
      await catalystAsAdmin.revokeRole(minterRole, catalystMinter.address);
      expect(
        await catalystAsAdmin.hasRole(minterRole, catalystMinter.address)
      ).to.be.equal(false);
    });
    it('only Admin can remove minter', async function () {
      const {catalyst, user1, minterRole, catalystAdminRole, catalystMinter} =
        await runCatalystSetup();

      await expect(
        catalyst
          .connect(user1) // TODO: this can just be .connect(user1). Review this whole file
          .revokeRole(minterRole, catalystMinter.address)
      ).to.be.revertedWith(
        `AccessControl: account ${user1.address.toLocaleLowerCase()} is missing role ${catalystAdminRole}`
      );
    });
    it('Admin can add new catalyst', async function () {
      const {catalystAsAdmin} = await runCatalystSetup();
      await catalystAsAdmin.addNewCatalystType(7, '0x01');
      expect(await catalystAsAdmin.uri(7)).to.be.equal('ipfs://0x01');
    });

    it('only Admin can add new catalyst', async function () {
      const {catalyst, user1, catalystAdminRole} = await runCatalystSetup();

      await expect(
        catalyst.connect(user1).addNewCatalystType(7, '0x01')
      ).to.be.revertedWith(
        `AccessControl: account ${user1.address.toLocaleLowerCase()} is missing role ${catalystAdminRole}`
      );
    });
    it('Admin can set trusted forwarder', async function () {
      const {catalystAsAdmin, user1} = await runCatalystSetup();
      await catalystAsAdmin.setTrustedForwarder(user1.address);
      expect(await catalystAsAdmin.getTrustedForwarder()).to.be.equal(
        user1.address
      );
    });
    it('only Admin can set trusted forwarder', async function () {
      const {catalyst, user1, catalystAdminRole} = await runCatalystSetup();

      await expect(
        catalyst.connect(user1).setTrustedForwarder(user1.address)
      ).to.be.revertedWith(
        `AccessControl: account ${user1.address.toLocaleLowerCase()} is missing role ${catalystAdminRole}`
      );
    });
    it('Admin can set metadata hash', async function () {
      const {catalystAsAdmin} = await runCatalystSetup();
      expect(await catalystAsAdmin.uri(1)).to.be.equal(
        `ipfs://${CATALYST_IPFS_CID_PER_TIER[0]}`
      );
      await catalystAsAdmin.setMetadataHash(1, '0x01');
      expect(await catalystAsAdmin.uri(1)).to.be.equal('ipfs://0x01');
    });
    it('only Admin can set metadata hash', async function () {
      const {catalyst, user1, catalystAdminRole} = await runCatalystSetup();

      await expect(
        catalyst.connect(user1).setMetadataHash(1, '0x01')
      ).to.be.revertedWith(
        `AccessControl: account ${user1.address.toLocaleLowerCase()} is missing role ${catalystAdminRole}`
      );
    });
    it('Admin can set base uri', async function () {
      const {catalystAsAdmin} = await runCatalystSetup();
      expect(await catalystAsAdmin.uri(1)).to.be.equal(
        `ipfs://${CATALYST_IPFS_CID_PER_TIER[0]}`
      );
      await catalystAsAdmin.setBaseURI('ipfs////');
      expect(await catalystAsAdmin.uri(1)).to.be.equal(
        `ipfs////${CATALYST_IPFS_CID_PER_TIER[0]}`
      );
    });
    it('empty base uri cant be set ', async function () {
      const {catalystAsAdmin} = await runCatalystSetup();
      await expect(catalystAsAdmin.setBaseURI('')).to.be.revertedWith(
        "Catalyst: base uri can't be empty"
      );
    });
    it('only Admin can set base uri', async function () {
      const {catalyst, user1, catalystAdminRole} = await runCatalystSetup();

      await expect(
        catalyst.connect(user1).setBaseURI('ipfs////')
      ).to.be.revertedWith(
        `AccessControl: account ${user1.address.toLocaleLowerCase()} is missing role ${catalystAdminRole}`
      );
    });
    it('Admin can set royalty recipient', async function () {
      const {catalystAsAdmin, user1} = await runCatalystSetup();
      await catalystAsAdmin.changeRoyaltyRecipient(user1.address, 0);
      const royaltyInfo = await catalystAsAdmin.royaltyInfo(1, 300000);
      expect(royaltyInfo[0]).to.be.equal(user1.address);
      expect(royaltyInfo[1]).to.be.equal(0);
    });
    it('only Admin can set royalty recipient', async function () {
      const {catalyst, user1, catalystAdminRole} = await runCatalystSetup();

      await expect(
        catalyst.connect(user1).changeRoyaltyRecipient(user1.address, 0)
      ).to.be.revertedWith(
        `AccessControl: account ${user1.address.toLocaleLowerCase()} is missing role ${catalystAdminRole}`
      );
    });
    it('cant add invalid token id', async function () {
      const {catalystAsAdmin} = await runCatalystSetup();
      await expect(
        catalystAsAdmin.addNewCatalystType(0, '0x01')
      ).to.be.revertedWith('Catalyst: invalid catalyst id');
    });

    // TODO: fix
    it('cant add invalid token uri', async function () {
      const {catalystAsAdmin} = await runCatalystSetup();
      await expect(
        catalystAsAdmin.addNewCatalystType(9, '')
      ).to.be.revertedWith("Catalyst: CID can't be empty");
    });
    it('cant set invalid trusted forwarder', async function () {
      const {catalystAsAdmin} = await runCatalystSetup();
      await expect(
        catalystAsAdmin.setTrustedForwarder(zeroAddress)
      ).to.be.revertedWith("Catalyst: trusted forwarder can't be zero address");
    });
    it('cant set metadata hash for invalid catalyst', async function () {
      const {catalystAsAdmin} = await runCatalystSetup();
      await expect(
        catalystAsAdmin.setMetadataHash(0, '0x01')
      ).to.be.revertedWith('Catalyst: invalid catalyst id');
    });
    it('cant set empty metadata hash', async function () {
      const {catalystAsAdmin} = await runCatalystSetup();
      await expect(catalystAsAdmin.setMetadataHash(1, '')).to.be.revertedWith(
        "Catalyst: metadataHash can't be empty"
      );
    });

    // TODO: fix
    it('cant set invalid base uri', async function () {
      const {catalystAsAdmin} = await runCatalystSetup();
      await expect(catalystAsAdmin.setBaseURI('')).to.be.revertedWith(
        "Catalyst: base uri can't be empty"
      );
    });
  });
  describe('Mint Token', function () {
    it('minter can mint', async function () {
      const {catalystAsMinter, user1} = await runCatalystSetup();
      await catalystAsMinter.mint(user1.address, 6, 2);
      expect(await catalystAsMinter.balanceOf(user1.address, 6)).to.be.equal(2);
    });
    it('Non minter cannot mint', async function () {
      const {catalyst, user2, user1, minterRole} = await runCatalystSetup();
      await expect(
        catalyst.connect(user1).mint(user2.address, 1, 1)
      ).to.be.revertedWith(
        `AccessControl: account ${user1.address.toLocaleLowerCase()} is missing role ${minterRole}`
      );
    });

    it('Cannot mint invalid catalyst Id', async function () {
      const {catalystAsMinter, user1} = await runCatalystSetup();
      await expect(
        catalystAsMinter.mint(user1.address, 7, 1)
      ).to.be.revertedWith('Catalyst: invalid catalyst id');
    });
    it('Minter can batch mint token', async function () {
      const {catalyst, user1, catalystAsMinter} = await runCatalystSetup();
      const catalystId = [];
      const catalystAmount = [];
      for (let i = 0; i < catalystArray.length; i++) {
        catalystId.push(catalystArray[i]);
        catalystAmount.push(catalystArray[i] * 2);
      }
      await catalystAsMinter.mintBatch(
        user1.address,
        catalystId,
        catalystAmount
      );
      for (let i = 0; i < catalystArray.length; i++) {
        expect(
          await catalyst.balanceOf(user1.address, catalystArray[i])
        ).to.be.equal(catalystArray[i] * 2);
      }
    });
    it('Minter can mint token', async function () {
      const {catalyst, user1, catalystAsMinter} = await runCatalystSetup();
      await catalystAsMinter.mint(user1.address, 1, 10);
      expect(await catalyst.balanceOf(user1.address, 1)).to.be.equal(10);
    });
  });
  describe('Total Supply', function () {
    it('Total Supply increase on minting', async function () {
      const {catalyst, user1, catalystAsMinter} = await runCatalystSetup();
      for (let i = 0; i < catalystArray.length; i++) {
        expect(await catalyst.totalSupply(catalystArray[i])).to.equal(0);
        await catalystAsMinter.mint(user1.address, catalystArray[i], 2);
        expect(await catalyst.totalSupply(catalystArray[i])).to.be.equal(2);
      }
    });
    it('Total Supply increase on batch minting', async function () {
      const {catalyst, user1, catalystAsMinter} = await runCatalystSetup();
      const catalystId = [];
      const catalystAmount = [];
      for (let i = 0; i < catalystArray.length; i++) {
        catalystId.push(catalystArray[i]);
        catalystAmount.push(catalystArray[i] * 2);
      }
      await catalystAsMinter.mintBatch(
        user1.address,
        catalystId,
        catalystAmount
      );
      for (let i = 0; i < catalystArray.length; i++) {
        expect(await catalyst.totalSupply(catalystArray[i])).to.equal(
          catalystArray[i] * 2
        );
      }
    });
    it('Total Supply decrease on burning', async function () {
      const {catalyst, user1, catalystAsBurner, catalystAsMinter} =
        await runCatalystSetup();
      const catalystAmount = [];
      for (let i = 0; i < catalystArray.length; i++) {
        expect(await catalyst.totalSupply(catalystArray[i])).to.be.equal(0);
        catalystAmount.push(catalystArray[i] * 2);
      }
      await catalystAsMinter.mintBatch(
        user1.address,
        catalystArray,
        catalystAmount
      );
      for (let i = 0; i < catalystArray.length; i++) {
        expect(await catalyst.totalSupply(catalystArray[i])).to.equal(
          catalystAmount[i]
        );

        await catalystAsBurner.burnFrom(user1.address, catalystArray[i], 2);
        expect(await catalyst.totalSupply(catalystArray[i])).to.be.equal(
          catalystArray[i] * 2 - 2
        );
      }
    });
    it('Total Supply decrease on batch burning', async function () {
      const {catalyst, user1, catalystAsMinter, catalystAsBurner} =
        await runCatalystSetup();
      for (let i = 0; i < catalystArray.length; i++) {
        expect(await catalyst.totalSupply(catalystArray[i])).to.equal(0);
      }
      const catalystId = [];
      let catalystAmount = [];
      for (let i = 0; i < catalystArray.length; i++) {
        catalystId.push(catalystArray[i]);
        catalystAmount.push(catalystArray[i] * 2);
      }
      await catalystAsMinter.mintBatch(
        user1.address,
        catalystId,
        catalystAmount
      );
      for (let i = 0; i < catalystArray.length; i++) {
        expect(await catalyst.totalSupply(catalystArray[i])).to.equal(
          catalystArray[i] * 2
        );
      }
      catalystAmount = [];

      for (let i = 0; i < catalystArray.length; i++) {
        catalystAmount.push(1);
      }

      await catalystAsBurner.burnBatchFrom(
        user1.address,
        catalystId,
        catalystAmount
      );
      for (let i = 0; i < catalystArray.length; i++) {
        expect(await catalyst.totalSupply(catalystArray[i])).to.equal(
          catalystArray[i] * 2 - 1
        );
      }
    });
  });
  describe('Burn catalyst', function () {
    it("minter can burn user's catalyst", async function () {
      const {catalyst, user1, catalystAsMinter, catalystAsBurner} =
        await runCatalystSetup();
      await catalystAsMinter.mint(user1.address, 1, 5);
      expect(await catalyst.balanceOf(user1.address, 1)).to.be.equal(5);
      await catalystAsBurner.burnFrom(user1.address, 1, 2);
      expect(await catalyst.balanceOf(user1.address, 1)).to.be.equal(3);
    });
    it("minter can batch burn user's catalyst", async function () {
      const {catalyst, user1, catalystAsMinter, catalystAsBurner} =
        await runCatalystSetup();
      await catalystAsMinter.mint(user1.address, 1, 5);
      await catalystAsMinter.mint(user1.address, 2, 6);

      expect(await catalyst.balanceOf(user1.address, 1)).to.be.equal(5);
      expect(await catalyst.balanceOf(user1.address, 2)).to.be.equal(6);
      const catalystId = [1, 2];
      const catalystAmount = [2, 2];
      await catalystAsBurner.burnBatchFrom(
        user1.address,
        catalystId,
        catalystAmount
      );
      expect(await catalyst.balanceOf(user1.address, 1)).to.be.equal(3);
      expect(await catalyst.balanceOf(user1.address, 2)).to.be.equal(4);
    });
    it('user can burn their catalyst', async function () {
      const {catalyst, user1, catalystAsMinter} = await runCatalystSetup();
      await catalystAsMinter.mint(user1.address, 1, 5);
      expect(await catalyst.balanceOf(user1.address, 1)).to.be.equal(5);
      await catalyst.connect(user1).burn(user1.address, 1, 2);
      expect(await catalyst.balanceOf(user1.address, 1)).to.be.equal(3);
    });
    it('user can batch burn their catalyst', async function () {
      const {catalyst, user1, catalystAsMinter} = await runCatalystSetup();
      await catalystAsMinter.mint(user1.address, 1, 5);
      await catalystAsMinter.mint(user1.address, 2, 6);

      expect(await catalyst.balanceOf(user1.address, 1)).to.be.equal(5);
      expect(await catalyst.balanceOf(user1.address, 2)).to.be.equal(6);
      const catalystId = [1, 2];
      const catalystAmount = [2, 2];
      await catalyst
        .connect(user1)
        .burnBatch(user1.address, catalystId, catalystAmount);
      expect(await catalyst.balanceOf(user1.address, 1)).to.be.equal(3);
      expect(await catalyst.balanceOf(user1.address, 2)).to.be.equal(4);
    });
  });
  describe('Metadata', function () {
    it("user can view token's metadata", async function () {
      const {catalyst} = await runCatalystSetup();
      for (let i = 0; i < catalystArray.length; i++) {
        expect(await catalyst.uri(catalystArray[i])).to.be.equal(
          `ipfs://${CATALYST_IPFS_CID_PER_TIER[i]}`
        );
      }
    });
  });

  describe('Token transfer and approval', function () {
    it('owner can approve operator', async function () {
      const {catalyst, user1, catalystAsMinter, user2} =
        await runCatalystSetup();
      await catalystAsMinter.mint(user1.address, 1, 10);
      expect(await catalyst.balanceOf(user1.address, 1)).to.be.equal(10);
      await catalyst.connect(user1).setApprovalForAll(user2.address, true);
      expect(
        await catalyst.isApprovedForAll(user1.address, user2.address)
      ).to.be.equal(true);
    });
    it('approved operator can transfer', async function () {
      const {catalyst, user1, catalystAsMinter, user2} =
        await runCatalystSetup();
      await catalystAsMinter.mint(user1.address, 1, 10);
      expect(await catalyst.balanceOf(user1.address, 1)).to.be.equal(10);
      await catalyst
        .connect(await ethers.provider.getSigner(user1.address))
        .setApprovalForAll(user2.address, true);
      expect(
        await catalyst.isApprovedForAll(user1.address, user2.address)
      ).to.be.equal(true);
      await catalyst
        .connect(await ethers.provider.getSigner(user1.address))
        .safeTransferFrom(user1.address, user2.address, 1, 10, zeroAddress);
      expect(await catalyst.balanceOf(user2.address, 1)).to.be.equal(10);
    });
    it('approved operator can batch transfer', async function () {
      const {catalyst, user1, catalystAsMinter, user2} =
        await runCatalystSetup();
      await catalystAsMinter.mint(user1.address, 1, 10);
      await catalystAsMinter.mint(user1.address, 2, 10);

      expect(await catalyst.balanceOf(user1.address, 1)).to.be.equal(10);
      expect(await catalyst.balanceOf(user1.address, 2)).to.be.equal(10);
      await catalyst
        .connect(await ethers.provider.getSigner(user1.address))
        .setApprovalForAll(user2.address, true);
      expect(
        await catalyst.isApprovedForAll(user1.address, user2.address)
      ).to.be.equal(true);
      await catalyst
        .connect(await ethers.provider.getSigner(user1.address))
        .safeBatchTransferFrom(
          user1.address,
          user2.address,
          [1, 2],
          [10, 10],
          zeroAddress
        );
      expect(await catalyst.balanceOf(user2.address, 1)).to.be.equal(10);
      expect(await catalyst.balanceOf(user2.address, 2)).to.be.equal(10);
    });
  });
});
