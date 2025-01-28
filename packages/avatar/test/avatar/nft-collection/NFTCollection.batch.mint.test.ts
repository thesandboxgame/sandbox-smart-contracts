import {loadFixture} from '@nomicfoundation/hardhat-network-helpers';
import {expect} from 'chai';
import {
  MintDenialReason,
  setupNFTCollectionContract,
} from './NFTCollection.fixtures';

describe('NFTCollection batch mint', function () {
  it('owner should be able batchMint without paying the price and without increasing the waveTotalMinted nor waveOwnerToClaimedCounts', async function () {
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
    ).to.be.eq(0);
    expect(
      await contract.waveOwnerToClaimedCounts(indexWave - 1n, collectionOwner)
    ).to.be.eq(0);
    expect(await contract.waveTotalMinted(indexWave - 1n)).to.be.eq(0);
    expect(await contract.totalSupply()).to.be.eq(12);
    const transferEvents = await contract.queryFilter('Transfer');
    let i = 0;
    for (; i < 7; i++) {
      const tokenId = transferEvents[i].args[2];
      expect(await contract.ownerOf(tokenId)).to.be.eq(randomWallet);
    }
    for (; i < 12; i++) {
      const tokenId = transferEvents[i].args[2];
      expect(await contract.ownerOf(tokenId)).to.be.eq(collectionOwner);
    }
  });

  it('owner should be able to batchMint irrespective of the maxTokensPerWallet', async function () {
    const {
      collectionContractAsOwner: contract,
      randomWallet,
      setupDefaultWave,
      waveMaxTokensOverall,
      maxTokensPerWallet,
    } = await loadFixture(setupNFTCollectionContract);
    await setupDefaultWave(20);
    await contract.setupWave(waveMaxTokensOverall, maxTokensPerWallet, 2);
    await contract.batchMint(0, [[randomWallet, maxTokensPerWallet + 1]]);
  });

  it('should emit WaveMint event when batchMint is called', async function () {
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

    const waveMintEvents = await contract.queryFilter('WaveMint');
    expect(waveMintEvents).to.have.lengthOf(12);
    let i = 0;
    for (; i < 7; i++) {
      const tokenId = waveMintEvents[i].args.tokenId;
      expect(await contract.ownerOf(tokenId)).to.be.eq(randomWallet);
    }
    for (; i < 5; i++) {
      const tokenId = waveMintEvents[i].args.tokenId;
      expect(await contract.ownerOf(tokenId)).to.be.eq(collectionOwner);
    }
  });

  it('owner should be able to batchMint over waveMaxTokensPerWallet', async function () {
    const {
      collectionContractAsOwner: contract,
      waveMaxTokensOverall,
      waveMaxTokensPerWallet,
      randomWallet,
    } = await loadFixture(setupNFTCollectionContract);

    await contract.setupWave(waveMaxTokensOverall, waveMaxTokensPerWallet, 10);
    await expect(
      contract.batchMint(0, [[randomWallet, waveMaxTokensPerWallet + 1]])
    ).to.not.be.reverted;
  });

  it('owner should be able to batchMint over waveMaxTokensOverall', async function () {
    const {
      collectionContractAsOwner: contract,
      randomWallet,
      waveMaxTokensOverall,
      waveMaxTokensPerWallet,
    } = await loadFixture(setupNFTCollectionContract);

    await contract.setupWave(waveMaxTokensOverall, waveMaxTokensPerWallet, 20);
    await expect(
      contract.batchMint(0, [[randomWallet, waveMaxTokensOverall + 1]])
    ).to.not.be.reverted;
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
        .withArgs(MintDenialReason.InvalidAmount, randomWallet, 0, 0);
    });

    it('should not be able to batchMint over maxSupply', async function () {
      const {
        collectionContractAsOwner: contract,
        randomWallet,
        maxSupply,
      } = await loadFixture(setupNFTCollectionContract);
      await contract.setMaxTokensPerWallet(maxSupply);
      await contract.setupWave(maxSupply, maxSupply, 0);
      await contract.setupWave(maxSupply, maxSupply, 0);
      await expect(contract.batchMint(0, [[randomWallet, maxSupply + 1]]))
        .to.revertedWithCustomError(contract, 'CannotMint')
        .withArgs(
          MintDenialReason.InvalidAmount,
          randomWallet,
          maxSupply + 1,
          0
        );
    });
  });
});
