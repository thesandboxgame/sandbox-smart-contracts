import {expect} from 'chai';

import {setupNFTCollectionContract} from './NFTCollection.fixtures';
import {loadFixture} from '@nomicfoundation/hardhat-network-helpers';

describe('NFTCollection batch mint', function () {
  it('owner should be able batchMint without paying the price', async function () {
    const {
      collectionContractAsOwner: contract,
      collectionOwner,
      randomWallet,
      setupDefaultWave,
    } = await loadFixture(setupNFTCollectionContract);
    await setupDefaultWave(20);
    await contract.batchMint(0, [
      [randomWallet, 7],
      [collectionOwner, 5],
    ]);
    const indexWave = await contract.waveCount();
    expect(
      await contract.waveOwnerToClaimedCounts(indexWave - 1n, randomWallet)
    ).to.be.eq(7);
    expect(
      await contract.waveOwnerToClaimedCounts(indexWave - 1n, collectionOwner)
    ).to.be.eq(5);
    expect(await contract.waveTotalMinted(indexWave - 1n)).to.be.eq(12);
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
      await loadFixture(setupNFTCollectionContract);
    await expect(contract.batchMint(0, [[randomWallet, 1]]))
      .to.revertedWithCustomError(contract, 'OwnableUnauthorizedAccount')
      .withArgs(randomWallet);
  });

  it('should not be able to batchMint if no wave was initialized', async function () {
    const {collectionContractAsOwner: contract, randomWallet} =
      await loadFixture(setupNFTCollectionContract);
    await expect(
      contract.batchMint(0, [[randomWallet, 1]])
    ).to.revertedWithCustomError(contract, 'ContractNotConfigured');
  });

  describe('should not be able to batchMint with wrong args', function () {
    it('should not be able to batchMint when wallet length is zero', async function () {
      const {collectionContractAsOwner: contract, setupDefaultWave} =
        await loadFixture(setupNFTCollectionContract);
      await setupDefaultWave(20);
      await expect(contract.batchMint(0, [])).to.revertedWithCustomError(
        contract,
        'InvalidBatchData'
      );
    });

    it('should not be able to batchMint when wallet amount is zero', async function () {
      const {
        collectionContractAsOwner: contract,
        randomWallet,
        setupDefaultWave,
      } = await loadFixture(setupNFTCollectionContract);
      await setupDefaultWave(20);
      await expect(
        contract.batchMint(0, [
          [randomWallet, 1],
          [randomWallet, 0],
        ])
      )
        .to.revertedWithCustomError(contract, 'CannotMint')
        .withArgs(randomWallet, 0);
    });

    it('should not be able to batchMint over waveMaxTokensOverall', async function () {
      const {collectionContractAsOwner: contract, randomWallet} =
        await loadFixture(setupNFTCollectionContract);
      const waveMaxTokensOverall = 100;
      await contract.setupWave(waveMaxTokensOverall, 10, 20);
      await expect(
        contract.batchMint(0, [[randomWallet, waveMaxTokensOverall + 1]])
      )
        .to.revertedWithCustomError(contract, 'CannotMint')
        .withArgs(randomWallet, waveMaxTokensOverall + 1);
    });

    it('should not be able to batchMint over waveMaxTokensPerWallet', async function () {
      const {collectionContractAsOwner: contract, randomWallet} =
        await loadFixture(setupNFTCollectionContract);
      const waveMaxTokensPerWallet = 10;
      await contract.setupWave(100, waveMaxTokensPerWallet, 0);
      await expect(
        contract.batchMint(0, [[randomWallet, waveMaxTokensPerWallet + 1]])
      )
        .to.revertedWithCustomError(contract, 'CannotMint')
        .withArgs(randomWallet, waveMaxTokensPerWallet + 1);
    });

    it('should not be able to batchMint over maxSupply', async function () {
      const {
        collectionContractAsOwner: contract,
        randomWallet,
        maxSupply,
      } = await loadFixture(setupNFTCollectionContract);
      await contract.setupWave(maxSupply, maxSupply, 0);
      await contract.batchMint(0, [[randomWallet, maxSupply]]);
      await contract.setupWave(maxSupply, maxSupply, 0);
      await expect(contract.batchMint(0, [[randomWallet, maxSupply]]))
        .to.revertedWithCustomError(contract, 'CannotMint')
        .withArgs(randomWallet, maxSupply);
    });
  });
});
