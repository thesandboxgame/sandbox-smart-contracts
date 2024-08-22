import {expect} from 'chai';

import {setupNFTCollectionContract} from './NFTCollection.fixtures';
import {loadFixture} from '@nomicfoundation/hardhat-network-helpers';

describe('NFTCollection burn', function () {
  it('owner should be able to enable/disable burning', async function () {
    const {collectionContractAsOwner, nftCollectionAdmin} = await loadFixture(
      setupNFTCollectionContract
    );

    expect(await collectionContractAsOwner.isBurnEnabled()).to.be.false;
    await expect(collectionContractAsOwner.disableBurning()).to.revertedWith(
      'Burning already disabled'
    );

    await expect(collectionContractAsOwner.enableBurning())
      .to.emit(collectionContractAsOwner, 'TokenBurningEnabled')
      .withArgs(nftCollectionAdmin);
    expect(await collectionContractAsOwner.isBurnEnabled()).to.be.true;

    await expect(collectionContractAsOwner.enableBurning()).to.revertedWith(
      'Burning already enabled'
    );

    await expect(collectionContractAsOwner.disableBurning())
      .to.emit(collectionContractAsOwner, 'TokenBurningDisabled')
      .withArgs(nftCollectionAdmin);
    expect(await collectionContractAsOwner.isBurnEnabled()).to.be.false;
  });

  it('other should fail to enable/disable burning', async function () {
    const {collectionContractAsRandomWallet} = await loadFixture(
      setupNFTCollectionContract
    );
    await expect(
      collectionContractAsRandomWallet.enableBurning()
    ).to.revertedWith('Ownable: caller is not the owner');
    await expect(
      collectionContractAsRandomWallet.disableBurning()
    ).to.revertedWith('Ownable: caller is not the owner');
  });

  it('owner of the token should be able burn a token', async function () {
    const {
      collectionContractAsOwner,
      randomWallet,
      collectionContractAsRandomWallet,
    } = await loadFixture(setupNFTCollectionContract);
    await collectionContractAsOwner.setupWave(100, 10, 20);

    // skip 5 ids
    await collectionContractAsOwner.batchMint([[randomWallet, 5]]);

    // enable burning
    await expect(collectionContractAsOwner.burn(1)).to.revertedWith(
      'Burning is not enabled'
    );
    await collectionContractAsOwner.enableBurning();

    // mint 5
    await collectionContractAsOwner.batchMint([[randomWallet, 5]]);
    const transferEvents = await collectionContractAsOwner.queryFilter(
      'Transfer'
    );
    for (let i = 0; i < transferEvents.length; i++) {
      const tokenId = transferEvents[i].args.tokenId;
      // burn
      await expect(collectionContractAsRandomWallet.burn(tokenId))
        .to.emit(collectionContractAsOwner, 'TokenBurned')
        .withArgs(randomWallet, tokenId, randomWallet);
      // check
      expect(await collectionContractAsOwner.burner(tokenId)).to.be.eq(
        randomWallet
      );
      expect(await collectionContractAsOwner.burnerOf(tokenId)).to.be.eq(
        randomWallet
      );
      expect(await collectionContractAsOwner.didBurnTokens(randomWallet)).to.be
        .true;
      expect(
        await collectionContractAsOwner.burnedTokensCount(randomWallet)
      ).to.be.eq(i + 1);
      for (let j = 0; j < i; j++) {
        expect(
          await collectionContractAsOwner.burnedTokens(randomWallet, j)
        ).to.be.eq(j + 1);
      }
    }
  });

  it('approved of the token should be able burn a token', async function () {
    const {
      collectionContractAsOwner,
      randomWallet,
      randomWallet2,
      collectionContractAsRandomWallet,
      collectionContractAsRandomWallet2,
    } = await loadFixture(setupNFTCollectionContract);
    await collectionContractAsOwner.setupWave(100, 10, 20);

    // enable burning
    await expect(collectionContractAsOwner.burn(1)).to.revertedWith(
      'Burning is not enabled'
    );
    await collectionContractAsOwner.enableBurning();

    // mint 5
    await collectionContractAsOwner.batchMint([[randomWallet2, 5]]);

    const transferEvents = await collectionContractAsOwner.queryFilter(
      'Transfer'
    );
    for (let i = 0; i < transferEvents.length; i++) {
      const tokenId = transferEvents[i].args.tokenId;
      await collectionContractAsRandomWallet2.approve(randomWallet, tokenId);
      // burn
      await expect(collectionContractAsRandomWallet.burn(tokenId))
        .to.emit(collectionContractAsOwner, 'TokenBurned')
        .withArgs(randomWallet, tokenId, randomWallet2);
      // check
      expect(await collectionContractAsOwner.burner(tokenId)).to.be.eq(
        randomWallet
      );
      expect(await collectionContractAsOwner.burnerOf(tokenId)).to.be.eq(
        randomWallet
      );
      expect(await collectionContractAsOwner.didBurnTokens(randomWallet2)).to.be
        .false;
      expect(
        await collectionContractAsOwner.burnedTokensCount(randomWallet2)
      ).to.be.eq(0);
      expect(await collectionContractAsOwner.didBurnTokens(randomWallet)).to.be
        .true;
      expect(
        await collectionContractAsOwner.burnedTokensCount(randomWallet)
      ).to.be.eq(i + 1);
      for (let j = 0; j < i; j++) {
        expect(
          await collectionContractAsOwner.burnedTokens(randomWallet, j)
        ).to.be.eq(j + 1);
      }
    }
  });

  it('other should fail to burn a token', async function () {
    const {
      collectionContractAsOwner,
      randomWallet,
      collectionContractAsRandomWallet2,
    } = await loadFixture(setupNFTCollectionContract);
    await collectionContractAsOwner.setupWave(100, 10, 20);

    await collectionContractAsOwner.enableBurning();

    // mint 5
    await collectionContractAsOwner.batchMint([[randomWallet, 5]]);

    const transferEvents = await collectionContractAsOwner.queryFilter(
      'Transfer'
    );
    for (let i = 0; i < transferEvents.length; i++) {
      const tokenId = transferEvents[i].args.tokenId;
      // burn
      await expect(
        collectionContractAsRandomWallet2.burn(tokenId)
      ).to.revertedWith('ERC721: caller is not token owner or approved');
    }
  });
});
