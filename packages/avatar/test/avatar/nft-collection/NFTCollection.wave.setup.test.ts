import {expect} from 'chai';

import {loadFixture} from '@nomicfoundation/hardhat-network-helpers';
import {setupNFTCollectionContract} from './NFTCollection.fixtures';

describe('NFTCollection wave setup', function () {
  describe('setupWave', function () {
    it('owner should be able to setupWave', async function () {
      const {collectionContractAsOwner: contract, nftCollectionAdmin} =
        await loadFixture(setupNFTCollectionContract);
      await expect(contract.setupWave(10, 1, 2))
        .to.emit(contract, 'WaveSetup')
        .withArgs(nftCollectionAdmin, 10, 1, 2, 0);
      expect(await contract.waveMaxTokensOverall(0)).to.be.eq(10);
      expect(await contract.waveMaxTokensPerWallet(0)).to.be.eq(1);
      expect(await contract.waveSingleTokenPrice(0)).to.be.eq(2);
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

    it('should fail to setup a wave when waveMaxTokensOverall excess maxSupply-totalSupply', async function () {
      const {
        collectionContractAsOwner: contract,
        randomWallet2,
        maxSupply,
      } = await loadFixture(setupNFTCollectionContract);
      await contract.setupWave(1, 1, 2);
      await contract.batchMint(0, [[randomWallet2, 1]]);
      await expect(contract.setupWave(maxSupply, 1, 2))
        .to.revertedWithCustomError(contract, 'InvalidWaveData')
        .withArgs(maxSupply, 1);
    });

    it('should fail to setup a wave when waveMaxTokensPerWallet excess maxTokensPerWallet', async function () {
      const {
        collectionContractAsOwner: contract,
        maxSupply,
        maxTokensPerWallet,
      } = await loadFixture(setupNFTCollectionContract);
      await expect(contract.setupWave(maxSupply, maxTokensPerWallet + 1, 2))
        .to.revertedWithCustomError(
          contract,
          'WaveMaxTokensHigherThanGlobalMax'
        )
        .withArgs(maxTokensPerWallet + 1, maxTokensPerWallet);
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

  describe('cancel', function () {
    it('owner should be able to cancel a wave', async function () {
      const {collectionContractAsOwner: contract, randomWallet} =
        await loadFixture(setupNFTCollectionContract);
      await contract.setupWave(10, 1, 0);
      expect(await contract.isMintAllowed(0, randomWallet, 1)).to.be.true;
      await contract.cancelWave(0);
      expect(await contract.isMintAllowed(0, randomWallet, 1)).to.be.false;
    });

    it('should fail to cancel a wave that is not configured', async function () {
      const {collectionContractAsOwner: contract} = await loadFixture(
        setupNFTCollectionContract
      );
      await expect(contract.cancelWave(0)).to.revertedWithCustomError(
        contract,
        'ContractNotConfigured'
      );
      await expect(contract.cancelWave(10)).to.revertedWithCustomError(
        contract,
        'ContractNotConfigured'
      );
    });

    it('other should fail to cancel a wave', async function () {
      const {collectionContractAsRandomWallet: contract, randomWallet} =
        await loadFixture(setupNFTCollectionContract);
      await expect(contract.cancelWave(0))
        .to.revertedWithCustomError(contract, 'OwnableUnauthorizedAccount')
        .withArgs(randomWallet);
    });
  });

  it('should not be able to mint on a wave that is not configured', async function () {
    const {collectionContractAsOwner: contract, randomWallet} =
      await loadFixture(setupNFTCollectionContract);
    expect(await contract.isMintAllowed(0, randomWallet, 10)).to.be.false;
  });

  it('index should be incremented, total minted should be set to zero on wave setup', async function () {
    const {
      collectionContractAsOwner: contract,
      nftCollectionAdmin,
      randomWallet,
      mintSign,
      sandContract,
      waveMaxTokensOverall,
      waveMaxTokensPerWallet,
    } = await loadFixture(setupNFTCollectionContract);
    expect(await contract.waveCount()).to.be.eq(0);
    await expect(
      contract.setupWave(waveMaxTokensOverall, waveMaxTokensPerWallet, 0)
    )
      .to.emit(contract, 'WaveSetup')
      .withArgs(
        nftCollectionAdmin,
        waveMaxTokensOverall,
        waveMaxTokensPerWallet,
        0,
        0
      );
    expect(await contract.waveTotalMinted(0)).to.be.eq(
      0,
      'Wave total minted not 0'
    );
    expect(await contract.waveCount()).to.be.eq(1, 'Wave count not 1');
    await contract.batchMint(0, [
      [randomWallet, 5],
      [randomWallet, 1],
    ]);
    await sandContract.mint(
      contract,
      randomWallet,
      2,
      222,
      await mintSign(randomWallet, 222)
    );
    expect(await contract.waveTotalMinted(0)).to.be.eq(2);
    expect(await contract.waveTotalMinted(2n ** 256n - 1n)).to.be.eq(2);
    expect(await contract.waveTotalMinted(1)).to.be.eq(2);
    expect(await contract.waveTotalMinted(5)).to.be.eq(2);

    expect(await contract.waveCount()).to.be.eq(1);
    await expect(contract.setupWave(10, 1, 2))
      .to.emit(contract, 'WaveSetup')
      .withArgs(nftCollectionAdmin, 10, 1, 2, 1);
    expect(await contract.waveTotalMinted(0)).to.be.eq(2);
    expect(await contract.waveTotalMinted(5)).to.be.eq(0);
    expect(await contract.waveTotalMinted(1)).to.be.eq(0);

    expect(await contract.waveTotalMinted(2n ** 256n - 1n)).to.be.eq(0);
    expect(await contract.waveTotalMinted(2)).to.be.eq(0);
    expect(await contract.waveCount()).to.be.eq(2);
  });
});
