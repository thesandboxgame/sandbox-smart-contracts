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

  describe('setMarketingMint', function () {
    it('owner should be able to setMarketingMint', async function () {
      const {
        collectionContractAsOwner,
        nftCollectionAdmin,
        maxMarketingTokens,
      } = await loadFixture(setupNFTCollectionContract);
      await expect(collectionContractAsOwner.setMarketingMint())
        .to.emit(collectionContractAsOwner, 'WaveSetup')
        .withArgs(
          nftCollectionAdmin,
          maxMarketingTokens,
          maxMarketingTokens,
          0,
          0,
          0
        );
      expect(await collectionContractAsOwner.waveMaxTokensOverall()).to.be.eq(
        maxMarketingTokens
      );
      expect(await collectionContractAsOwner.waveMaxTokensPerWallet()).to.be.eq(
        maxMarketingTokens
      );
      expect(await collectionContractAsOwner.price(1)).to.be.eq(0);
    });

    it('other should fail to setMarketingMint', async function () {
      const {collectionContractAsRandomWallet} = await loadFixture(
        setupNFTCollectionContract
      );
      await expect(
        collectionContractAsRandomWallet.setMarketingMint()
      ).to.revertedWith('Ownable: caller is not the owner');
    });
  });

  describe('setAllowListMint', function () {
    it('owner should be able to setAllowListMint', async function () {
      const {
        collectionContractAsOwner,
        nftCollectionAdmin,
        maxSupply,
        maxAllowListTokensPerWallet,
        mintPrice,
      } = await loadFixture(setupNFTCollectionContract);
      await expect(collectionContractAsOwner.setAllowListMint())
        .to.emit(collectionContractAsOwner, 'WaveSetup')
        .withArgs(
          nftCollectionAdmin,
          maxSupply,
          maxAllowListTokensPerWallet,
          mintPrice,
          0,
          0
        );
      expect(await collectionContractAsOwner.waveMaxTokensOverall()).to.be.eq(
        maxSupply
      );
      expect(await collectionContractAsOwner.waveMaxTokensPerWallet()).to.be.eq(
        maxAllowListTokensPerWallet
      );
      expect(await collectionContractAsOwner.price(1)).to.be.eq(mintPrice);
    });

    it('other should fail to setAllowListMint', async function () {
      const {collectionContractAsRandomWallet} = await loadFixture(
        setupNFTCollectionContract
      );
      await expect(
        collectionContractAsRandomWallet.setAllowListMint()
      ).to.revertedWith('Ownable: caller is not the owner');
    });
  });

  describe('setPublicMint', function () {
    it('owner should be able to setPublicMint', async function () {
      const {
        collectionContractAsOwner,
        nftCollectionAdmin,
        maxSupply,
        maxPublicTokensPerWallet,
        mintPrice,
      } = await loadFixture(setupNFTCollectionContract);
      await expect(collectionContractAsOwner.setPublicMint())
        .to.emit(collectionContractAsOwner, 'WaveSetup')
        .withArgs(
          nftCollectionAdmin,
          maxSupply,
          maxPublicTokensPerWallet,
          mintPrice,
          0,
          0
        );
      expect(await collectionContractAsOwner.waveMaxTokensOverall()).to.be.eq(
        maxSupply
      );
      expect(await collectionContractAsOwner.waveMaxTokensPerWallet()).to.be.eq(
        maxPublicTokensPerWallet
      );
      expect(await collectionContractAsOwner.price(1)).to.be.eq(mintPrice);
    });

    it('other should fail to setPublicMint', async function () {
      const {collectionContractAsRandomWallet} = await loadFixture(
        setupNFTCollectionContract
      );
      await expect(
        collectionContractAsRandomWallet.setPublicMint()
      ).to.revertedWith('Ownable: caller is not the owner');
    });
  });

  it('index should be incremented, total minted should be set to zero on wave setup', async function () {
    const {
      collectionContractAsOwner,
      nftCollectionAdmin,
      randomWallet,
      authSign,
      sandContract,
    } = await loadFixture(setupNFTCollectionContract);
    expect(await collectionContractAsOwner.indexWave()).to.be.eq(0);
    await expect(collectionContractAsOwner.setupWave(100, 100, 0))
      .to.emit(collectionContractAsOwner, 'WaveSetup')
      .withArgs(nftCollectionAdmin, 100, 100, 0, 0, 0);
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
