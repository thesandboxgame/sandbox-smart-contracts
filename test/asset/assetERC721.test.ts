import {ethers} from 'hardhat';
import {expect} from '../chai-setup';
import {solidityPack, AbiCoder} from 'ethers/lib/utils';
import {setupAssetERC721Test} from './fixtures';
import {setupOperatorFilter} from './fixtures';

describe('AssetERC721.sol', function () {
  describe('initialization', function () {
    it('creation', async function () {
      const fixtures = await setupAssetERC721Test();
      expect(await fixtures.assetERC721.name()).to.be.equal(fixtures.name);
      expect(await fixtures.assetERC721.symbol()).to.be.equal(fixtures.symbol);
    });

    it('interfaces', async function () {
      const fixtures = await setupAssetERC721Test();
      const interfaces = {
        IERC165: '0x01ffc9a7',
        IERC721: '0x80ac58cd',
        IERC721Metadata: '0x5b5e139f',
        IAccessControl: '0x7965db0b',
      };
      for (const i of Object.values(interfaces)) {
        expect(await fixtures.assetERC721.supportsInterface(i)).to.be.true;
      }
    });
  });
  describe('roles', function () {
    describe('admin', function () {
      it('admin role is set', async function () {
        const fixtures = await setupAssetERC721Test();
        const defaultAdminRole = await fixtures.assetERC721.DEFAULT_ADMIN_ROLE();
        expect(
          await fixtures.assetERC721.hasRole(
            defaultAdminRole,
            fixtures.adminRole
          )
        ).to.be.true;
      });
      it('admin can set the trusted forwarder', async function () {
        const fixtures = await setupAssetERC721Test();

        const assetERC721AsAdmin = await ethers.getContract(
          'AssetERC721',
          fixtures.adminRole
        );
        expect(await fixtures.assetERC721.getTrustedForwarder()).to.be.equal(
          fixtures.trustedForwarder
        );
        await assetERC721AsAdmin.setTrustedForwarder(fixtures.other);
        expect(await fixtures.assetERC721.getTrustedForwarder()).to.be.equal(
          fixtures.other
        );
      });
      it('other should fail to set the trusted forwarder', async function () {
        const fixtures = await setupAssetERC721Test();
        await expect(fixtures.assetERC721.setTrustedForwarder(fixtures.other))
          .to.be.reverted;
      });
    });
    describe('minter', function () {
      it('mint with metadata', async function () {
        const fixtures = await setupAssetERC721Test();

        const abiCoder = new AbiCoder();
        const uri = 'http://myMetadata.io/1';
        const metadata = abiCoder.encode(['string'], [uri]);

        const assetERC721AsMinter = await ethers.getContract(
          'AssetERC721',
          fixtures.minter
        );
        await expect(
          assetERC721AsMinter['mint(address,uint256,bytes)'](
            fixtures.other,
            123,
            metadata
          )
        ).to.be.reverted;
        await expect(
          fixtures.assetERC721['mint(address,uint256,bytes)'](
            fixtures.other,
            123,
            metadata
          )
        ).to.be.reverted;

        await fixtures.addMinter(
          fixtures.adminRole,
          fixtures.assetERC721,
          fixtures.minter
        );
        const minterRole = await fixtures.assetERC721.MINTER_ROLE();
        expect(await fixtures.assetERC721.hasRole(minterRole, fixtures.minter))
          .to.be.true;
        await expect(fixtures.assetERC721.ownerOf(123)).to.revertedWith(
          'ERC721: owner query for nonexistent token'
        );
        await assetERC721AsMinter['mint(address,uint256,bytes)'](
          fixtures.other,
          123,
          metadata
        );
        expect(await fixtures.assetERC721.ownerOf(123)).to.be.equal(
          fixtures.other
        );
        expect(await fixtures.assetERC721.exists(123)).to.be.true;
        await expect(
          assetERC721AsMinter['mint(address,uint256,bytes)'](
            fixtures.other,
            123,
            metadata
          )
        ).to.revertedWith('ERC721: token already minted');
        expect(await fixtures.assetERC721.tokenUris(123)).to.be.equal(uri);
      });
    });
    it('Can mint without metadata (although this is not the expected implementation)', async function () {
      const fixtures = await setupAssetERC721Test();
      const assetERC721AsMinter = await ethers.getContract(
        'AssetERC721',
        fixtures.minter
      );
      await expect(
        assetERC721AsMinter['mint(address,uint256)'](fixtures.other, 123)
      ).to.be.reverted;
      await expect(
        fixtures.assetERC721['mint(address,uint256)'](fixtures.other, 123)
      ).to.be.reverted;

      await fixtures.addMinter(
        fixtures.adminRole,
        fixtures.assetERC721,
        fixtures.minter
      );
      const minterRole = await fixtures.assetERC721.MINTER_ROLE();
      expect(await fixtures.assetERC721.hasRole(minterRole, fixtures.minter)).to
        .be.true;
      await expect(fixtures.assetERC721.ownerOf(123)).to.revertedWith(
        'ERC721: owner query for nonexistent token'
      );
      await assetERC721AsMinter['mint(address,uint256)'](fixtures.other, 123);
      expect(await fixtures.assetERC721.ownerOf(123)).to.be.equal(
        fixtures.other
      );
      expect(await fixtures.assetERC721.exists(123)).to.be.true;
      await expect(
        assetERC721AsMinter['mint(address,uint256)'](fixtures.other, 123)
      ).to.revertedWith('ERC721: token already minted');
    });
    it('metaTX trusted forwarder', async function () {
      const fixtures = await setupAssetERC721Test();
      await fixtures.addMinter(
        fixtures.adminRole,
        fixtures.assetERC721,
        fixtures.minter
      );
      // Regular transfer
      const assetERC721AsMinter = await ethers.getContract(
        'AssetERC721',
        fixtures.minter
      );
      await assetERC721AsMinter['mint(address,uint256)'](fixtures.other, 123);
      expect(await fixtures.assetERC721.ownerOf(123)).to.be.equal(
        fixtures.other
      );
      const assetERC721AsOther = await ethers.getContract(
        'AssetERC721',
        fixtures.other
      );
      await assetERC721AsOther.transferFrom(fixtures.other, fixtures.dest, 123);
      expect(await fixtures.assetERC721.ownerOf(123)).to.be.equal(
        fixtures.dest
      );

      // MetaTX transfer
      await assetERC721AsMinter['mint(address,uint256)'](fixtures.other, 124);
      expect(await fixtures.assetERC721.ownerOf(124)).to.be.equal(
        fixtures.other
      );
      const assetERC721AsTrustedForwarder = await ethers.getContract(
        'AssetERC721',
        fixtures.trustedForwarder
      );
      const txData = await assetERC721AsTrustedForwarder.populateTransaction.transferFrom(
        fixtures.other,
        fixtures.dest,
        124
      );
      // The msg.sender goes at the end.
      txData.data = solidityPack(
        ['bytes', 'address'],
        [txData.data, fixtures.other]
      );
      await assetERC721AsTrustedForwarder.signer.sendTransaction(txData);
      expect(await fixtures.assetERC721.ownerOf(124)).to.be.equal(
        fixtures.dest
      );
    });

    describe('AssetERC721: operator filterer', function () {
      it('should be registered', async function () {
        const {
          operatorFilterRegistry,
          assetERC721,
        } = await setupOperatorFilter();
        expect(
          await operatorFilterRegistry.isRegistered(assetERC721.address)
        ).to.be.equal(true);
      });

      it('should be subscribed to operator filterer subscription contract', async function () {
        const {
          operatorFilterRegistry,
          operatorFilterSubscription,
          assetERC721,
        } = await setupOperatorFilter();
        expect(
          await operatorFilterRegistry.subscriptionOf(assetERC721.address)
        ).to.be.equal(operatorFilterSubscription.address);
      });
      it('should have market places blacklisted', async function () {
        const {
          mockMarketPlace1,
          mockMarketPlace2,
          operatorFilterRegistry,
          assetERC721,
        } = await setupOperatorFilter();
        const mockMarketPlace1CodeHash = await operatorFilterRegistry.codeHashOf(
          mockMarketPlace1.address
        );
        expect(
          await operatorFilterRegistry.isOperatorFiltered(
            assetERC721.address,
            mockMarketPlace1.address
          )
        ).to.be.equal(true);

        expect(
          await operatorFilterRegistry.isCodeHashFiltered(
            assetERC721.address,
            mockMarketPlace1CodeHash
          )
        ).to.be.equal(true);

        const mockMarketPlace2CodeHash = await operatorFilterRegistry.codeHashOf(
          mockMarketPlace2.address
        );
        expect(
          await operatorFilterRegistry.isOperatorFiltered(
            assetERC721.address,
            mockMarketPlace2.address
          )
        ).to.be.equal(true);

        expect(
          await operatorFilterRegistry.isCodeHashFiltered(
            assetERC721.address,
            mockMarketPlace2CodeHash
          )
        ).to.be.equal(true);
      });

      it('should be able to transfer token if from is the owner of token', async function () {
        const {
          assetERC721,
          users,
          mintAssetERC721,
        } = await setupOperatorFilter();
        await mintAssetERC721(users[0].address, 1);

        await assetERC721['safeTransferFrom(address,address,uint256)'](
          users[0].address,
          users[1].address,
          1
        );

        expect(await assetERC721.balanceOf(users[1].address)).to.be.equal(1);
      });

      it('should be able to batch transfer token if from is the owner of token', async function () {
        const {
          assetERC721,
          users,
          mintAssetERC721,
        } = await setupOperatorFilter();
        await mintAssetERC721(users[0].address, 1);
        await mintAssetERC721(users[0].address, 2);

        await assetERC721[
          'safeBatchTransferFrom(address,address,uint256[],bytes)'
        ](users[0].address, users[1].address, [1, 2], '0x');

        expect(await assetERC721.balanceOf(users[1].address)).to.be.equal(2);
      });

      it('should be able to transfer token if from is the owner of token and to is a blacklisted marketplace', async function () {
        const {
          mockMarketPlace1,
          assetERC721,
          users,
          mintAssetERC721,
        } = await setupOperatorFilter();
        await mintAssetERC721(users[0].address, 1);
        await assetERC721['safeTransferFrom(address,address,uint256)'](
          users[0].address,
          mockMarketPlace1.address,
          1
        );

        expect(
          await assetERC721.balanceOf(mockMarketPlace1.address)
        ).to.be.equal(1);
      });

      it('should be able to batch transfer token if from is the owner of token and to is a blacklisted marketplace', async function () {
        const {
          mockMarketPlace1,
          assetERC721,
          users,
          mintAssetERC721,
        } = await setupOperatorFilter();
        await mintAssetERC721(users[0].address, 1);
        await mintAssetERC721(users[0].address, 2);

        await assetERC721[
          'safeBatchTransferFrom(address,address,uint256[],bytes)'
        ](users[0].address, mockMarketPlace1.address, [1, 2], '0x');

        expect(
          await assetERC721.balanceOf(mockMarketPlace1.address)
        ).to.be.equal(2);
      });

      it('it should not approve blacklisted market places', async function () {
        const {mockMarketPlace1, users} = await setupOperatorFilter();

        await expect(
          users[1].assetERC721.approveFor(
            users[1].address,
            mockMarketPlace1.address,
            1
          )
        ).to.be.revertedWith('Address is filtered');
      });

      it('it should approve non blacklisted market places', async function () {
        const {
          mockMarketPlace3,
          assetERC721,
          users,
          mintAssetERC721,
        } = await setupOperatorFilter();
        const {tokenId} = await mintAssetERC721(users[0].address, 1);

        await users[0].assetERC721.approveFor(
          users[0].address,
          mockMarketPlace3.address,
          tokenId
        );
        expect(await assetERC721.getApproved(tokenId)).to.be.equal(
          mockMarketPlace3.address
        );
      });

      it('it should not be able to approve non blacklisted market places after they are blacklisted ', async function () {
        const {
          mockMarketPlace3,
          operatorFilterRegistryAsOwner,
          operatorFilterSubscription,
          assetERC721,
          users,
          mintAssetERC721,
        } = await setupOperatorFilter();

        const {tokenId} = await mintAssetERC721(users[0].address, 1);

        await users[0].assetERC721.approveFor(
          users[0].address,
          mockMarketPlace3.address,
          tokenId
        );

        expect(await assetERC721.getApproved(tokenId)).to.be.equal(
          mockMarketPlace3.address
        );

        await operatorFilterRegistryAsOwner.updateOperator(
          operatorFilterSubscription.address,
          mockMarketPlace3.address,
          true
        );

        await expect(
          users[0].assetERC721.approveFor(
            users[0].address,
            mockMarketPlace3.address,
            2
          )
        ).to.be.revertedWith('Address is filtered');
      });

      it('it should not be able to approve non blacklisted market places after there codeHashes are blacklisted ', async function () {
        const {
          mockMarketPlace3,
          operatorFilterRegistryAsOwner,
          operatorFilterSubscription,
          assetERC721,
          users,
          mintAssetERC721,
        } = await setupOperatorFilter();
        const {tokenId} = await mintAssetERC721(users[0].address, 1);

        const mockMarketPlace3CodeHash = await operatorFilterRegistryAsOwner.codeHashOf(
          mockMarketPlace3.address
        );

        await users[0].assetERC721.approveFor(
          users[0].address,
          mockMarketPlace3.address,
          tokenId
        );

        expect(await assetERC721.getApproved(tokenId)).to.be.equal(
          mockMarketPlace3.address
        );

        await operatorFilterRegistryAsOwner.updateCodeHash(
          operatorFilterSubscription.address,
          mockMarketPlace3CodeHash,
          true
        );

        await expect(
          users[1].assetERC721.approveFor(
            users[0].address,
            mockMarketPlace3.address,
            2
          )
        ).to.be.revertedWith('Codehash is filtered');
      });

      it('it should be able to approve blacklisted market places after they are removed from the blacklist ', async function () {
        const {
          mockMarketPlace1,
          operatorFilterRegistryAsOwner,
          operatorFilterSubscription,
          assetERC721,
          mintAssetERC721,
          users,
        } = await setupOperatorFilter();

        const {tokenId} = await mintAssetERC721(users[0].address, 1);

        const mockMarketPlace1CodeHash = await operatorFilterRegistryAsOwner.codeHashOf(
          mockMarketPlace1.address
        );

        await expect(
          users[0].assetERC721.approveFor(
            users[0].address,
            mockMarketPlace1.address,
            tokenId
          )
        ).to.be.revertedWith('Address is filtered');

        await operatorFilterRegistryAsOwner.updateCodeHash(
          operatorFilterSubscription.address,
          mockMarketPlace1CodeHash,
          false
        );

        await operatorFilterRegistryAsOwner.updateOperator(
          operatorFilterSubscription.address,
          mockMarketPlace1.address,
          false
        );

        await users[0].assetERC721.approveFor(
          users[0].address,
          mockMarketPlace1.address,
          tokenId
        );

        expect(await assetERC721.getApproved(tokenId)).to.be.equal(
          mockMarketPlace1.address
        );
      });

      it('it should not approve for all for blacklisted market places', async function () {
        const {mockMarketPlace1, users} = await setupOperatorFilter();

        await expect(
          users[0].assetERC721.setApprovalForAllFor(
            users[0].address,
            mockMarketPlace1.address,
            true
          )
        ).to.be.reverted;
      });

      it('it should approve for all for non blacklisted market places', async function () {
        const {
          mockMarketPlace3,
          assetERC721,
          users,
        } = await setupOperatorFilter();
        await users[0].assetERC721.setApprovalForAllFor(
          users[0].address,
          mockMarketPlace3.address,
          true
        );
        expect(
          await assetERC721.isApprovedForAll(
            users[0].address,
            mockMarketPlace3.address
          )
        ).to.be.equal(true);
      });

      it('it should not be able to approve for all for non blacklisted market places after they are blacklisted ', async function () {
        const {
          mockMarketPlace3,
          operatorFilterRegistryAsOwner,
          operatorFilterSubscription,
          assetERC721,
          users,
        } = await setupOperatorFilter();

        await users[0].assetERC721.setApprovalForAllFor(
          users[0].address,
          mockMarketPlace3.address,
          true
        );

        expect(
          await assetERC721.isApprovedForAll(
            users[0].address,
            mockMarketPlace3.address
          )
        ).to.be.equal(true);

        await operatorFilterRegistryAsOwner.updateOperator(
          operatorFilterSubscription.address,
          mockMarketPlace3.address,
          true
        );

        await expect(
          users[1].assetERC721.setApprovalForAllFor(
            users[1].address,
            mockMarketPlace3.address,
            true
          )
        ).to.be.revertedWith('Address is filtered');
      });

      it('it should not be able to approve for all for non blacklisted market places after there codeHashes are blacklisted ', async function () {
        const {
          mockMarketPlace3,
          operatorFilterRegistryAsOwner,
          operatorFilterSubscription,
          assetERC721,
          users,
        } = await setupOperatorFilter();

        const mockMarketPlace3CodeHash = await operatorFilterRegistryAsOwner.codeHashOf(
          mockMarketPlace3.address
        );

        await users[0].assetERC721.setApprovalForAllFor(
          users[0].address,
          mockMarketPlace3.address,
          true
        );

        expect(
          await assetERC721.isApprovedForAll(
            users[0].address,
            mockMarketPlace3.address
          )
        ).to.be.equal(true);

        await operatorFilterRegistryAsOwner.updateCodeHash(
          operatorFilterSubscription.address,
          mockMarketPlace3CodeHash,
          true
        );

        await expect(
          users[1].assetERC721.setApprovalForAllFor(
            users[1].address,
            mockMarketPlace3.address,
            true
          )
        ).to.be.revertedWith('Codehash is filtered');
      });

      it('it should be able to approve for all for blacklisted market places after they are removed from the blacklist ', async function () {
        const {
          mockMarketPlace1,
          operatorFilterRegistryAsOwner,
          operatorFilterSubscription,
          assetERC721,
          users,
        } = await setupOperatorFilter();

        const mockMarketPlace1CodeHash = await operatorFilterRegistryAsOwner.codeHashOf(
          mockMarketPlace1.address
        );

        await expect(
          users[0].assetERC721.setApprovalForAllFor(
            users[0].address,
            mockMarketPlace1.address,
            true
          )
        ).to.be.revertedWith('Address is filtered');

        await operatorFilterRegistryAsOwner.updateCodeHash(
          operatorFilterSubscription.address,
          mockMarketPlace1CodeHash,
          false
        );

        await operatorFilterRegistryAsOwner.updateOperator(
          operatorFilterSubscription.address,
          mockMarketPlace1.address,
          false
        );

        await users[0].assetERC721.setApprovalForAllFor(
          users[0].address,
          mockMarketPlace1.address,
          true
        );

        expect(
          await assetERC721.isApprovedForAll(
            users[0].address,
            mockMarketPlace1.address
          )
        ).to.be.equal(true);
      });

      it('it should not be able to transfer through blacklisted market places', async function () {
        const {
          mockMarketPlace1,
          assetERC721,
          users,
          mintAssetERC721,
        } = await setupOperatorFilter();
        const {tokenId} = await mintAssetERC721(users[0].address, 1);

        await users[0].assetERC721.setApprovalForAllWithOutFilter(
          mockMarketPlace1.address,
          true
        );
        await expect(
          mockMarketPlace1.transferTokenERC721(
            assetERC721.address,
            users[0].address,
            users[1].address,
            tokenId
          )
        ).to.be.revertedWith('Address is filtered');
      });

      it('it should not be able to transfer through market places after they are blacklisted', async function () {
        const {
          mockMarketPlace3,
          assetERC721,
          users,
          operatorFilterRegistryAsOwner,
          operatorFilterSubscription,
          mintAssetERC721,
        } = await setupOperatorFilter();
        const {tokenId} = await mintAssetERC721(users[0].address, 1);

        await users[0].assetERC721.setApprovalForAllWithOutFilter(
          mockMarketPlace3.address,
          true
        );

        await mockMarketPlace3.transferTokenERC721(
          assetERC721.address,
          users[0].address,
          users[1].address,
          tokenId
        );

        expect(await assetERC721.balanceOf(users[1].address)).to.be.equal(1);

        await operatorFilterRegistryAsOwner.updateOperator(
          operatorFilterSubscription.address,
          mockMarketPlace3.address,
          true
        );

        await expect(
          mockMarketPlace3.transferTokenERC721(
            assetERC721.address,
            users[0].address,
            users[1].address,
            tokenId
          )
        ).to.be.revertedWith('Address is filtered');
      });

      it('it should be able to transfer through non blacklisted market places', async function () {
        const {
          mockMarketPlace3,
          assetERC721,
          users,
          mintAssetERC721,
        } = await setupOperatorFilter();
        const {tokenId} = await mintAssetERC721(users[0].address, 1);

        await users[0].assetERC721.setApprovalForAllWithOutFilter(
          mockMarketPlace3.address,
          true
        );
        await mockMarketPlace3.transferTokenERC721(
          assetERC721.address,
          users[0].address,
          users[1].address,
          tokenId
        );

        expect(await assetERC721.balanceOf(users[1].address)).to.be.equal(1);
      });

      it('it should not be able to transfer through non blacklisted market places after their codeHash is filtered', async function () {
        const {
          mockMarketPlace3,
          assetERC721,
          users,
          operatorFilterRegistryAsOwner,
          operatorFilterSubscription,
          mintAssetERC721,
        } = await setupOperatorFilter();
        const {tokenId} = await mintAssetERC721(users[0].address, 1);

        await users[0].assetERC721.setApprovalForAllWithOutFilter(
          mockMarketPlace3.address,
          true
        );

        await mockMarketPlace3.transferTokenERC721(
          assetERC721.address,
          users[0].address,
          users[1].address,
          tokenId
        );

        expect(await assetERC721.balanceOf(users[1].address)).to.be.equal(1);

        const mockMarketPlace3CodeHash = await operatorFilterRegistryAsOwner.codeHashOf(
          mockMarketPlace3.address
        );
        await operatorFilterRegistryAsOwner.updateCodeHash(
          operatorFilterSubscription.address,
          mockMarketPlace3CodeHash,
          true
        );
        await users[1].assetERC721.setApprovalForAllWithOutFilter(
          mockMarketPlace3.address,
          true
        );

        await expect(
          mockMarketPlace3.transferTokenERC721(
            assetERC721.address,
            users[1].address,
            users[0].address,
            tokenId
          )
        ).to.be.revertedWith('Codehash is filtered');
      });

      it('it should not be able to transfer through blacklisted market places after they are removed from blacklist', async function () {
        const {
          mockMarketPlace1,
          assetERC721,
          users,
          operatorFilterRegistryAsOwner,
          operatorFilterSubscription,
          mintAssetERC721,
        } = await setupOperatorFilter();
        const mockMarketPlace1CodeHash = await operatorFilterRegistryAsOwner.codeHashOf(
          mockMarketPlace1.address
        );
        const {tokenId} = await mintAssetERC721(users[0].address, 1);

        await users[0].assetERC721.setApprovalForAllWithOutFilter(
          mockMarketPlace1.address,
          true
        );

        await expect(
          mockMarketPlace1.transferTokenERC721(
            assetERC721.address,
            users[0].address,
            users[1].address,
            tokenId
          )
        ).to.be.revertedWith('Address is filtered');

        await operatorFilterRegistryAsOwner.updateCodeHash(
          operatorFilterSubscription.address,
          mockMarketPlace1CodeHash,
          false
        );

        await operatorFilterRegistryAsOwner.updateOperator(
          operatorFilterSubscription.address,
          mockMarketPlace1.address,
          false
        );

        await mockMarketPlace1.transferTokenERC721(
          assetERC721.address,
          users[0].address,
          users[1].address,
          tokenId
        );

        expect(await assetERC721.balanceOf(users[1].address)).to.be.equal(1);
      });

      it('it should not be able to batch transfer through blacklisted market places', async function () {
        const {
          mockMarketPlace1,
          assetERC721,
          users,
          mintAssetERC721,
        } = await setupOperatorFilter();
        const {tokenId: tokenId1} = await mintAssetERC721(users[0].address, 1);
        const {tokenId: tokenId2} = await mintAssetERC721(users[0].address, 2);

        await users[0].assetERC1155.setApprovalForAllWithOutFilter(
          mockMarketPlace1.address,
          true
        );
        await expect(
          mockMarketPlace1.batchTransferTokenERC721(
            assetERC721.address,
            users[0].address,
            users[1].address,
            [tokenId1, tokenId2],
            '0x'
          )
        ).to.be.revertedWith('Address is filtered');
      });

      it('it should be able to batch transfer through blacklisted market places', async function () {
        const {
          mockMarketPlace3,
          assetERC721,
          users,
          mintAssetERC721,
        } = await setupOperatorFilter();
        const {tokenId: tokenId1} = await mintAssetERC721(users[0].address, 1);
        const {tokenId: tokenId2} = await mintAssetERC721(users[0].address, 2);

        await users[0].assetERC721.setApprovalForAllWithOutFilter(
          mockMarketPlace3.address,
          true
        );

        await mockMarketPlace3.batchTransferTokenERC721(
          assetERC721.address,
          users[0].address,
          users[1].address,
          [tokenId1, tokenId2],
          '0x'
        );

        expect(await assetERC721.balanceOf(users[1].address)).to.be.equal(2);
      });

      it('it should be not be able to batch transfer through market places after they are blacklisted', async function () {
        const {
          mockMarketPlace3,
          assetERC721,
          users,
          operatorFilterRegistryAsOwner,
          operatorFilterSubscription,
          mintAssetERC721,
        } = await setupOperatorFilter();
        const {tokenId: tokenId1} = await mintAssetERC721(users[0].address, 1);
        const {tokenId: tokenId2} = await mintAssetERC721(users[0].address, 2);

        await users[0].assetERC721.setApprovalForAllWithOutFilter(
          mockMarketPlace3.address,
          true
        );

        await mockMarketPlace3.batchTransferTokenERC721(
          assetERC721.address,
          users[0].address,
          users[1].address,
          [tokenId1, tokenId2],
          '0x'
        );

        expect(await assetERC721.balanceOf(users[1].address)).to.be.equal(2);

        await users[1].assetERC721.setApprovalForAllWithOutFilter(
          mockMarketPlace3.address,
          true
        );

        await operatorFilterRegistryAsOwner.updateOperator(
          operatorFilterSubscription.address,
          mockMarketPlace3.address,
          true
        );

        await expect(
          mockMarketPlace3.batchTransferTokenERC721(
            assetERC721.address,
            users[1].address,
            users[0].address,
            [tokenId1, tokenId2],
            '0x'
          )
        ).to.be.revertedWith('Address is filtered');
      });

      it('it should be not be able to batch transfer through market places after their codeHash is filtered', async function () {
        const {
          mockMarketPlace3,
          assetERC721,
          users,
          operatorFilterRegistryAsOwner,
          operatorFilterSubscription,
          mintAssetERC721,
        } = await setupOperatorFilter();

        const {tokenId: tokenId1} = await mintAssetERC721(users[0].address, 1);
        const {tokenId: tokenId2} = await mintAssetERC721(users[0].address, 2);

        await users[0].assetERC721.setApprovalForAllWithOutFilter(
          mockMarketPlace3.address,
          true
        );

        await mockMarketPlace3.batchTransferTokenERC721(
          assetERC721.address,
          users[0].address,
          users[1].address,
          [tokenId1, tokenId2],
          '0x'
        );

        expect(await assetERC721.balanceOf(users[1].address)).to.be.equal(2);

        const mockMarketPlace3CodeHash = await operatorFilterRegistryAsOwner.codeHashOf(
          mockMarketPlace3.address
        );

        await operatorFilterRegistryAsOwner.updateCodeHash(
          operatorFilterSubscription.address,
          mockMarketPlace3CodeHash,
          true
        );

        await users[1].assetERC721.setApprovalForAllWithOutFilter(
          mockMarketPlace3.address,
          true
        );

        await expect(
          mockMarketPlace3.batchTransferTokenERC721(
            assetERC721.address,
            users[1].address,
            users[0].address,
            [tokenId1, tokenId2],
            '0x'
          )
        ).to.be.revertedWith('Codehash is filtered');
      });

      it('it should not be able to batch transfer through blacklisted market places after they are removed from blacklist', async function () {
        const {
          mockMarketPlace1,
          assetERC721,
          users,
          operatorFilterRegistryAsOwner,
          operatorFilterSubscription,
          mintAssetERC721,
        } = await setupOperatorFilter();
        const mockMarketPlace1CodeHash = await operatorFilterRegistryAsOwner.codeHashOf(
          mockMarketPlace1.address
        );
        const {tokenId: tokenId1} = await mintAssetERC721(users[0].address, 1);
        const {tokenId: tokenId2} = await mintAssetERC721(users[0].address, 2);
        await users[0].assetERC721.setApprovalForAllWithOutFilter(
          mockMarketPlace1.address,
          true
        );
        await expect(
          mockMarketPlace1.batchTransferTokenERC721(
            assetERC721.address,
            users[0].address,
            users[1].address,
            [tokenId1, tokenId2],
            '0x'
          )
        ).to.be.revertedWith('Address is filtered');

        await operatorFilterRegistryAsOwner.updateCodeHash(
          operatorFilterSubscription.address,
          mockMarketPlace1CodeHash,
          false
        );

        await operatorFilterRegistryAsOwner.updateOperator(
          operatorFilterSubscription.address,
          mockMarketPlace1.address,
          false
        );
        await users[1].assetERC721.setApprovalForAllWithOutFilter(
          mockMarketPlace1.address,
          true
        );
        await users[1].assetERC721.setApprovalForAllWithOutFilter(
          mockMarketPlace1.address,
          true
        );

        await mockMarketPlace1.batchTransferTokenERC721(
          assetERC721.address,
          users[0].address,
          users[1].address,
          [tokenId1, tokenId2],
          '0x'
        );

        expect(await assetERC721.balanceOf(users[1].address)).to.be.equal(2);
      });
    });
    // TODO:
    // Token exists
    // setTokenMetadata - METADATA_ROLE only
    // tokenURI

    // BaseERC721 tests:
    // Generic ERC721 test review
    // Extended functions
    // burnFrom
    // burn - check BURNER_ROLE only
  });
});
