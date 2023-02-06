import {getAssetChainIndex, waitFor, withSnapshot} from '../utils';
import {expect} from '../chai-setup';
import {sendMetaTx} from '../sendMetaTx';
import {assetFixtures} from '../common/fixtures/asset';
import {ethers} from 'hardhat';
import {setupOperatorFilter} from './fixtures';

const setupAsset = withSnapshot(
  [
    'Asset',
    'PolygonAssetERC1155',
    'AssetERC1155Tunnel',
    'PolygonAssetERC1155Tunnel',
  ],
  assetFixtures
);

describe('AssetERC1155.sol', function () {
  it('user sending asset to itself keep the same balance', async function () {
    const {Asset, users, mintAsset} = await setupAsset();
    const tokenId = await mintAsset(users[0].address, 20);
    await waitFor(
      users[0].Asset['safeTransferFrom(address,address,uint256,uint256,bytes)'](
        users[0].address,
        users[0].address,
        tokenId,
        10,
        '0x'
      )
    );
    const balance = await Asset['balanceOf(address,uint256)'](
      users[0].address,
      tokenId
    );
    console.log(balance.toString());
    expect(balance).to.be.equal(20);
  });
  it('mintMultiple reverts when ids and amounts length mismatch', async function () {
    const {Asset, minter} = await setupAsset();
    const ids = [
      '0x2de2299db048a9e3b8d1934b8dae11b8041cc4fd000000008000000000005000',
      '0x2de2299db048a9e3b8d1934b8dae11b8041cc4fd000000008000000001005001',
    ];
    const amounts = [2];
    await expect(
      Asset.connect(ethers.provider.getSigner(minter))[
        'mintMultiple(address,uint256[],uint256[],bytes)'
      ](minter, ids, amounts, '0x')
    ).to.revertedWith('AssetERC1155: ids and amounts length mismatch');
  });
  it('can transfer assets', async function () {
    const {Asset, users, mintAsset} = await setupAsset();
    const tokenId = await mintAsset(users[1].address, 11);
    await waitFor(
      users[1].Asset['safeTransferFrom(address,address,uint256,uint256,bytes)'](
        users[1].address,
        users[2].address,
        tokenId,
        10,
        '0x'
      )
    );
    const balance = await Asset['balanceOf(address,uint256)'](
      users[2].address,
      tokenId
    );
    expect(balance).to.be.equal(10);
  });

  it('user batch sending asset to itself keep the same balance', async function () {
    const {Asset, users, mintAsset} = await setupAsset();
    const tokenId = await mintAsset(users[0].address, 20);
    await waitFor(
      users[0].Asset.safeBatchTransferFrom(
        users[0].address,
        users[0].address,
        [tokenId],
        [10],
        '0x'
      )
    );
    const balance = await Asset['balanceOf(address,uint256)'](
      users[0].address,
      tokenId
    );
    expect(balance).to.be.equal(20);
  });

  it('user batch sending in series whose total is more than its balance', async function () {
    const {Asset, users, mintAsset} = await setupAsset();
    const tokenId = await mintAsset(users[0].address, 20);
    await waitFor(
      users[0].Asset.safeBatchTransferFrom(
        users[0].address,
        users[0].address,
        [tokenId, tokenId, tokenId],
        [10, 20, 20],
        '0x'
      )
    );
    const balance = await Asset['balanceOf(address,uint256)'](
      users[0].address,
      tokenId
    );
    expect(balance).to.be.equal(20);
  });

  it('user batch sending more asset that it owns should fails', async function () {
    const {users, mintAsset} = await setupAsset();
    const tokenId = await mintAsset(users[0].address, 20);
    await expect(
      users[0].Asset.safeBatchTransferFrom(
        users[0].address,
        users[0].address,
        [tokenId],
        [30],
        '0x'
      )
    ).to.be.revertedWith(`BALANCE_TOO_LOW`);
  });

  it('can get the chainIndex from the tokenId, supply > 1', async function () {
    const {users, mintAsset} = await setupAsset();
    const tokenId = await mintAsset(users[1].address, 11);
    const chainIndex = getAssetChainIndex(tokenId);
    expect(chainIndex).to.be.equal(1); // Note: token was minted on L2 and bridged so chainId is 1
  });

  it('can get the chainIndex from the tokenId, supply 1', async function () {
    const {users, mintAsset} = await setupAsset();
    const tokenId1 = await mintAsset(users[1].address, 1);
    const chainIndex = getAssetChainIndex(tokenId1);
    expect(chainIndex).to.be.equal(1); // Note: token was minted on L2 and bridged so chainId is 1
  });

  it('can get the URI for an asset of amount 1', async function () {
    const {Asset, users, mintAsset} = await setupAsset();
    const tokenId = await mintAsset(users[1].address, 1);
    const URI = await Asset.callStatic.uri(tokenId);
    // const hash =
    //   '0x78b9f42c22c3c8b260b781578da3151e8200c741c6b7437bafaff5a9df9b403e';
    // getHash2Base32(hash) ==> dyxh2cyiwdzczgbn4bk6g2gfi6qiamoqogw5bxxl5p6wu57g2ahy
    expect(URI).to.be.equal(
      'ipfs://bafybeidyxh2cyiwdzczgbn4bk6g2gfi6qiamoqogw5bxxl5p6wu57g2ahy/0.json'
    );
  });

  it('can get the URI for a FT', async function () {
    const {Asset, users, mintAsset} = await setupAsset();
    const tokenId = await mintAsset(users[1].address, 11);
    const URI = await Asset.callStatic.uri(tokenId);
    // const hash =
    //   '0x78b9f42c22c3c8b260b781578da3151e8200c741c6b7437bafaff5a9df9b403e';
    // getHash2Base32(hash) ==> dyxh2cyiwdzczgbn4bk6g2gfi6qiamoqogw5bxxl5p6wu57g2ahy
    expect(URI).to.be.equal(
      'ipfs://bafybeidyxh2cyiwdzczgbn4bk6g2gfi6qiamoqogw5bxxl5p6wu57g2ahy/0.json'
    );
  });

  it('fails get the URI for an invalid tokeId', async function () {
    const {Asset} = await setupAsset();
    const tokenId = 42;
    await expect(Asset.callStatic.uri(tokenId)).to.be.revertedWith(
      'INVALID_ID'
    );
  });

  describe('AssetERC1155: MetaTransactions', function () {
    it('can transfer by metaTx', async function () {
      const {Asset, users, mintAsset, trustedForwarder} = await setupAsset();
      const tokenId = await mintAsset(users[1].address, 11);

      const {to, data} = await Asset.populateTransaction[
        'safeTransferFrom(address,address,uint256,uint256,bytes)'
      ](users[1].address, users[2].address, tokenId, 10, '0x');

      await sendMetaTx(to, trustedForwarder, data, users[1].address);

      const balance = await Asset['balanceOf(address,uint256)'](
        users[2].address,
        tokenId
      );
      expect(balance).to.be.equal(10);
    });

    it('fails to transfer someone else token by metaTx', async function () {
      const {Asset, users, mintAsset, trustedForwarder} = await setupAsset();
      const tokenId = await mintAsset(users[1].address, 11);

      const {to, data} = await Asset.populateTransaction[
        'safeTransferFrom(address,address,uint256,uint256,bytes)'
      ](users[1].address, users[2].address, tokenId, 10, '0x');

      // users[2] trys to transfer users[1]'s token
      await sendMetaTx(to, trustedForwarder, data, users[2].address);

      const balance = await Asset['balanceOf(address,uint256)'](
        users[2].address,
        tokenId
      );
      // but it fails, and balance is not 10
      expect(balance).to.be.equal(0);
    });

    it('can batch-transfer by metaTx', async function () {
      const {Asset, users, mintAsset, trustedForwarder} = await setupAsset();
      const tokenId1 = await mintAsset(users[1].address, 7);
      const tokenId2 = await mintAsset(users[1].address, 3);
      const tokenIds = [tokenId1, tokenId2];
      const values = [7, 3];

      const {to, data} = await Asset.populateTransaction[
        'safeBatchTransferFrom(address,address,uint256[],uint256[],bytes)'
      ](users[1].address, users[2].address, tokenIds, values, '0x');

      await sendMetaTx(to, trustedForwarder, data, users[1].address);

      const balance1 = await Asset['balanceOf(address,uint256)'](
        users[2].address,
        tokenId1
      );
      const balance2 = await Asset['balanceOf(address,uint256)'](
        users[2].address,
        tokenId2
      );
      expect(balance1).to.be.equal(7);
      expect(balance2).to.be.equal(3);
    });
  });

  describe('AssetERC1155: operator filterer', function () {
    it('should be registered', async function () {
      const {
        operatorFilterRegistry,
        assetERC1155,
      } = await setupOperatorFilter();
      expect(
        await operatorFilterRegistry.isRegistered(assetERC1155.address)
      ).to.be.equal(true);
    });

    it('should be subscribed to operator filterer subscription contract', async function () {
      const {
        operatorFilterRegistry,
        operatorFilterSubscription,
        assetERC1155,
      } = await setupOperatorFilter();
      expect(
        await operatorFilterRegistry.subscriptionOf(assetERC1155.address)
      ).to.be.equal(operatorFilterSubscription.address);
    });

    it('should be able to transfer token if from is the owner of token', async function () {
      const {
        assetERC1155,
        ipfsHashString,
        users,
        mintAssetERC1155,
      } = await setupOperatorFilter();
      const id = await mintAssetERC1155(
        users[0].address,
        1,
        ipfsHashString,
        10,
        users[0].address
      );

      await assetERC1155.safeTransferFrom(
        users[0].address,
        users[1].address,
        id,
        5,
        '0x'
      );

      expect(await assetERC1155.balanceOf(users[1].address, id)).to.be.equal(5);
    });

    it('should be able to batch transfer token if from is the owner of token', async function () {
      const {
        assetERC1155,
        ipfsHashString,
        users,
        mintAssetERC1155,
      } = await setupOperatorFilter();
      const id1 = await mintAssetERC1155(
        users[0].address,
        1,
        ipfsHashString,
        10,
        users[0].address
      );

      const id2 = await mintAssetERC1155(
        users[0].address,
        2,
        ipfsHashString,
        10,
        users[0].address
      );

      await assetERC1155.safeBatchTransferFrom(
        users[0].address,
        users[1].address,
        [id1, id2],
        [5, 5],
        '0x'
      );

      expect(await assetERC1155.balanceOf(users[1].address, id1)).to.be.equal(
        5
      );
      expect(await assetERC1155.balanceOf(users[1].address, id2)).to.be.equal(
        5
      );
    });

    it('should be able to transfer token if from is the owner of token and to is a blacklisted marketplace', async function () {
      const {
        mockMarketPlace1,
        assetERC1155,
        ipfsHashString,
        users,
        mintAssetERC1155,
      } = await setupOperatorFilter();
      const id = await mintAssetERC1155(
        users[0].address,
        1,
        ipfsHashString,
        10,
        users[0].address
      );

      await assetERC1155.safeTransferFrom(
        users[0].address,
        mockMarketPlace1.address,
        id,
        5,
        '0x'
      );

      expect(
        await assetERC1155.balanceOf(mockMarketPlace1.address, id)
      ).to.be.equal(5);
    });

    it('should be able to batch transfer token if from is the owner of token and to is a blacklisted marketplace', async function () {
      const {
        mockMarketPlace1,
        assetERC1155,
        ipfsHashString,
        users,
        mintAssetERC1155,
      } = await setupOperatorFilter();
      const id1 = await mintAssetERC1155(
        users[0].address,
        1,
        ipfsHashString,
        10,
        users[0].address
      );

      const id2 = await mintAssetERC1155(
        users[0].address,
        2,
        ipfsHashString,
        10,
        users[0].address
      );

      await assetERC1155.safeBatchTransferFrom(
        users[0].address,
        mockMarketPlace1.address,
        [id1, id2],
        [5, 5],
        '0x'
      );

      expect(
        await assetERC1155.balanceOf(mockMarketPlace1.address, id1)
      ).to.be.equal(5);
      expect(
        await assetERC1155.balanceOf(mockMarketPlace1.address, id2)
      ).to.be.equal(5);
    });

    it('it should not approve blacklisted market places', async function () {
      const {mockMarketPlace1, assetERC1155} = await setupOperatorFilter();
      await expect(
        assetERC1155.setApprovalForAll(mockMarketPlace1.address, true)
      ).to.be.reverted;
    });

    it('it should approve non blacklisted market places', async function () {
      const {
        mockMarketPlace3,
        assetERC1155,
        users,
      } = await setupOperatorFilter();
      await users[0].assetERC1155.setApprovalForAll(
        mockMarketPlace3.address,
        true
      );
      expect(
        await assetERC1155.isApprovedForAll(
          users[0].address,
          mockMarketPlace3.address
        )
      ).to.be.equal(true);
    });

    it('it should not be able to approve non blacklisted market places after they are blacklisted ', async function () {
      const {
        mockMarketPlace3,
        operatorFilterRegistryAsOwner,
        operatorFilterSubscription,
        assetERC1155,
        users,
      } = await setupOperatorFilter();
      await users[0].assetERC1155.setApprovalForAll(
        mockMarketPlace3.address,
        true
      );

      expect(
        await assetERC1155.isApprovedForAll(
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
        users[1].assetERC1155.setApprovalForAll(mockMarketPlace3.address, true)
      ).to.be.revertedWith('Address is filtered');
    });

    it('it should not be able to approve non blacklisted market places after there codeHashes are blacklisted ', async function () {
      const {
        mockMarketPlace3,
        operatorFilterRegistryAsOwner,
        operatorFilterSubscription,
        assetERC1155,
        users,
      } = await setupOperatorFilter();

      const mockMarketPlace3CodeHash = await operatorFilterRegistryAsOwner.codeHashOf(
        mockMarketPlace3.address
      );

      await users[0].assetERC1155.setApprovalForAll(
        mockMarketPlace3.address,
        true
      );

      expect(
        await assetERC1155.isApprovedForAll(
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
        users[1].assetERC1155.setApprovalForAll(mockMarketPlace3.address, true)
      ).to.be.revertedWith('Codehash is filtered');
    });

    it('it should be able to approve blacklisted market places after they are removed from the blacklist ', async function () {
      const {
        mockMarketPlace1,
        operatorFilterRegistryAsOwner,
        operatorFilterSubscription,
        assetERC1155,
        users,
      } = await setupOperatorFilter();

      const mockMarketPlace1CodeHash = await operatorFilterRegistryAsOwner.codeHashOf(
        mockMarketPlace1.address
      );

      await expect(
        users[0].assetERC1155.setApprovalForAll(mockMarketPlace1.address, true)
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

      await users[0].assetERC1155.setApprovalForAll(
        mockMarketPlace1.address,
        true
      );

      expect(
        await assetERC1155.isApprovedForAll(
          users[0].address,
          mockMarketPlace1.address
        )
      ).to.be.equal(true);
    });

    it('it should not approve for all for blacklisted market places', async function () {
      const {mockMarketPlace1, assetERC1155} = await setupOperatorFilter();
      await expect(
        assetERC1155.setApprovalForAllFor(mockMarketPlace1.address, true)
      ).to.be.reverted;
    });

    it('it should approve for all for non blacklisted market places', async function () {
      const {
        mockMarketPlace3,
        assetERC1155,
        users,
      } = await setupOperatorFilter();
      await users[0].assetERC1155.setApprovalForAllFor(
        users[0].address,
        mockMarketPlace3.address,
        true
      );
      expect(
        await assetERC1155.isApprovedForAll(
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
        assetERC1155,
        users,
      } = await setupOperatorFilter();

      await users[0].assetERC1155.setApprovalForAllFor(
        users[0].address,
        mockMarketPlace3.address,
        true
      );

      expect(
        await assetERC1155.isApprovedForAll(
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
        users[1].assetERC1155.setApprovalForAllFor(
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
        assetERC1155,
        users,
      } = await setupOperatorFilter();

      const mockMarketPlace3CodeHash = await operatorFilterRegistryAsOwner.codeHashOf(
        mockMarketPlace3.address
      );

      await users[0].assetERC1155.setApprovalForAllFor(
        users[0].address,
        mockMarketPlace3.address,
        true
      );

      expect(
        await assetERC1155.isApprovedForAll(
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
        users[1].assetERC1155.setApprovalForAllFor(
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
        assetERC1155,
        users,
      } = await setupOperatorFilter();

      const mockMarketPlace1CodeHash = await operatorFilterRegistryAsOwner.codeHashOf(
        mockMarketPlace1.address
      );

      await expect(
        users[0].assetERC1155.setApprovalForAllFor(
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

      await users[0].assetERC1155.setApprovalForAllFor(
        users[0].address,
        mockMarketPlace1.address,
        true
      );

      expect(
        await assetERC1155.isApprovedForAll(
          users[0].address,
          mockMarketPlace1.address
        )
      ).to.be.equal(true);
    });

    it('it should not be able to transfer through blacklisted market places', async function () {
      const {
        mockMarketPlace1,
        assetERC1155,
        ipfsHashString,
        users,
        mintAssetERC1155,
      } = await setupOperatorFilter();
      const id = await mintAssetERC1155(
        users[0].address,
        1,
        ipfsHashString,
        10,
        users[0].address
      );

      await users[0].assetERC1155.setApprovalForAllWithOutFilter(
        mockMarketPlace1.address,
        true
      );
      await expect(
        mockMarketPlace1.transferTokenForERC1155(
          assetERC1155.address,
          users[0].address,
          users[1].address,
          id,
          2,
          '0x'
        )
      ).to.be.revertedWith('Address is filtered');
    });

    it('it should not be able to transfer through market places after they are blacklisted', async function () {
      const {
        mockMarketPlace3,
        assetERC1155,
        ipfsHashString,
        users,
        operatorFilterRegistryAsOwner,
        operatorFilterSubscription,
        mintAssetERC1155,
      } = await setupOperatorFilter();
      const id = await mintAssetERC1155(
        users[0].address,
        1,
        ipfsHashString,
        10,
        users[0].address
      );

      await users[0].assetERC1155.setApprovalForAllWithOutFilter(
        mockMarketPlace3.address,
        true
      );

      await mockMarketPlace3.transferTokenForERC1155(
        assetERC1155.address,
        users[0].address,
        users[1].address,
        id,
        2,
        '0x'
      );

      expect(await assetERC1155.balanceOf(users[1].address, id)).to.be.equal(2);

      await operatorFilterRegistryAsOwner.updateOperator(
        operatorFilterSubscription.address,
        mockMarketPlace3.address,
        true
      );

      await expect(
        mockMarketPlace3.transferTokenForERC1155(
          assetERC1155.address,
          users[0].address,
          users[1].address,
          id,
          2,
          '0x'
        )
      ).to.be.revertedWith('Address is filtered');
    });

    it('it should be able to transfer through non blacklisted market places', async function () {
      const {
        mockMarketPlace3,
        assetERC1155,
        ipfsHashString,
        users,
        mintAssetERC1155,
      } = await setupOperatorFilter();
      const id = await mintAssetERC1155(
        users[0].address,
        1,
        ipfsHashString,
        10,
        users[0].address
      );

      await users[0].assetERC1155.setApprovalForAllWithOutFilter(
        mockMarketPlace3.address,
        true
      );
      await mockMarketPlace3.transferTokenForERC1155(
        assetERC1155.address,
        users[0].address,
        users[1].address,
        id,
        2,
        '0x'
      );

      expect(await assetERC1155.balanceOf(users[1].address, id)).to.be.equal(2);
    });

    it('it should not be able to transfer through non blacklisted market places after their codeHash is blacklisted', async function () {
      const {
        mockMarketPlace3,
        assetERC1155,
        ipfsHashString,
        users,
        operatorFilterRegistryAsOwner,
        operatorFilterSubscription,
        mintAssetERC1155,
      } = await setupOperatorFilter();
      const id = await mintAssetERC1155(
        users[0].address,
        1,
        ipfsHashString,
        10,
        users[0].address
      );

      await users[0].assetERC1155.setApprovalForAllWithOutFilter(
        mockMarketPlace3.address,
        true
      );
      await mockMarketPlace3.transferTokenForERC1155(
        assetERC1155.address,
        users[0].address,
        users[1].address,
        id,
        2,
        '0x'
      );

      expect(await assetERC1155.balanceOf(users[1].address, id)).to.be.equal(2);

      const mockMarketPlace3CodeHash = await operatorFilterRegistryAsOwner.codeHashOf(
        mockMarketPlace3.address
      );
      await operatorFilterRegistryAsOwner.updateCodeHash(
        operatorFilterSubscription.address,
        mockMarketPlace3CodeHash,
        true
      );

      await expect(
        mockMarketPlace3.transferTokenForERC1155(
          assetERC1155.address,
          users[0].address,
          users[1].address,
          id,
          2,
          '0x'
        )
      ).to.be.revertedWith('Codehash is filtered');
    });

    it('it should not be able to transfer through blacklisted market places after they are removed from blacklist', async function () {
      const {
        mockMarketPlace1,
        assetERC1155,
        ipfsHashString,
        users,
        operatorFilterRegistryAsOwner,
        operatorFilterSubscription,
        mintAssetERC1155,
      } = await setupOperatorFilter();
      const mockMarketPlace1CodeHash = await operatorFilterRegistryAsOwner.codeHashOf(
        mockMarketPlace1.address
      );
      const id = await mintAssetERC1155(
        users[0].address,
        1,
        ipfsHashString,
        10,
        users[0].address
      );

      await users[0].assetERC1155.setApprovalForAllWithOutFilter(
        mockMarketPlace1.address,
        true
      );

      await expect(
        mockMarketPlace1.transferTokenForERC1155(
          assetERC1155.address,
          users[0].address,
          users[1].address,
          id,
          2,
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
      await mockMarketPlace1.transferTokenForERC1155(
        assetERC1155.address,
        users[0].address,
        users[1].address,
        id,
        2,
        '0x'
      );

      expect(await assetERC1155.balanceOf(users[1].address, id)).to.be.equal(2);
    });

    it('it should not be able to batch transfer through blacklisted market places', async function () {
      const {
        mockMarketPlace1,
        assetERC1155,
        ipfsHashString,
        users,
        mintAssetERC1155,
      } = await setupOperatorFilter();
      const id1 = await mintAssetERC1155(
        users[0].address,
        1,
        ipfsHashString,
        10,
        users[0].address
      );
      const id2 = await mintAssetERC1155(
        users[0].address,
        2,
        ipfsHashString,
        10,
        users[0].address
      );

      await users[0].assetERC1155.setApprovalForAllWithOutFilter(
        mockMarketPlace1.address,
        true
      );
      await expect(
        mockMarketPlace1.batchTransferTokenERC1155(
          assetERC1155.address,
          users[0].address,
          users[1].address,
          [id1, id2],
          [1, 1],
          '0x'
        )
      ).to.be.revertedWith('Address is filtered');
    });

    it('it should be able to batch transfer through blacklisted market places', async function () {
      const {
        mockMarketPlace3,
        assetERC1155,
        ipfsHashString,
        users,
        mintAssetERC1155,
      } = await setupOperatorFilter();
      const id1 = await mintAssetERC1155(
        users[0].address,
        1,
        ipfsHashString,
        10,
        users[0].address
      );
      const id2 = await mintAssetERC1155(
        users[0].address,
        2,
        ipfsHashString,
        10,
        users[0].address
      );

      await users[0].assetERC1155.setApprovalForAllWithOutFilter(
        mockMarketPlace3.address,
        true
      );

      await mockMarketPlace3.batchTransferTokenERC1155(
        assetERC1155.address,
        users[0].address,
        users[1].address,
        [id1, id2],
        [10, 10],
        '0x'
      );

      expect(await assetERC1155.balanceOf(users[1].address, id1)).to.be.equal(
        10
      );

      expect(await assetERC1155.balanceOf(users[1].address, id2)).to.be.equal(
        10
      );
    });

    it('it should be not be able to batch transfer through market places after they are blacklisted', async function () {
      const {
        mockMarketPlace3,
        assetERC1155,
        ipfsHashString,
        users,
        operatorFilterRegistryAsOwner,
        operatorFilterSubscription,
        mintAssetERC1155,
      } = await setupOperatorFilter();
      const id1 = await mintAssetERC1155(
        users[0].address,
        1,
        ipfsHashString,
        10,
        users[0].address
      );
      const id2 = await mintAssetERC1155(
        users[0].address,
        2,
        ipfsHashString,
        10,
        users[0].address
      );

      await users[0].assetERC1155.setApprovalForAllWithOutFilter(
        mockMarketPlace3.address,
        true
      );

      await mockMarketPlace3.batchTransferTokenERC1155(
        assetERC1155.address,
        users[0].address,
        users[1].address,
        [id1, id2],
        [5, 5],
        '0x'
      );

      expect(await assetERC1155.balanceOf(users[1].address, id1)).to.be.equal(
        5
      );

      expect(await assetERC1155.balanceOf(users[1].address, id2)).to.be.equal(
        5
      );

      await operatorFilterRegistryAsOwner.updateOperator(
        operatorFilterSubscription.address,
        mockMarketPlace3.address,
        true
      );

      await expect(
        mockMarketPlace3.batchTransferTokenERC1155(
          assetERC1155.address,
          users[0].address,
          users[1].address,
          [id1, id2],
          [5, 5],
          '0x'
        )
      ).to.be.revertedWith('Address is filtered');
    });

    it('it should be not be able to batch transfer through market places after their codeHash is blackListed', async function () {
      const {
        mockMarketPlace3,
        assetERC1155,
        ipfsHashString,
        users,
        operatorFilterRegistryAsOwner,
        operatorFilterSubscription,
        mintAssetERC1155,
      } = await setupOperatorFilter();
      const id1 = await mintAssetERC1155(
        users[0].address,
        1,
        ipfsHashString,
        10,
        users[0].address
      );
      const id2 = await mintAssetERC1155(
        users[0].address,
        2,
        ipfsHashString,
        10,
        users[0].address
      );

      await users[0].assetERC1155.setApprovalForAllWithOutFilter(
        mockMarketPlace3.address,
        true
      );

      await mockMarketPlace3.batchTransferTokenERC1155(
        assetERC1155.address,
        users[0].address,
        users[1].address,
        [id1, id2],
        [5, 5],
        '0x'
      );

      expect(await assetERC1155.balanceOf(users[1].address, id1)).to.be.equal(
        5
      );

      expect(await assetERC1155.balanceOf(users[1].address, id2)).to.be.equal(
        5
      );

      const mockMarketPlace3CodeHash = await operatorFilterRegistryAsOwner.codeHashOf(
        mockMarketPlace3.address
      );

      await operatorFilterRegistryAsOwner.updateCodeHash(
        operatorFilterSubscription.address,
        mockMarketPlace3CodeHash,
        true
      );

      await expect(
        mockMarketPlace3.batchTransferTokenERC1155(
          assetERC1155.address,
          users[0].address,
          users[1].address,
          [id1, id2],
          [5, 5],
          '0x'
        )
      ).to.be.revertedWith('Codehash is filtered');
    });

    it('it should not be able to batch transfer through blacklisted market places after they are removed from blacklist', async function () {
      const {
        mockMarketPlace1,
        assetERC1155,
        ipfsHashString,
        users,
        operatorFilterRegistryAsOwner,
        operatorFilterSubscription,
        mintAssetERC1155,
      } = await setupOperatorFilter();
      const mockMarketPlace1CodeHash = await operatorFilterRegistryAsOwner.codeHashOf(
        mockMarketPlace1.address
      );
      const id1 = await mintAssetERC1155(
        users[0].address,
        1,
        ipfsHashString,
        10,
        users[0].address
      );

      const id2 = await mintAssetERC1155(
        users[0].address,
        2,
        ipfsHashString,
        10,
        users[0].address
      );

      await users[0].assetERC1155.setApprovalForAllWithOutFilter(
        mockMarketPlace1.address,
        true
      );
      await expect(
        mockMarketPlace1.batchTransferTokenERC1155(
          assetERC1155.address,
          users[0].address,
          users[1].address,
          [id1, id2],
          [5, 5],
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
      await mockMarketPlace1.batchTransferTokenERC1155(
        assetERC1155.address,
        users[0].address,
        users[1].address,
        [id1, id2],
        [5, 5],
        '0x'
      );

      expect(await assetERC1155.balanceOf(users[1].address, id1)).to.be.equal(
        5
      );

      expect(await assetERC1155.balanceOf(users[1].address, id2)).to.be.equal(
        5
      );
    });
  });
});
