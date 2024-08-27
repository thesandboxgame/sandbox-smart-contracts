import {expect} from 'chai';

import {setupNFTCollectionContract} from './NFTCollection.fixtures';
import {loadFixture} from '@nomicfoundation/hardhat-network-helpers';

describe('NFTCollection wave setup', function () {
  describe('setupWave', function () {
    it('owner should be able to setupWave', async function () {
      const {collectionContractAsOwner, nftCollectionAdmin} = await loadFixture(
        setupNFTCollectionContract
      );
      await expect(collectionContractAsOwner.setupWave(10, 1, 2))
        .to.emit(collectionContractAsOwner, 'WaveSetup')
        .withArgs(nftCollectionAdmin, 10, 1, 2, 0, 0);
      expect(await collectionContractAsOwner.waveMaxTokensOverall()).to.be.eq(
        10
      );
      expect(await collectionContractAsOwner.waveMaxTokensPerWallet()).to.be.eq(
        1
      );
      expect(await collectionContractAsOwner.price(1)).to.be.eq(2);
    });

    it('other should fail to setupWave', async function () {
      const {collectionContractAsRandomWallet} = await loadFixture(
        setupNFTCollectionContract
      );
      await expect(
        collectionContractAsRandomWallet.setupWave(10, 1, 2)
      ).to.revertedWith('Ownable: caller is not the owner');
    });

    it('should fail to setup a wave when waveMaxTokensOverall excess maxSupply', async function () {
      const {collectionContractAsOwner, maxSupply} = await loadFixture(
        setupNFTCollectionContract
      );
      await expect(
        collectionContractAsOwner.setupWave(maxSupply + 1, 1, 2)
      ).to.revertedWith('NFTCollection: _waveMaxTokens exceeds maxSupply');
    });

    it('should fail to setup a wave when waveMaxTokensOverall is zero', async function () {
      const {collectionContractAsOwner} = await loadFixture(
        setupNFTCollectionContract
      );
      await expect(
        collectionContractAsOwner.setupWave(0, 1, 2)
      ).to.revertedWith('NFTCollection: max tokens to mint is 0');
    });

    it('should fail to setup a wave when waveMaxTokensPerWallet is zero', async function () {
      const {collectionContractAsOwner} = await loadFixture(
        setupNFTCollectionContract
      );
      await expect(
        collectionContractAsOwner.setupWave(10, 0, 2)
      ).to.revertedWith('NFTCollection: max tokens to mint per wallet is 0');
    });

    it('should fail to setup a wave when waveMaxTokensPerWallet is gt waveMaxTokensOverall', async function () {
      const {collectionContractAsOwner} = await loadFixture(
        setupNFTCollectionContract
      );
      await expect(
        collectionContractAsOwner.setupWave(1, 10, 2)
      ).to.revertedWith('NFTCollection: invalid supply configuration');
    });
  });

  it('index should be incremented, total minted should be set to zero on wave setup', async function () {
    const {
      collectionContractAsOwner,
      nftCollectionAdmin,
      randomWallet,
      authSign,
      sandContract,
      waveMaxTokensOverall,
      waveMaxTokensPerWallet,
    } = await loadFixture(setupNFTCollectionContract);
    expect(await collectionContractAsOwner.indexWave()).to.be.eq(0);
    await expect(
      collectionContractAsOwner.setupWave(
        waveMaxTokensOverall,
        waveMaxTokensPerWallet,
        0
      )
    )
      .to.emit(collectionContractAsOwner, 'WaveSetup')
      .withArgs(
        nftCollectionAdmin,
        waveMaxTokensOverall,
        waveMaxTokensPerWallet,
        0,
        0,
        0
      );
    expect(await collectionContractAsOwner.waveTotalMinted()).to.be.eq(0);
    expect(await collectionContractAsOwner.indexWave()).to.be.eq(1);
    await collectionContractAsOwner.batchMint([
      [randomWallet, 5],
      [randomWallet, 1],
    ]);
    await sandContract.mint(
      collectionContractAsOwner,
      randomWallet,
      2,
      222,
      await authSign(randomWallet, 222)
    );
    expect(await collectionContractAsOwner.waveTotalMinted()).to.be.eq(
      5 + 1 + 2
    );
    expect(await collectionContractAsOwner.indexWave()).to.be.eq(1);
    await expect(collectionContractAsOwner.setupWave(10, 1, 2))
      .to.emit(collectionContractAsOwner, 'WaveSetup')
      .withArgs(nftCollectionAdmin, 10, 1, 2, 5 + 1 + 2, 1);
    expect(await collectionContractAsOwner.waveTotalMinted()).to.be.eq(0);
    expect(await collectionContractAsOwner.indexWave()).to.be.eq(2);
  });
});
