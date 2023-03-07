import {expect} from '../../chai-setup';
import {setupAssetERC721Test, setupOperatorFilter} from './fixtures';
import {BigNumber} from 'ethers';
describe('PolygonAssetERC721.sol differences with AssetERC721.sol', function () {
  describe('roles', function () {
    describe('admin', function () {
      it('admin role is set', async function () {
        const fixtures = await setupAssetERC721Test();
        const defaultAdminRole = await fixtures.polygonAssetERC721.DEFAULT_ADMIN_ROLE();
        expect(
          await fixtures.polygonAssetERC721.hasRole(
            defaultAdminRole,
            fixtures.adminRole
          )
        ).to.be.true;
      });
    });
    describe('MINTER', function () {
      it('check initial roles', async function () {
        const fixtures = await setupAssetERC721Test();
        expect(
          await fixtures.polygonAssetERC721.hasRole(
            fixtures.minterRole,
            fixtures.minter
          )
        ).to.be.true;
        expect(
          await fixtures.polygonAssetERC721.hasRole(
            fixtures.minterRole,
            fixtures.other
          )
        ).to.be.false;
      });
      it('minter can mint tokens', async function () {
        const tokenId = BigNumber.from('0xdada1');
        const fixtures = await setupAssetERC721Test();
        // Mint
        await fixtures.polygonAssetERC721AsMinter['mint(address,uint256)'](
          fixtures.other,
          tokenId
        );
      });
      // TODO: Mint with metadata
      // TODO: Token exists
      // TODO: MINTED event

      it('other user should fail to mint', async function () {
        const tokenId = BigNumber.from('0xdada2');
        const fixtures = await setupAssetERC721Test();
        // Mint
        await fixtures.polygonAssetERC721AsMinter['mint(address,uint256)'](
          fixtures.other,
          tokenId
        );
        await expect(
          fixtures.polygonAssetERC721AsMinter['mint(address,uint256)'](
            fixtures.other,
            tokenId
          )
        ).to.be.reverted;
      });
    });
  });
  describe('metaTx', function () {
    // Mint
    // Mint with metadata
    // Transfer
  });
  describe('PolygonAssetERC721: operator filterer', function () {
    it('should be registered', async function () {
      const {
        operatorFilterRegistry,
        polygonAssetERC721,
      } = await setupOperatorFilter();
      expect(
        await operatorFilterRegistry.isRegistered(polygonAssetERC721.address)
      ).to.be.equal(true);
    });

    it('should be subscribed to operator filterer subscription contract', async function () {
      const {
        operatorFilterRegistry,
        operatorFilterSubscription,
        polygonAssetERC721,
      } = await setupOperatorFilter();
      expect(
        await operatorFilterRegistry.subscriptionOf(polygonAssetERC721.address)
      ).to.be.equal(operatorFilterSubscription.address);
    });
    it('should have market places blacklisted', async function () {
      const {
        mockMarketPlace1,
        mockMarketPlace2,
        operatorFilterRegistry,
        polygonAssetERC721,
      } = await setupOperatorFilter();
      const mockMarketPlace1CodeHash = await operatorFilterRegistry.codeHashOf(
        mockMarketPlace1.address
      );
      expect(
        await operatorFilterRegistry.isOperatorFiltered(
          polygonAssetERC721.address,
          mockMarketPlace1.address
        )
      ).to.be.equal(true);

      expect(
        await operatorFilterRegistry.isCodeHashFiltered(
          polygonAssetERC721.address,
          mockMarketPlace1CodeHash
        )
      ).to.be.equal(true);

      const mockMarketPlace2CodeHash = await operatorFilterRegistry.codeHashOf(
        mockMarketPlace2.address
      );
      expect(
        await operatorFilterRegistry.isOperatorFiltered(
          polygonAssetERC721.address,
          mockMarketPlace2.address
        )
      ).to.be.equal(true);

      expect(
        await operatorFilterRegistry.isCodeHashFiltered(
          polygonAssetERC721.address,
          mockMarketPlace2CodeHash
        )
      ).to.be.equal(true);
    });

    it('should be able to transfer token if from is the owner of token', async function () {
      const {
        polygonAssetERC721,
        users,
        mintAssetERC721,
      } = await setupOperatorFilter();
      await mintAssetERC721(users[0].address, 1);

      await polygonAssetERC721['safeTransferFrom(address,address,uint256)'](
        users[0].address,
        users[1].address,
        1
      );

      expect(await polygonAssetERC721.balanceOf(users[1].address)).to.be.equal(
        1
      );
    });

    it('should be able to batch transfer token if from is the owner of token', async function () {
      const {
        polygonAssetERC721,
        users,
        mintAssetERC721,
      } = await setupOperatorFilter();
      await mintAssetERC721(users[0].address, 1);
      await mintAssetERC721(users[0].address, 2);

      await polygonAssetERC721[
        'safeBatchTransferFrom(address,address,uint256[],bytes)'
      ](users[0].address, users[1].address, [1, 2], '0x');

      expect(await polygonAssetERC721.balanceOf(users[1].address)).to.be.equal(
        2
      );
    });

    it('should be able to transfer token if from is the owner of token and to is a blacklisted marketplace', async function () {
      const {
        mockMarketPlace1,
        polygonAssetERC721,
        users,
        mintAssetERC721,
      } = await setupOperatorFilter();
      await mintAssetERC721(users[0].address, 1);
      await polygonAssetERC721['safeTransferFrom(address,address,uint256)'](
        users[0].address,
        mockMarketPlace1.address,
        1
      );

      expect(
        await polygonAssetERC721.balanceOf(mockMarketPlace1.address)
      ).to.be.equal(1);
    });

    it('should be able to batch transfer token if from is the owner of token and to is a blacklisted marketplace', async function () {
      const {
        mockMarketPlace1,
        polygonAssetERC721,
        users,
        mintAssetERC721,
      } = await setupOperatorFilter();
      await mintAssetERC721(users[0].address, 1);
      await mintAssetERC721(users[0].address, 2);

      await polygonAssetERC721[
        'safeBatchTransferFrom(address,address,uint256[],bytes)'
      ](users[0].address, mockMarketPlace1.address, [1, 2], '0x');

      expect(
        await polygonAssetERC721.balanceOf(mockMarketPlace1.address)
      ).to.be.equal(2);
    });

    it('it should not approve blacklisted market places', async function () {
      const {mockMarketPlace1, users} = await setupOperatorFilter();

      await expect(
        users[1].polygonAssetERC721.approveFor(
          users[1].address,
          mockMarketPlace1.address,
          1
        )
      ).to.be.revertedWith('Address is filtered');
    });

    it('it should approve non blacklisted market places', async function () {
      const {
        mockMarketPlace3,
        polygonAssetERC721,
        users,
        mintAssetERC721,
      } = await setupOperatorFilter();
      const {tokenId} = await mintAssetERC721(users[0].address, 1);

      await users[0].polygonAssetERC721.approveFor(
        users[0].address,
        mockMarketPlace3.address,
        tokenId
      );
      expect(await polygonAssetERC721.getApproved(tokenId)).to.be.equal(
        mockMarketPlace3.address
      );
    });

    it('it should not be able to approve non blacklisted market places after they are blacklisted ', async function () {
      const {
        mockMarketPlace3,
        operatorFilterRegistryAsOwner,
        operatorFilterSubscription,
        polygonAssetERC721,
        users,
        mintAssetERC721,
      } = await setupOperatorFilter();

      const {tokenId} = await mintAssetERC721(users[0].address, 1);

      await users[0].polygonAssetERC721.approveFor(
        users[0].address,
        mockMarketPlace3.address,
        tokenId
      );

      expect(await polygonAssetERC721.getApproved(tokenId)).to.be.equal(
        mockMarketPlace3.address
      );

      await operatorFilterRegistryAsOwner.updateOperator(
        operatorFilterSubscription.address,
        mockMarketPlace3.address,
        true
      );

      await expect(
        users[0].polygonAssetERC721.approveFor(
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
        polygonAssetERC721,
        users,
        mintAssetERC721,
      } = await setupOperatorFilter();
      const {tokenId} = await mintAssetERC721(users[0].address, 1);

      const mockMarketPlace3CodeHash = await operatorFilterRegistryAsOwner.codeHashOf(
        mockMarketPlace3.address
      );

      await users[0].polygonAssetERC721.approveFor(
        users[0].address,
        mockMarketPlace3.address,
        tokenId
      );

      expect(await polygonAssetERC721.getApproved(tokenId)).to.be.equal(
        mockMarketPlace3.address
      );

      await operatorFilterRegistryAsOwner.updateCodeHash(
        operatorFilterSubscription.address,
        mockMarketPlace3CodeHash,
        true
      );

      await expect(
        users[1].polygonAssetERC721.approveFor(
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
        polygonAssetERC721,
        mintAssetERC721,
        users,
      } = await setupOperatorFilter();

      const {tokenId} = await mintAssetERC721(users[0].address, 1);

      const mockMarketPlace1CodeHash = await operatorFilterRegistryAsOwner.codeHashOf(
        mockMarketPlace1.address
      );

      await expect(
        users[0].polygonAssetERC721.approveFor(
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

      await users[0].polygonAssetERC721.approveFor(
        users[0].address,
        mockMarketPlace1.address,
        tokenId
      );

      expect(await polygonAssetERC721.getApproved(tokenId)).to.be.equal(
        mockMarketPlace1.address
      );
    });

    it('it should not approve for all for blacklisted market places', async function () {
      const {mockMarketPlace1, users} = await setupOperatorFilter();

      await expect(
        users[0].polygonAssetERC721.setApprovalForAllFor(
          users[0].address,
          mockMarketPlace1.address,
          true
        )
      ).to.be.reverted;
    });

    it('it should approve for all for non blacklisted market places', async function () {
      const {
        mockMarketPlace3,
        polygonAssetERC721,
        users,
      } = await setupOperatorFilter();
      await users[0].polygonAssetERC721.setApprovalForAllFor(
        users[0].address,
        mockMarketPlace3.address,
        true
      );
      expect(
        await polygonAssetERC721.isApprovedForAll(
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
        polygonAssetERC721,
        users,
      } = await setupOperatorFilter();

      await users[0].polygonAssetERC721.setApprovalForAllFor(
        users[0].address,
        mockMarketPlace3.address,
        true
      );

      expect(
        await polygonAssetERC721.isApprovedForAll(
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
        users[1].polygonAssetERC721.setApprovalForAllFor(
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
        polygonAssetERC721,
        users,
      } = await setupOperatorFilter();

      const mockMarketPlace3CodeHash = await operatorFilterRegistryAsOwner.codeHashOf(
        mockMarketPlace3.address
      );

      await users[0].polygonAssetERC721.setApprovalForAllFor(
        users[0].address,
        mockMarketPlace3.address,
        true
      );

      expect(
        await polygonAssetERC721.isApprovedForAll(
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
        users[1].polygonAssetERC721.setApprovalForAllFor(
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
        polygonAssetERC721,
        users,
      } = await setupOperatorFilter();

      const mockMarketPlace1CodeHash = await operatorFilterRegistryAsOwner.codeHashOf(
        mockMarketPlace1.address
      );

      await expect(
        users[0].polygonAssetERC721.setApprovalForAllFor(
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

      await users[0].polygonAssetERC721.setApprovalForAllFor(
        users[0].address,
        mockMarketPlace1.address,
        true
      );

      expect(
        await polygonAssetERC721.isApprovedForAll(
          users[0].address,
          mockMarketPlace1.address
        )
      ).to.be.equal(true);
    });

    it('it should not be able to transfer through blacklisted market places', async function () {
      const {
        mockMarketPlace1,
        polygonAssetERC721,
        users,
        mintAssetERC721,
      } = await setupOperatorFilter();
      const {tokenId} = await mintAssetERC721(users[0].address, 1);

      await users[0].polygonAssetERC721.setApprovalForAllWithOutFilter(
        mockMarketPlace1.address,
        true
      );
      await expect(
        mockMarketPlace1.transferTokenERC721(
          polygonAssetERC721.address,
          users[0].address,
          users[1].address,
          tokenId
        )
      ).to.be.revertedWith('Address is filtered');
    });

    it('it should not be able to transfer through market places after they are blacklisted', async function () {
      const {
        mockMarketPlace3,
        polygonAssetERC721,
        users,
        operatorFilterRegistryAsOwner,
        operatorFilterSubscription,
        mintAssetERC721,
      } = await setupOperatorFilter();
      const {tokenId} = await mintAssetERC721(users[0].address, 1);

      await users[0].polygonAssetERC721.setApprovalForAllWithOutFilter(
        mockMarketPlace3.address,
        true
      );

      await mockMarketPlace3.transferTokenERC721(
        polygonAssetERC721.address,
        users[0].address,
        users[1].address,
        tokenId
      );

      expect(await polygonAssetERC721.balanceOf(users[1].address)).to.be.equal(
        1
      );

      await operatorFilterRegistryAsOwner.updateOperator(
        operatorFilterSubscription.address,
        mockMarketPlace3.address,
        true
      );

      await expect(
        mockMarketPlace3.transferTokenERC721(
          polygonAssetERC721.address,
          users[0].address,
          users[1].address,
          tokenId
        )
      ).to.be.revertedWith('Address is filtered');
    });

    it('it should be able to transfer through non blacklisted market places', async function () {
      const {
        mockMarketPlace3,
        polygonAssetERC721,
        users,
        mintAssetERC721,
      } = await setupOperatorFilter();
      const {tokenId} = await mintAssetERC721(users[0].address, 1);

      await users[0].polygonAssetERC721.setApprovalForAllWithOutFilter(
        mockMarketPlace3.address,
        true
      );
      await mockMarketPlace3.transferTokenERC721(
        polygonAssetERC721.address,
        users[0].address,
        users[1].address,
        tokenId
      );

      expect(await polygonAssetERC721.balanceOf(users[1].address)).to.be.equal(
        1
      );
    });

    it('it should not be able to transfer through non blacklisted market places after their codeHash is filtered', async function () {
      const {
        mockMarketPlace3,
        polygonAssetERC721,
        users,
        operatorFilterRegistryAsOwner,
        operatorFilterSubscription,
        mintAssetERC721,
      } = await setupOperatorFilter();
      const {tokenId} = await mintAssetERC721(users[0].address, 1);

      await users[0].polygonAssetERC721.setApprovalForAllWithOutFilter(
        mockMarketPlace3.address,
        true
      );

      await mockMarketPlace3.transferTokenERC721(
        polygonAssetERC721.address,
        users[0].address,
        users[1].address,
        tokenId
      );

      expect(await polygonAssetERC721.balanceOf(users[1].address)).to.be.equal(
        1
      );

      const mockMarketPlace3CodeHash = await operatorFilterRegistryAsOwner.codeHashOf(
        mockMarketPlace3.address
      );
      await operatorFilterRegistryAsOwner.updateCodeHash(
        operatorFilterSubscription.address,
        mockMarketPlace3CodeHash,
        true
      );
      await users[1].polygonAssetERC721.setApprovalForAllWithOutFilter(
        mockMarketPlace3.address,
        true
      );

      await expect(
        mockMarketPlace3.transferTokenERC721(
          polygonAssetERC721.address,
          users[1].address,
          users[0].address,
          tokenId
        )
      ).to.be.revertedWith('Codehash is filtered');
    });

    it('it should not be able to transfer through blacklisted market places after they are removed from blacklist', async function () {
      const {
        mockMarketPlace1,
        polygonAssetERC721,
        users,
        operatorFilterRegistryAsOwner,
        operatorFilterSubscription,
        mintAssetERC721,
      } = await setupOperatorFilter();
      const mockMarketPlace1CodeHash = await operatorFilterRegistryAsOwner.codeHashOf(
        mockMarketPlace1.address
      );
      const {tokenId} = await mintAssetERC721(users[0].address, 1);

      await users[0].polygonAssetERC721.setApprovalForAllWithOutFilter(
        mockMarketPlace1.address,
        true
      );

      await expect(
        mockMarketPlace1.transferTokenERC721(
          polygonAssetERC721.address,
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
        polygonAssetERC721.address,
        users[0].address,
        users[1].address,
        tokenId
      );

      expect(await polygonAssetERC721.balanceOf(users[1].address)).to.be.equal(
        1
      );
    });

    it('it should not be able to batch transfer through blacklisted market places', async function () {
      const {
        mockMarketPlace1,
        polygonAssetERC721,
        users,
        mintAssetERC721,
      } = await setupOperatorFilter();
      const {tokenId: tokenId1} = await mintAssetERC721(users[0].address, 1);
      const {tokenId: tokenId2} = await mintAssetERC721(users[0].address, 2);

      await users[0].polygonAssetERC721.setApprovalForAllWithOutFilter(
        mockMarketPlace1.address,
        true
      );
      await expect(
        mockMarketPlace1.batchTransferTokenERC721(
          polygonAssetERC721.address,
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
        polygonAssetERC721,
        users,
        mintAssetERC721,
      } = await setupOperatorFilter();
      const {tokenId: tokenId1} = await mintAssetERC721(users[0].address, 1);
      const {tokenId: tokenId2} = await mintAssetERC721(users[0].address, 2);

      await users[0].polygonAssetERC721.setApprovalForAllWithOutFilter(
        mockMarketPlace3.address,
        true
      );

      await mockMarketPlace3.batchTransferTokenERC721(
        polygonAssetERC721.address,
        users[0].address,
        users[1].address,
        [tokenId1, tokenId2],
        '0x'
      );

      expect(await polygonAssetERC721.balanceOf(users[1].address)).to.be.equal(
        2
      );
    });

    it('it should be not be able to batch transfer through market places after they are blacklisted', async function () {
      const {
        mockMarketPlace3,
        polygonAssetERC721,
        users,
        operatorFilterRegistryAsOwner,
        operatorFilterSubscription,
        mintAssetERC721,
      } = await setupOperatorFilter();
      const {tokenId: tokenId1} = await mintAssetERC721(users[0].address, 1);
      const {tokenId: tokenId2} = await mintAssetERC721(users[0].address, 2);

      await users[0].polygonAssetERC721.setApprovalForAllWithOutFilter(
        mockMarketPlace3.address,
        true
      );

      await mockMarketPlace3.batchTransferTokenERC721(
        polygonAssetERC721.address,
        users[0].address,
        users[1].address,
        [tokenId1, tokenId2],
        '0x'
      );

      expect(await polygonAssetERC721.balanceOf(users[1].address)).to.be.equal(
        2
      );

      await users[1].polygonAssetERC721.setApprovalForAllWithOutFilter(
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
          polygonAssetERC721.address,
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
        polygonAssetERC721,
        users,
        operatorFilterRegistryAsOwner,
        operatorFilterSubscription,
        mintAssetERC721,
      } = await setupOperatorFilter();

      const {tokenId: tokenId1} = await mintAssetERC721(users[0].address, 1);
      const {tokenId: tokenId2} = await mintAssetERC721(users[0].address, 2);

      await users[0].polygonAssetERC721.setApprovalForAllWithOutFilter(
        mockMarketPlace3.address,
        true
      );

      await mockMarketPlace3.batchTransferTokenERC721(
        polygonAssetERC721.address,
        users[0].address,
        users[1].address,
        [tokenId1, tokenId2],
        '0x'
      );

      expect(await polygonAssetERC721.balanceOf(users[1].address)).to.be.equal(
        2
      );

      const mockMarketPlace3CodeHash = await operatorFilterRegistryAsOwner.codeHashOf(
        mockMarketPlace3.address
      );

      await operatorFilterRegistryAsOwner.updateCodeHash(
        operatorFilterSubscription.address,
        mockMarketPlace3CodeHash,
        true
      );

      await users[1].polygonAssetERC721.setApprovalForAllWithOutFilter(
        mockMarketPlace3.address,
        true
      );

      await expect(
        mockMarketPlace3.batchTransferTokenERC721(
          polygonAssetERC721.address,
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
        polygonAssetERC721,
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
      await users[0].polygonAssetERC721.setApprovalForAllWithOutFilter(
        mockMarketPlace1.address,
        true
      );
      await expect(
        mockMarketPlace1.batchTransferTokenERC721(
          polygonAssetERC721.address,
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
      await users[1].polygonAssetERC721.setApprovalForAllWithOutFilter(
        mockMarketPlace1.address,
        true
      );
      await users[1].polygonAssetERC721.setApprovalForAllWithOutFilter(
        mockMarketPlace1.address,
        true
      );

      await mockMarketPlace1.batchTransferTokenERC721(
        polygonAssetERC721.address,
        users[0].address,
        users[1].address,
        [tokenId1, tokenId2],
        '0x'
      );

      expect(await polygonAssetERC721.balanceOf(users[1].address)).to.be.equal(
        2
      );
    });
  });
});
// TODO:
// e2e flow
