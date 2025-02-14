import {expect} from 'chai';

import {setupNFTCollectionContract} from './NFTCollection.fixtures';
import {loadFixture} from '@nomicfoundation/hardhat-network-helpers';

describe('NFTCollection burn', function () {
  it('owner should be able to enable/disable burning', async function () {
    const {collectionContractAsOwner: contract, nftCollectionAdmin} =
      await loadFixture(setupNFTCollectionContract);

    expect(await contract.isBurnEnabled()).to.be.false;
    await expect(contract.disableBurning()).to.revertedWithCustomError(
      contract,
      'ExpectedBurn'
    );

    await expect(contract.enableBurning())
      .to.emit(contract, 'TokenBurningEnabled')
      .withArgs(nftCollectionAdmin);
    expect(await contract.isBurnEnabled()).to.be.true;

    await expect(contract.enableBurning()).to.revertedWithCustomError(
      contract,
      'EnforcedBurn'
    );

    await expect(contract.disableBurning())
      .to.emit(contract, 'TokenBurningDisabled')
      .withArgs(nftCollectionAdmin);
    expect(await contract.isBurnEnabled()).to.be.false;
  });

  it('other should fail to enable/disable burning', async function () {
    const {collectionContractAsRandomWallet: contract, randomWallet} =
      await loadFixture(setupNFTCollectionContract);
    await expect(contract.enableBurning())
      .to.revertedWithCustomError(contract, 'OwnableUnauthorizedAccount')
      .withArgs(randomWallet);
    await expect(contract.disableBurning()).to.revertedWithCustomError(
      contract,
      'OwnableUnauthorizedAccount'
    );
  });

  it('owner of the token should be able burn a token', async function () {
    const {
      collectionContractAsOwner: contract,
      randomWallet,
      collectionContractAsRandomWallet,
      setupDefaultWave,
    } = await loadFixture(setupNFTCollectionContract);
    await setupDefaultWave(20);

    // skip 5 ids
    await contract.batchMint(0, [[randomWallet, 5]]);

    // enable burning
    await expect(contract.burn(1)).to.revertedWithCustomError(
      contract,
      'ExpectedBurn'
    );
    await contract.enableBurning();

    // mint 5
    await contract.batchMint(0, [[randomWallet, 5]]);
    const transferEvents = await contract.queryFilter('Transfer');
    for (let i = 0; i < transferEvents.length; i++) {
      const tokenId = transferEvents[i].args.tokenId;
      // burn
      await expect(collectionContractAsRandomWallet.burn(tokenId))
        .to.emit(contract, 'TokenBurned')
        .withArgs(randomWallet, tokenId, randomWallet);
    }
  });

  it('approved of the token should be able burn a token', async function () {
    const {
      collectionContractAsOwner: contract,
      randomWallet,
      randomWallet2,
      collectionContractAsRandomWallet,
      collectionContractAsRandomWallet2,
      setupDefaultWave,
    } = await loadFixture(setupNFTCollectionContract);
    await setupDefaultWave(20);

    // enable burning
    await expect(contract.burn(1)).to.revertedWithCustomError(
      contract,
      'ExpectedBurn'
    );
    await contract.enableBurning();

    // mint 5
    await contract.batchMint(0, [[randomWallet2, 5]]);

    const transferEvents = await contract.queryFilter('Transfer');
    for (let i = 0; i < transferEvents.length; i++) {
      const tokenId = transferEvents[i].args.tokenId;
      await collectionContractAsRandomWallet2.approve(randomWallet, tokenId);
      // burn
      await expect(collectionContractAsRandomWallet.burn(tokenId))
        .to.emit(contract, 'TokenBurned')
        .withArgs(randomWallet, tokenId, randomWallet2);
    }
  });

  it('other should fail to burn a token', async function () {
    const {
      collectionContractAsOwner: contract,
      randomWallet,
      randomWallet2,
      collectionContractAsRandomWallet2,
      setupDefaultWave,
    } = await loadFixture(setupNFTCollectionContract);
    await setupDefaultWave(20);
    await contract.enableBurning();

    // mint 5
    await contract.batchMint(0, [[randomWallet, 5]]);

    const transferEvents = await contract.queryFilter('Transfer');
    for (let i = 0; i < transferEvents.length; i++) {
      const tokenId = transferEvents[i].args.tokenId;
      // burn
      await expect(collectionContractAsRandomWallet2.burn(tokenId))
        .to.revertedWithCustomError(
          collectionContractAsRandomWallet2,
          'ERC721InsufficientApproval'
        )
        .withArgs(randomWallet2, tokenId);
    }
  });
});
