import {expect} from 'chai';

import {setupNFTCollectionContract} from './NFTCollection.fixtures';
import {loadFixture} from '@nomicfoundation/hardhat-network-helpers';

describe('NFTCollection wave setup', function () {
  describe('setupWave', function () {
    it('owner should be able to setupWave', async function () {
      const {collectionContractAsOwner: contract, nftCollectionAdmin} =
        await loadFixture(setupNFTCollectionContract);
      await expect(contract.setupWave(10, 1, 2))
        .to.emit(contract, 'WaveSetup')
        .withArgs(nftCollectionAdmin, 10, 1, 2, 0, 0);
      expect(await contract.waveMaxTokensOverall()).to.be.eq(10);
      expect(await contract.waveMaxTokensPerWallet()).to.be.eq(1);
      expect(await contract.price(1)).to.be.eq(2);
    });

    it('other should fail to setupWave', async function () {
      const {collectionContractAsRandomWallet: contract, randomWallet} =
        await loadFixture(setupNFTCollectionContract);
      await expect(contract.setupWave(10, 1, 2))
        .to.revertedWithCustomError(contract, 'OwnableUnauthorizedAccount')
        .withArgs(randomWallet);
    });

    it('should fail to setup a wave when waveMaxTokensOverall excess maxSupply', async function () {
      const {collectionContractAsOwner: contract, maxSupply} =
        await loadFixture(setupNFTCollectionContract);
      await expect(contract.setupWave(maxSupply + 1, 1, 2))
        .to.revertedWithCustomError(contract, 'InvalidWaveData')
        .withArgs(maxSupply + 1, 1);
    });

    it('should fail to setup a wave when waveMaxTokensOverall is zero', async function () {
      const {collectionContractAsOwner: contract} = await loadFixture(
        setupNFTCollectionContract
      );
      await expect(contract.setupWave(0, 1, 2))
        .to.revertedWithCustomError(contract, 'InvalidWaveData')
        .withArgs(0, 1);
    });

    it('should fail to setup a wave when waveMaxTokensPerWallet is zero', async function () {
      const {collectionContractAsOwner: contract} = await loadFixture(
        setupNFTCollectionContract
      );
      await expect(contract.setupWave(10, 0, 2))
        .to.revertedWithCustomError(contract, 'InvalidWaveData')
        .withArgs(10, 0);
    });

    it('should fail to setup a wave when waveMaxTokensPerWallet is gt waveMaxTokensOverall', async function () {
      const {collectionContractAsOwner: contract} = await loadFixture(
        setupNFTCollectionContract
      );
      await expect(contract.setupWave(1, 10, 2))
        .to.revertedWithCustomError(contract, 'InvalidWaveData')
        .withArgs(1, 10);
    });
  });

  it('index should be incremented, total minted should be set to zero on wave setup', async function () {
    const {
      collectionContractAsOwner: contract,
      nftCollectionAdmin,
      randomWallet,
      authSign,
      sandContract,
      waveMaxTokensOverall,
      waveMaxTokensPerWallet,
    } = await loadFixture(setupNFTCollectionContract);
    expect(await contract.indexWave()).to.be.eq(0);
    await expect(
      contract.setupWave(waveMaxTokensOverall, waveMaxTokensPerWallet, 0)
    )
      .to.emit(contract, 'WaveSetup')
      .withArgs(
        nftCollectionAdmin,
        waveMaxTokensOverall,
        waveMaxTokensPerWallet,
        0,
        0,
        0
      );
    expect(await contract.waveTotalMinted()).to.be.eq(0);
    expect(await contract.indexWave()).to.be.eq(1);
    await contract.batchMint([
      [randomWallet, 5],
      [randomWallet, 1],
    ]);
    await sandContract.mint(
      contract,
      randomWallet,
      2,
      222,
      await authSign(randomWallet, 222)
    );
    expect(await contract.waveTotalMinted()).to.be.eq(5 + 1 + 2);
    expect(await contract.indexWave()).to.be.eq(1);
    await expect(contract.setupWave(10, 1, 2))
      .to.emit(contract, 'WaveSetup')
      .withArgs(nftCollectionAdmin, 10, 1, 2, 5 + 1 + 2, 1);
    expect(await contract.waveTotalMinted()).to.be.eq(0);
    expect(await contract.indexWave()).to.be.eq(2);
  });
});
