import {expect} from 'chai';
import {setupOperatorFilter} from './fixtures/operatorFilterFixture';
import {ethers, upgrades} from 'hardhat';
import {runCatalystSetup} from './fixtures/catalyst/catalystFixture';
import {CATALYST_BASE_URI, CATALYST_IPFS_CID_PER_TIER} from '../data/constants';
const catalystArray = [1, 2, 3, 4, 5, 6];
const zeroAddress = '0x0000000000000000000000000000000000000000';

describe('Catalyst (/packages/asset/contracts/Catalyst.sol)', function () {
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
    describe('Interface support', function () {
      it('should support ERC2771', async function () {
        const {catalyst} = await runCatalystSetup();
        expect(await catalyst.supportsInterface('0x572b6c05')).to.be.true;
      });
      it('should support ERC2981Upgradeable', async function () {
        const {catalyst} = await runCatalystSetup();
        expect(await catalyst.supportsInterface('0x2a55205a')).to.be.true;
      });
    });
    it("base uri can't be empty in initialization", async function () {
      const {
        trustedForwarder,
        catalystAdmin,
        catalystMinter,
        OperatorFilterSubscriptionContract,
        RoyaltyManagerContract,
      } = await runCatalystSetup();
      const CatalystFactory = await ethers.getContractFactory('Catalyst');

      await expect(
        upgrades.deployProxy(
          CatalystFactory,
          [
            '',
            trustedForwarder.address,
            OperatorFilterSubscriptionContract.address,
            catalystAdmin.address, // DEFAULT_ADMIN_ROLE
            catalystMinter.address, // MINTER_ROLE
            CATALYST_IPFS_CID_PER_TIER,
            RoyaltyManagerContract.address,
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
        OperatorFilterSubscriptionContract,
        RoyaltyManagerContract,
      } = await runCatalystSetup();
      const CatalystFactory = await ethers.getContractFactory('Catalyst');

      await expect(
        upgrades.deployProxy(
          CatalystFactory,
          [
            CATALYST_BASE_URI,
            zeroAddress,
            OperatorFilterSubscriptionContract.address,
            catalystAdmin.address, // DEFAULT_ADMIN_ROLE
            catalystMinter.address, // MINTER_ROLE
            CATALYST_IPFS_CID_PER_TIER,
            RoyaltyManagerContract.address,
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
        RoyaltyManagerContract,
      } = await runCatalystSetup();
      const CatalystFactory = await ethers.getContractFactory('Catalyst');

      await expect(
        upgrades.deployProxy(
          CatalystFactory,
          [
            CATALYST_BASE_URI,
            trustedForwarder.address,
            zeroAddress,
            catalystAdmin.address, // DEFAULT_ADMIN_ROLE
            catalystMinter.address, // MINTER_ROLE
            CATALYST_IPFS_CID_PER_TIER,
            RoyaltyManagerContract.address,
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
        OperatorFilterSubscriptionContract,
        RoyaltyManagerContract,
      } = await runCatalystSetup();
      const CatalystFactory = await ethers.getContractFactory('Catalyst');

      await expect(
        upgrades.deployProxy(
          CatalystFactory,
          [
            CATALYST_BASE_URI,
            trustedForwarder.address,
            OperatorFilterSubscriptionContract.address,
            zeroAddress, // DEFAULT_ADMIN_ROLE
            catalystMinter.address, // MINTER_ROLE
            CATALYST_IPFS_CID_PER_TIER,
            RoyaltyManagerContract.address,
          ],
          {
            initializer: 'initialize',
          }
        )
      ).to.revertedWith("Catalyst: admin can't be zero");
    });
    it("royalty manager can't be zero in initialization", async function () {
      const {
        trustedForwarder,
        catalystAdmin,
        catalystMinter,
        OperatorFilterSubscriptionContract,
      } = await runCatalystSetup();
      const CatalystFactory = await ethers.getContractFactory('Catalyst');

      await expect(
        upgrades.deployProxy(
          CatalystFactory,
          [
            CATALYST_BASE_URI,
            trustedForwarder.address,
            OperatorFilterSubscriptionContract.address,
            catalystAdmin.address,
            catalystMinter.address,
            CATALYST_IPFS_CID_PER_TIER,
            zeroAddress,
          ],
          {
            initializer: 'initialize',
          }
        )
      ).to.revertedWith("Catalyst: royalty manager can't be zero");
    });
    it("minter can't be zero in initialization", async function () {
      const {
        trustedForwarder,
        catalystAdmin,
        OperatorFilterSubscriptionContract,
        RoyaltyManagerContract,
      } = await runCatalystSetup();
      const CatalystFactory = await ethers.getContractFactory('Catalyst');

      await expect(
        upgrades.deployProxy(
          CatalystFactory,
          [
            CATALYST_BASE_URI,
            trustedForwarder.address,
            OperatorFilterSubscriptionContract.address,
            catalystAdmin.address, // DEFAULT_ADMIN_ROLE
            zeroAddress, // MINTER_ROLE
            CATALYST_IPFS_CID_PER_TIER,
            RoyaltyManagerContract.address,
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
        OperatorFilterSubscriptionContract,
        RoyaltyManagerContract,
      } = await runCatalystSetup();
      const CatalystFactory = await ethers.getContractFactory('Catalyst');

      await expect(
        upgrades.deployProxy(
          CatalystFactory,
          [
            CATALYST_BASE_URI,
            trustedForwarder.address,
            OperatorFilterSubscriptionContract.address,
            catalystAdmin.address,
            catalystMinter.address,
            [''],
            RoyaltyManagerContract.address,
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
        catalyst.connect(user1).revokeRole(minterRole, catalystMinter.address)
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
    it('cant add invalid token id', async function () {
      const {catalystAsAdmin} = await runCatalystSetup();
      await expect(
        catalystAsAdmin.addNewCatalystType(0, '0x01')
      ).to.be.revertedWith('Catalyst: invalid catalyst id');
    });
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
  describe('OperatorFilterer', function () {
    describe('common subscription setup', function () {
      it('should be registered', async function () {
        const {operatorFilterRegistry, Catalyst} = await setupOperatorFilter();
        expect(
          await operatorFilterRegistry.isRegistered(Catalyst.address)
        ).to.be.equal(true);
      });

      it('should be subscribed to common subscription', async function () {
        const {operatorFilterRegistry, Catalyst, operatorFilterSubscription} =
          await setupOperatorFilter();
        expect(
          await operatorFilterRegistry.subscriptionOf(Catalyst.address)
        ).to.be.equal(operatorFilterSubscription.address);
      });

      it('default subscription should blacklist Mock Market places 1, 2 and not 3, 4', async function () {
        const {
          operatorFilterRegistry,
          mockMarketPlace1,
          mockMarketPlace2,
          mockMarketPlace3,
          mockMarketPlace4,
          DEFAULT_SUBSCRIPTION,
        } = await setupOperatorFilter();
        expect(
          await operatorFilterRegistry.isOperatorFiltered(
            DEFAULT_SUBSCRIPTION,
            mockMarketPlace1.address
          )
        ).to.be.equal(true);
        const MockERC1155MarketPlace1CodeHash =
          await operatorFilterRegistry.codeHashOf(mockMarketPlace1.address);
        expect(
          await operatorFilterRegistry.isCodeHashFiltered(
            DEFAULT_SUBSCRIPTION,
            MockERC1155MarketPlace1CodeHash
          )
        ).to.be.equal(true);

        expect(
          await operatorFilterRegistry.isOperatorFiltered(
            DEFAULT_SUBSCRIPTION,
            mockMarketPlace2.address
          )
        ).to.be.equal(true);

        const MockERC1155MarketPlace2CodeHash =
          await operatorFilterRegistry.codeHashOf(mockMarketPlace2.address);
        expect(
          await operatorFilterRegistry.isCodeHashFiltered(
            DEFAULT_SUBSCRIPTION,
            MockERC1155MarketPlace2CodeHash
          )
        ).to.be.equal(true);

        expect(
          await operatorFilterRegistry.isOperatorFiltered(
            DEFAULT_SUBSCRIPTION,
            mockMarketPlace3.address
          )
        ).to.be.equal(false);

        const MockERC1155MarketPlace3CodeHash =
          await operatorFilterRegistry.codeHashOf(mockMarketPlace3.address);
        expect(
          await operatorFilterRegistry.isCodeHashFiltered(
            DEFAULT_SUBSCRIPTION,
            MockERC1155MarketPlace3CodeHash
          )
        ).to.be.equal(false);

        expect(
          await operatorFilterRegistry.isOperatorFiltered(
            DEFAULT_SUBSCRIPTION,
            mockMarketPlace4.address
          )
        ).to.be.equal(false);

        const MockERC1155MarketPlace4CodeHash =
          await operatorFilterRegistry.codeHashOf(mockMarketPlace4.address);
        expect(
          await operatorFilterRegistry.isCodeHashFiltered(
            DEFAULT_SUBSCRIPTION,
            MockERC1155MarketPlace4CodeHash
          )
        ).to.be.equal(false);
      });

      it('common subscription should blacklist Mock Market places 1, 2 and not 3, 4 like default subscription', async function () {
        const {
          operatorFilterRegistry,
          mockMarketPlace1,
          mockMarketPlace2,
          mockMarketPlace3,
          mockMarketPlace4,
          operatorFilterSubscription,
        } = await setupOperatorFilter();
        expect(
          await operatorFilterRegistry.isOperatorFiltered(
            operatorFilterSubscription.address,
            mockMarketPlace1.address
          )
        ).to.be.equal(true);
        const MockERC1155MarketPlace1CodeHash =
          await operatorFilterRegistry.codeHashOf(mockMarketPlace1.address);
        expect(
          await operatorFilterRegistry.isCodeHashFiltered(
            operatorFilterSubscription.address,
            MockERC1155MarketPlace1CodeHash
          )
        ).to.be.equal(true);

        expect(
          await operatorFilterRegistry.isOperatorFiltered(
            operatorFilterSubscription.address,
            mockMarketPlace2.address
          )
        ).to.be.equal(true);

        const MockERC1155MarketPlace2CodeHash =
          await operatorFilterRegistry.codeHashOf(mockMarketPlace2.address);
        expect(
          await operatorFilterRegistry.isCodeHashFiltered(
            operatorFilterSubscription.address,
            MockERC1155MarketPlace2CodeHash
          )
        ).to.be.equal(true);

        expect(
          await operatorFilterRegistry.isOperatorFiltered(
            operatorFilterSubscription.address,
            mockMarketPlace3.address
          )
        ).to.be.equal(false);

        const MockERC1155MarketPlace3CodeHash =
          await operatorFilterRegistry.codeHashOf(mockMarketPlace3.address);
        expect(
          await operatorFilterRegistry.isCodeHashFiltered(
            operatorFilterSubscription.address,
            MockERC1155MarketPlace3CodeHash
          )
        ).to.be.equal(false);

        expect(
          await operatorFilterRegistry.isOperatorFiltered(
            operatorFilterSubscription.address,
            mockMarketPlace4.address
          )
        ).to.be.equal(false);

        const MockERC1155MarketPlace4CodeHash =
          await operatorFilterRegistry.codeHashOf(mockMarketPlace4.address);
        expect(
          await operatorFilterRegistry.isCodeHashFiltered(
            operatorFilterSubscription.address,
            MockERC1155MarketPlace4CodeHash
          )
        ).to.be.equal(false);
      });

      it('Catalyst should blacklist Mock Market places 1, 2 and not 3, 4 like default subscription', async function () {
        const {
          operatorFilterRegistry,
          mockMarketPlace1,
          mockMarketPlace2,
          mockMarketPlace3,
          mockMarketPlace4,
          Catalyst,
        } = await setupOperatorFilter();
        expect(
          await operatorFilterRegistry.isOperatorFiltered(
            Catalyst.address,
            mockMarketPlace1.address
          )
        ).to.be.equal(true);
        const MockERC1155MarketPlace1CodeHash =
          await operatorFilterRegistry.codeHashOf(mockMarketPlace1.address);
        expect(
          await operatorFilterRegistry.isCodeHashFiltered(
            Catalyst.address,
            MockERC1155MarketPlace1CodeHash
          )
        ).to.be.equal(true);

        expect(
          await operatorFilterRegistry.isOperatorFiltered(
            Catalyst.address,
            mockMarketPlace2.address
          )
        ).to.be.equal(true);

        const MockERC1155MarketPlace2CodeHash =
          await operatorFilterRegistry.codeHashOf(mockMarketPlace2.address);
        expect(
          await operatorFilterRegistry.isCodeHashFiltered(
            Catalyst.address,
            MockERC1155MarketPlace2CodeHash
          )
        ).to.be.equal(true);

        expect(
          await operatorFilterRegistry.isOperatorFiltered(
            Catalyst.address,
            mockMarketPlace3.address
          )
        ).to.be.equal(false);

        const MockERC1155MarketPlace3CodeHash =
          await operatorFilterRegistry.codeHashOf(mockMarketPlace3.address);
        expect(
          await operatorFilterRegistry.isCodeHashFiltered(
            Catalyst.address,
            MockERC1155MarketPlace3CodeHash
          )
        ).to.be.equal(false);

        expect(
          await operatorFilterRegistry.isOperatorFiltered(
            Catalyst.address,
            mockMarketPlace4.address
          )
        ).to.be.equal(false);

        const MockERC1155MarketPlace4CodeHash =
          await operatorFilterRegistry.codeHashOf(mockMarketPlace4.address);
        expect(
          await operatorFilterRegistry.isCodeHashFiltered(
            Catalyst.address,
            MockERC1155MarketPlace4CodeHash
          )
        ).to.be.equal(false);
      });

      it("removing market places from common subscription's blacklist should reflect on Catalyst's blacklist", async function () {
        const {
          operatorFilterRegistry,
          mockMarketPlace1,
          operatorFilterRegistryAsDeployer,
          operatorFilterSubscription,
          Catalyst,
        } = await setupOperatorFilter();
        expect(
          await operatorFilterRegistry.isOperatorFiltered(
            Catalyst.address,
            mockMarketPlace1.address
          )
        ).to.be.equal(true);
        const MockERC1155MarketPlace1CodeHash =
          await operatorFilterRegistry.codeHashOf(mockMarketPlace1.address);
        expect(
          await operatorFilterRegistry.isCodeHashFiltered(
            Catalyst.address,
            MockERC1155MarketPlace1CodeHash
          )
        ).to.be.equal(true);

        expect(
          await operatorFilterRegistry.isOperatorFiltered(
            operatorFilterSubscription.address,
            mockMarketPlace1.address
          )
        ).to.be.equal(true);

        expect(
          await operatorFilterRegistry.isCodeHashFiltered(
            operatorFilterSubscription.address,
            MockERC1155MarketPlace1CodeHash
          )
        ).to.be.equal(true);

        await operatorFilterRegistryAsDeployer.updateOperator(
          operatorFilterSubscription.address,
          mockMarketPlace1.address,
          false
        );

        await operatorFilterRegistryAsDeployer.updateCodeHash(
          operatorFilterSubscription.address,
          MockERC1155MarketPlace1CodeHash,
          false
        );

        expect(
          await operatorFilterRegistry.isOperatorFiltered(
            Catalyst.address,
            mockMarketPlace1.address
          )
        ).to.be.equal(false);

        expect(
          await operatorFilterRegistry.isCodeHashFiltered(
            Catalyst.address,
            MockERC1155MarketPlace1CodeHash
          )
        ).to.be.equal(false);

        expect(
          await operatorFilterRegistry.isOperatorFiltered(
            operatorFilterSubscription.address,
            mockMarketPlace1.address
          )
        ).to.be.equal(false);

        expect(
          await operatorFilterRegistry.isCodeHashFiltered(
            operatorFilterSubscription.address,
            MockERC1155MarketPlace1CodeHash
          )
        ).to.be.equal(false);
      });

      it("adding market places to common subscription's blacklist should reflect on Catalyst's blacklist", async function () {
        const {
          operatorFilterRegistry,
          mockMarketPlace3,
          operatorFilterRegistryAsDeployer,
          operatorFilterSubscription,
          Catalyst,
        } = await setupOperatorFilter();
        expect(
          await operatorFilterRegistry.isOperatorFiltered(
            Catalyst.address,
            mockMarketPlace3.address
          )
        ).to.be.equal(false);
        const MockERC1155MarketPlace3CodeHash =
          await operatorFilterRegistry.codeHashOf(mockMarketPlace3.address);
        expect(
          await operatorFilterRegistry.isCodeHashFiltered(
            Catalyst.address,
            MockERC1155MarketPlace3CodeHash
          )
        ).to.be.equal(false);

        expect(
          await operatorFilterRegistry.isOperatorFiltered(
            operatorFilterSubscription.address,
            mockMarketPlace3.address
          )
        ).to.be.equal(false);

        expect(
          await operatorFilterRegistry.isCodeHashFiltered(
            operatorFilterSubscription.address,
            MockERC1155MarketPlace3CodeHash
          )
        ).to.be.equal(false);

        await operatorFilterRegistryAsDeployer.updateOperator(
          operatorFilterSubscription.address,
          mockMarketPlace3.address,
          true
        );

        await operatorFilterRegistryAsDeployer.updateCodeHash(
          operatorFilterSubscription.address,
          MockERC1155MarketPlace3CodeHash,
          true
        );

        expect(
          await operatorFilterRegistry.isOperatorFiltered(
            Catalyst.address,
            mockMarketPlace3.address
          )
        ).to.be.equal(true);

        expect(
          await operatorFilterRegistry.isCodeHashFiltered(
            Catalyst.address,
            MockERC1155MarketPlace3CodeHash
          )
        ).to.be.equal(true);

        expect(
          await operatorFilterRegistry.isOperatorFiltered(
            operatorFilterSubscription.address,
            mockMarketPlace3.address
          )
        ).to.be.equal(true);

        expect(
          await operatorFilterRegistry.isCodeHashFiltered(
            operatorFilterSubscription.address,
            MockERC1155MarketPlace3CodeHash
          )
        ).to.be.equal(true);
      });
    });

    describe('Catalyst transfer and approval ', function () {
      it('should be able to safe transfer Catalyst if from is the owner of token', async function () {
        const {Catalyst, users} = await setupOperatorFilter();
        await Catalyst.mintWithoutMinterRole(users[0].address, 1, 1);

        await users[0].Catalyst.safeTransferFrom(
          users[0].address,
          users[1].address,
          1,
          1,
          '0x'
        );

        expect(await Catalyst.balanceOf(users[1].address, 1)).to.be.equal(1);
      });

      it('should be able to safe batch transfer Catalyst if from is the owner of token', async function () {
        const {Catalyst, users} = await setupOperatorFilter();
        await Catalyst.mintWithoutMinterRole(users[0].address, 1, 1);
        await Catalyst.mintWithoutMinterRole(users[0].address, 2, 1);

        await users[0].Catalyst.safeBatchTransferFrom(
          users[0].address,
          users[1].address,
          [1, 2],
          [1, 1],
          '0x'
        );

        expect(await Catalyst.balanceOf(users[1].address, 1)).to.be.equal(1);
        expect(await Catalyst.balanceOf(users[1].address, 2)).to.be.equal(1);
      });

      it('should be able to safe transfer Catalyst if from is the owner of Catalyst and to is a blacklisted marketplace', async function () {
        const {mockMarketPlace1, Catalyst, users} = await setupOperatorFilter();
        await Catalyst.mintWithoutMinterRole(users[0].address, 1, 1);

        await users[0].Catalyst.safeTransferFrom(
          users[0].address,
          mockMarketPlace1.address,
          1,
          1,
          '0x'
        );

        expect(
          await Catalyst.balanceOf(mockMarketPlace1.address, 1)
        ).to.be.equal(1);
      });

      it('should be able to safe batch transfer Catalysts if from is the owner of Catalysts and to is a blacklisted marketplace', async function () {
        const {mockMarketPlace1, Catalyst, users} = await setupOperatorFilter();
        await Catalyst.mintWithoutMinterRole(users[0].address, 1, 1);
        await Catalyst.mintWithoutMinterRole(users[0].address, 2, 1);

        await users[0].Catalyst.safeBatchTransferFrom(
          users[0].address,
          mockMarketPlace1.address,
          [1, 2],
          [1, 1],
          '0x'
        );

        expect(
          await Catalyst.balanceOf(mockMarketPlace1.address, 1)
        ).to.be.equal(1);
        expect(
          await Catalyst.balanceOf(mockMarketPlace1.address, 2)
        ).to.be.equal(1);
      });

      it('it should not setApprovalForAll blacklisted market places', async function () {
        const {mockMarketPlace1, users} = await setupOperatorFilter();
        await expect(
          users[0].Catalyst.setApprovalForAll(mockMarketPlace1.address, true)
        ).to.be.reverted;
      });

      it('it should setApprovalForAll non blacklisted market places', async function () {
        const {mockMarketPlace3, Catalyst, users} = await setupOperatorFilter();
        await users[0].Catalyst.setApprovalForAll(
          mockMarketPlace3.address,
          true
        );
        expect(
          await Catalyst.isApprovedForAll(
            users[0].address,
            mockMarketPlace3.address
          )
        ).to.be.equal(true);
      });

      it('it should not be able to setApprovalForAll non blacklisted market places after they are blacklisted ', async function () {
        const {
          mockMarketPlace3,
          operatorFilterRegistryAsDeployer,
          operatorFilterSubscription,
          Catalyst,
          users,
        } = await setupOperatorFilter();
        await users[0].Catalyst.setApprovalForAll(
          mockMarketPlace3.address,
          true
        );

        expect(
          await Catalyst.isApprovedForAll(
            users[0].address,
            mockMarketPlace3.address
          )
        ).to.be.equal(true);

        await operatorFilterRegistryAsDeployer.updateOperator(
          operatorFilterSubscription.address,
          mockMarketPlace3.address,
          true
        );

        await expect(
          users[1].Catalyst.setApprovalForAll(mockMarketPlace3.address, true)
        ).to.be.revertedWithCustomError;
      });

      it('it should not be able to setApprovalForAll non blacklisted market places after there codeHashes are blacklisted ', async function () {
        const {
          mockMarketPlace3,
          operatorFilterRegistryAsDeployer,
          operatorFilterSubscription,
          Catalyst,
          users,
        } = await setupOperatorFilter();

        const mockMarketPlace3CodeHash =
          await operatorFilterRegistryAsDeployer.codeHashOf(
            mockMarketPlace3.address
          );

        await users[0].Catalyst.setApprovalForAll(
          mockMarketPlace3.address,
          true
        );

        expect(
          await Catalyst.isApprovedForAll(
            users[0].address,
            mockMarketPlace3.address
          )
        ).to.be.equal(true);

        await operatorFilterRegistryAsDeployer.updateCodeHash(
          operatorFilterSubscription.address,
          mockMarketPlace3CodeHash,
          true
        );

        await expect(
          users[1].Catalyst.setApprovalForAll(mockMarketPlace3.address, true)
        ).to.be.revertedWith;
      });

      it('it should be able to setApprovalForAll blacklisted market places after they are removed from the blacklist ', async function () {
        const {
          mockMarketPlace1,
          operatorFilterRegistryAsDeployer,
          operatorFilterSubscription,
          Catalyst,
          users,
        } = await setupOperatorFilter();

        const mockMarketPlace1CodeHash =
          await operatorFilterRegistryAsDeployer.codeHashOf(
            mockMarketPlace1.address
          );

        await expect(
          users[0].Catalyst.setApprovalForAll(mockMarketPlace1.address, true)
        ).to.be.revertedWithCustomError;

        await operatorFilterRegistryAsDeployer.updateCodeHash(
          operatorFilterSubscription.address,
          mockMarketPlace1CodeHash,
          false
        );

        await operatorFilterRegistryAsDeployer.updateOperator(
          operatorFilterSubscription.address,
          mockMarketPlace1.address,
          false
        );

        await users[0].Catalyst.setApprovalForAll(
          mockMarketPlace1.address,
          true
        );

        expect(
          await Catalyst.isApprovedForAll(
            users[0].address,
            mockMarketPlace1.address
          )
        ).to.be.equal(true);
      });

      it('it should not be able to transfer through blacklisted market places', async function () {
        const {mockMarketPlace1, Catalyst, users} = await setupOperatorFilter();
        await Catalyst.mintWithoutMinterRole(users[0].address, 1, 1);

        await users[0].Catalyst.setApprovalForAllWithoutFilter(
          mockMarketPlace1.address,
          true
        );
        await expect(
          mockMarketPlace1.transferTokenForERC1155(
            Catalyst.address,
            users[0].address,
            users[1].address,
            1,
            1,
            '0x'
          )
        ).to.be.revertedWithCustomError;
      });

      it('it should not be able to transfer through market places after they are blacklisted', async function () {
        const {
          mockMarketPlace3,
          Catalyst,
          users,
          operatorFilterRegistryAsDeployer,
          operatorFilterSubscription,
        } = await setupOperatorFilter();
        await Catalyst.mintWithoutMinterRole(users[0].address, 1, 2);

        await users[0].Catalyst.setApprovalForAllWithoutFilter(
          mockMarketPlace3.address,
          true
        );

        await mockMarketPlace3.transferTokenForERC1155(
          Catalyst.address,
          users[0].address,
          users[1].address,
          1,
          1,
          '0x'
        );

        expect(await Catalyst.balanceOf(users[1].address, 1)).to.be.equal(1);

        await operatorFilterRegistryAsDeployer.updateOperator(
          operatorFilterSubscription.address,
          mockMarketPlace3.address,
          true
        );

        await expect(
          mockMarketPlace3.transferTokenForERC1155(
            Catalyst.address,
            users[0].address,
            users[1].address,
            1,
            1,
            '0x'
          )
        ).to.be.revertedWithCustomError;
      });

      it('it should be able to transfer through non blacklisted market places', async function () {
        const {mockMarketPlace3, Catalyst, users} = await setupOperatorFilter();
        await Catalyst.mintWithoutMinterRole(users[0].address, 1, 1);

        await users[0].Catalyst.setApprovalForAllWithoutFilter(
          mockMarketPlace3.address,
          true
        );
        await mockMarketPlace3.transferTokenForERC1155(
          Catalyst.address,
          users[0].address,
          users[1].address,
          1,
          1,
          '0x'
        );

        expect(await Catalyst.balanceOf(users[1].address, 1)).to.be.equal(1);
      });

      it('it should not be able to transfer through non blacklisted market places after their codeHash is blacklisted', async function () {
        const {
          mockMarketPlace3,
          Catalyst,
          users,
          operatorFilterRegistryAsDeployer,
          operatorFilterSubscription,
        } = await setupOperatorFilter();
        await Catalyst.mintWithoutMinterRole(users[0].address, 1, 2);

        await users[0].Catalyst.setApprovalForAllWithoutFilter(
          mockMarketPlace3.address,
          true
        );
        await mockMarketPlace3.transferTokenForERC1155(
          Catalyst.address,
          users[0].address,
          users[1].address,
          1,
          1,
          '0x'
        );

        expect(await Catalyst.balanceOf(users[1].address, 1)).to.be.equal(1);

        const mockMarketPlace3CodeHash =
          await operatorFilterRegistryAsDeployer.codeHashOf(
            mockMarketPlace3.address
          );
        await operatorFilterRegistryAsDeployer.updateCodeHash(
          operatorFilterSubscription.address,
          mockMarketPlace3CodeHash,
          true
        );

        await expect(
          mockMarketPlace3.transferTokenForERC1155(
            Catalyst.address,
            users[0].address,
            users[1].address,
            1,
            1,
            '0x'
          )
        ).to.be.revertedWithCustomError;
      });

      it('it should be able to transfer through blacklisted market places after they are removed from blacklist', async function () {
        const {
          mockMarketPlace1,
          Catalyst,
          users,
          operatorFilterRegistryAsDeployer,
          operatorFilterSubscription,
        } = await setupOperatorFilter();
        const mockMarketPlace1CodeHash =
          await operatorFilterRegistryAsDeployer.codeHashOf(
            mockMarketPlace1.address
          );
        await Catalyst.mintWithoutMinterRole(users[0].address, 1, 1);

        await users[0].Catalyst.setApprovalForAllWithoutFilter(
          mockMarketPlace1.address,
          true
        );

        await expect(
          mockMarketPlace1.transferTokenForERC1155(
            Catalyst.address,
            users[0].address,
            users[1].address,
            1,
            1,
            '0x'
          )
        ).to.be.revertedWithCustomError;

        await operatorFilterRegistryAsDeployer.updateCodeHash(
          operatorFilterSubscription.address,
          mockMarketPlace1CodeHash,
          false
        );

        await operatorFilterRegistryAsDeployer.updateOperator(
          operatorFilterSubscription.address,
          mockMarketPlace1.address,
          false
        );
        await mockMarketPlace1.transferTokenForERC1155(
          Catalyst.address,
          users[0].address,
          users[1].address,
          1,
          1,
          '0x'
        );

        expect(await Catalyst.balanceOf(users[1].address, 1)).to.be.equal(1);
      });

      it('it should not be able to batch transfer through blacklisted market places', async function () {
        const {mockMarketPlace1, Catalyst, users} = await setupOperatorFilter();
        await Catalyst.mintWithoutMinterRole(users[0].address, 1, 1);
        await Catalyst.mintWithoutMinterRole(users[0].address, 2, 1);

        await users[0].Catalyst.setApprovalForAllWithoutFilter(
          mockMarketPlace1.address,
          true
        );
        await expect(
          mockMarketPlace1.batchTransferTokenERC1155(
            Catalyst.address,
            users[0].address,
            users[1].address,
            [1, 2],
            [1, 1],
            '0x'
          )
        ).to.be.revertedWithCustomError;
      });

      it('it should not be able to batch transfer through market places after they are blacklisted', async function () {
        const {
          mockMarketPlace3,
          Catalyst,
          users,
          operatorFilterRegistryAsDeployer,
          operatorFilterSubscription,
        } = await setupOperatorFilter();
        await Catalyst.mintWithoutMinterRole(users[0].address, 1, 2);
        await Catalyst.mintWithoutMinterRole(users[0].address, 2, 2);

        await users[0].Catalyst.setApprovalForAllWithoutFilter(
          mockMarketPlace3.address,
          true
        );

        await mockMarketPlace3.batchTransferTokenERC1155(
          Catalyst.address,
          users[0].address,
          users[1].address,
          [1, 2],
          [1, 1],
          '0x'
        );

        expect(await Catalyst.balanceOf(users[1].address, 1)).to.be.equal(1);

        expect(await Catalyst.balanceOf(users[1].address, 2)).to.be.equal(1);

        await operatorFilterRegistryAsDeployer.updateOperator(
          operatorFilterSubscription.address,
          mockMarketPlace3.address,
          true
        );

        await expect(
          mockMarketPlace3.batchTransferTokenERC1155(
            Catalyst.address,
            users[0].address,
            users[1].address,
            [1, 2],
            [1, 1],
            '0x'
          )
        ).to.be.revertedWithCustomError;
      });

      it('it should be able to batch transfer through non blacklisted market places', async function () {
        const {mockMarketPlace3, Catalyst, users} = await setupOperatorFilter();
        await Catalyst.mintWithoutMinterRole(users[0].address, 1, 1);
        await Catalyst.mintWithoutMinterRole(users[0].address, 2, 1);

        await users[0].Catalyst.setApprovalForAllWithoutFilter(
          mockMarketPlace3.address,
          true
        );
        await mockMarketPlace3.batchTransferTokenERC1155(
          Catalyst.address,
          users[0].address,
          users[1].address,
          [1, 2],
          [1, 1],
          '0x'
        );

        expect(await Catalyst.balanceOf(users[1].address, 1)).to.be.equal(1);
        expect(await Catalyst.balanceOf(users[1].address, 2)).to.be.equal(1);
      });

      it('it should not be able to batch transfer through non blacklisted market places after their codeHash is blacklisted', async function () {
        const {
          mockMarketPlace3,
          Catalyst,
          users,
          operatorFilterRegistryAsDeployer,
          operatorFilterSubscription,
        } = await setupOperatorFilter();
        await Catalyst.mintWithoutMinterRole(users[0].address, 1, 2);
        await Catalyst.mintWithoutMinterRole(users[0].address, 2, 2);

        await users[0].Catalyst.setApprovalForAllWithoutFilter(
          mockMarketPlace3.address,
          true
        );
        await mockMarketPlace3.batchTransferTokenERC1155(
          Catalyst.address,
          users[0].address,
          users[1].address,
          [1, 2],
          [1, 1],
          '0x'
        );

        expect(await Catalyst.balanceOf(users[1].address, 1)).to.be.equal(1);
        expect(await Catalyst.balanceOf(users[1].address, 2)).to.be.equal(1);

        const mockMarketPlace3CodeHash =
          await operatorFilterRegistryAsDeployer.codeHashOf(
            mockMarketPlace3.address
          );
        await operatorFilterRegistryAsDeployer.updateCodeHash(
          operatorFilterSubscription.address,
          mockMarketPlace3CodeHash,
          true
        );

        await expect(
          mockMarketPlace3.batchTransferTokenERC1155(
            Catalyst.address,
            users[0].address,
            users[1].address,
            [1, 2],
            [1, 1],
            '0x'
          )
        ).to.be.revertedWithCustomError;
      });

      it('it should be able to batch transfer through blacklisted market places after they are removed from blacklist', async function () {
        const {
          mockMarketPlace1,
          Catalyst,
          users,
          operatorFilterRegistryAsDeployer,
          operatorFilterSubscription,
        } = await setupOperatorFilter();
        const mockMarketPlace1CodeHash =
          await operatorFilterRegistryAsDeployer.codeHashOf(
            mockMarketPlace1.address
          );
        await Catalyst.mintWithoutMinterRole(users[0].address, 1, 1);
        await Catalyst.mintWithoutMinterRole(users[0].address, 2, 1);

        await users[0].Catalyst.setApprovalForAllWithoutFilter(
          mockMarketPlace1.address,
          true
        );

        await expect(
          mockMarketPlace1.batchTransferTokenERC1155(
            Catalyst.address,
            users[0].address,
            users[1].address,
            [1, 2],
            [1, 1],
            '0x'
          )
        ).to.be.revertedWithCustomError;

        await operatorFilterRegistryAsDeployer.updateCodeHash(
          operatorFilterSubscription.address,
          mockMarketPlace1CodeHash,
          false
        );

        await operatorFilterRegistryAsDeployer.updateOperator(
          operatorFilterSubscription.address,
          mockMarketPlace1.address,
          false
        );
        await mockMarketPlace1.batchTransferTokenERC1155(
          Catalyst.address,
          users[0].address,
          users[1].address,
          [1, 2],
          [1, 1],
          '0x'
        );

        expect(await Catalyst.balanceOf(users[1].address, 1)).to.be.equal(1);
        expect(await Catalyst.balanceOf(users[1].address, 2)).to.be.equal(1);
      });
    });
  });
});
