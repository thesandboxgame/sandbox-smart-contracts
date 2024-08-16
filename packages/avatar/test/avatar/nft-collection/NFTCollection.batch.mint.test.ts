import {expect} from 'chai';

import {setupNFTCollectionContract} from './NFTCollection.fixtures';

describe('NFTCollection batch mint', function () {
  it('owner should be able batchMint without paying the price', async function () {
    const {
      collectionContractAsOwner: contract,
      collectionOwner,
      randomWallet,
    } = await setupNFTCollectionContract();
    await contract.setMarketingMint();
    await contract.batchMint([
      [randomWallet, 7],
      [collectionOwner, 5],
    ]);
    const indexWave = await contract.indexWave();
    expect(
      await contract.waveOwnerToClaimedCounts(randomWallet, indexWave - 1n)
    ).to.be.eq(7);
    expect(
      await contract.waveOwnerToClaimedCounts(collectionOwner, indexWave - 1n)
    ).to.be.eq(5);
    expect(await contract.waveTotalMinted()).to.be.eq(12);
    expect(await contract.totalSupply()).to.be.eq(12);
    const transferEvents = await contract.queryFilter('Transfer');
    let i = 0;
    for (; i < 7; i++) {
      const tokenId = transferEvents[i].args.tokenId;
      expect(await contract.ownerOf(tokenId)).to.be.eq(randomWallet);
    }
    for (; i < 5; i++) {
      const tokenId = transferEvents[i].args.tokenId;
      expect(await contract.ownerOf(tokenId)).to.be.eq(collectionOwner);
    }
  });

  it('other should not be able batchMint', async function () {
    const {collectionContractAsRandomWallet: contract, randomWallet} =
      await setupNFTCollectionContract();
    await expect(contract.batchMint([[randomWallet, 1]])).to.revertedWith(
      'Ownable: caller is not the owner'
    );
  });

  it('should not be able to batchMint if no wave was initialized', async function () {
    const {collectionContractAsOwner: contract, randomWallet} =
      await setupNFTCollectionContract();
    await expect(contract.batchMint([[randomWallet, 1]])).to.revertedWith(
      'NFTCollection: contract is not configured'
    );
  });

  describe('should not be able to batchMint with wrong args', function () {
    it('should not be able to batchMint when wallet length is zero', async function () {
      const {collectionContractAsOwner: contract} =
        await setupNFTCollectionContract();
      await contract.setMarketingMint();
      await expect(contract.batchMint([])).to.revertedWith(
        'NFTCollection: wallets length cannot be 0'
      );
    });

    it('should not be able to batchMint when wallet amount is zero', async function () {
      const {collectionContractAsOwner: contract, randomWallet} =
        await setupNFTCollectionContract();
      await contract.setMarketingMint();
      await expect(
        contract.batchMint([
          [randomWallet, 1],
          [randomWallet, 0],
        ])
      ).to.revertedWith('NFTCollection: amount cannot be 0');
    });

    it('should not be able to batchMint over waveMaxTokensOverall', async function () {
      const {
        collectionContractAsOwner: contract,
        randomWallet,
        maxMarketingTokens,
      } = await setupNFTCollectionContract();
      await contract.setMarketingMint();
      await expect(
        contract.batchMint([[randomWallet, maxMarketingTokens + 1]])
      ).to.revertedWith('NFTCollection: wave completed');
    });

    it('should not be able to batchMint over waveMaxTokensPerWallet', async function () {
      const {
        collectionContractAsOwner: contract,
        randomWallet,
        maxMarketingTokens,
        maxPublicTokensPerWallet,
      } = await setupNFTCollectionContract();
      await contract.setupWave(maxMarketingTokens, maxPublicTokensPerWallet, 0);
      await expect(
        contract.batchMint([[randomWallet, maxPublicTokensPerWallet + 1]])
      ).to.revertedWith('NFTCollection: max allowed');
    });

    it('should not be able to batchMint over maxSupply', async function () {
      const {
        collectionContractAsOwner: contract,
        randomWallet,
        maxSupply,
      } = await setupNFTCollectionContract();
      await contract.setupWave(maxSupply, maxSupply, 0);
      await contract.batchMint([[randomWallet, maxSupply]]);
      await contract.setupWave(maxSupply, maxSupply, 0);
      await expect(
        contract.batchMint([[randomWallet, maxSupply]])
      ).to.revertedWith('NFTCollection: max reached');
    });
  });
});
