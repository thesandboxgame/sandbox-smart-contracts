import {expect} from 'chai';
import {ZeroAddress} from 'ethers';

import {setupNFTCollectionContract} from './NFTCollection.fixtures';
import {loadFixture} from '@nomicfoundation/hardhat-network-helpers';

describe('NFTCollection initialization', function () {
  it('should be able to initialize', async function () {
    const {
      collectionContract,
      deployer,
      nftCollectionAdmin,
      metadataUrl,
      collectionName,
      collectionSymbol,
      treasury,
      raffleSignWallet,
      trustedForwarder,
      sandContract,
      maxSupply,
      mintPrice,
      maxPublicTokensPerWallet,
      maxAllowListTokensPerWallet,
      maxMarketingTokens,
    } = await loadFixture(setupNFTCollectionContract);
    const allowedToExecuteMint = await sandContract.getAddress();
    expect(await collectionContract.owner()).to.be.eq(nftCollectionAdmin);
    expect(await collectionContract.baseTokenURI()).to.be.eq(metadataUrl);
    expect(await collectionContract.name()).to.be.eq(collectionName);
    expect(await collectionContract.symbol()).to.be.eq(collectionSymbol);
    expect(await collectionContract.mintTreasury()).to.be.eq(treasury);
    expect(await collectionContract.signAddress()).to.be.eq(raffleSignWallet);
    expect(await collectionContract.trustedForwarder()).to.be.eq(
      trustedForwarder
    );
    expect(await collectionContract.allowedToExecuteMint()).to.be.eq(
      allowedToExecuteMint
    );
    expect(await collectionContract.mintTreasury()).to.be.eq(treasury);
    expect(await collectionContract.mintTreasury()).to.be.eq(treasury);
    expect(await collectionContract.maxSupply()).to.be.eq(maxSupply);
    expect(await collectionContract.operatorFilterRegistry()).to.be.eq(
      ZeroAddress
    );
    const mintingDefaults = await collectionContract.mintingDefaults();
    expect(mintingDefaults.mintPrice).to.be.eq(mintPrice);
    expect(mintingDefaults.maxPublicTokensPerWallet).to.be.eq(
      maxPublicTokensPerWallet
    );
    expect(mintingDefaults.maxAllowListTokensPerWallet).to.be.eq(
      maxAllowListTokensPerWallet
    );
    expect(mintingDefaults.maxMarketingTokens).to.be.eq(maxMarketingTokens);

    const tx = collectionContract.deploymentTransaction();
    await expect(tx)
      .to.emit(collectionContract, 'OwnershipTransferred')
      .withArgs(ZeroAddress, nftCollectionAdmin);
    await expect(tx)
      .to.emit(collectionContract, 'TrustedForwarderSet')
      .withArgs(deployer, ZeroAddress, trustedForwarder);
    await expect(tx)
      .to.emit(collectionContract, 'DefaultMintingValuesSet')
      .withArgs(
        deployer,
        0,
        mintPrice,
        maxPublicTokensPerWallet,
        maxAllowListTokensPerWallet,
        maxMarketingTokens
      );
    await expect(tx)
      .to.emit(collectionContract, 'ContractInitialized')
      .withArgs(
        metadataUrl,
        collectionName,
        collectionSymbol,
        treasury,
        raffleSignWallet,
        allowedToExecuteMint,
        maxSupply
      );
  });

  it('should fail to initialize when called with wrong args', async function () {
    const {
      deployWithCustomArg,
      mintPrice,
      maxPublicTokensPerWallet,
      maxAllowListTokensPerWallet,
      maxMarketingTokens,
      maxSupply,
    } = await loadFixture(setupNFTCollectionContract);
    await expect(deployWithCustomArg(1, '')).to.revertedWith(
      'NFTCollection: baseURI is not set'
    );
    await expect(deployWithCustomArg(2, '')).to.revertedWith(
      'NFTCollection: name is empty'
    );
    await expect(deployWithCustomArg(3, '')).to.revertedWith(
      'NFTCollection: symbol is empty'
    );
    await expect(deployWithCustomArg(4, ZeroAddress)).to.revertedWith(
      'NFTCollection: treasury is zero address'
    );
    await expect(deployWithCustomArg(5, ZeroAddress)).to.revertedWith(
      'NFTCollection: sign address is zero address'
    );
    await expect(deployWithCustomArg(7, ZeroAddress)).to.revertedWith(
      'NFTCollection: executor address is not a contract'
    );
    await expect(deployWithCustomArg(8, 0)).to.revertedWith(
      'NFTCollection: max supply should be more than 0'
    );
    await expect(
      deployWithCustomArg(9, [
        0, // mintPrice
        maxPublicTokensPerWallet,
        maxAllowListTokensPerWallet,
        maxMarketingTokens,
      ])
    ).to.revertedWith('NFTCollection: public mint price cannot be 0');
    await expect(
      deployWithCustomArg(9, [
        mintPrice,
        maxSupply + 1, // maxPublicTokensPerWallet,
        maxAllowListTokensPerWallet,
        maxMarketingTokens,
      ])
    ).to.revertedWith('NFTCollection: invalid tokens per wallet configuration');
    await expect(
      deployWithCustomArg(9, [
        mintPrice,
        maxPublicTokensPerWallet,
        maxSupply + 1, // maxAllowListTokensPerWallet
        maxMarketingTokens,
      ])
    ).to.revertedWith('NFTCollection: invalid tokens per wallet configuration');
    await expect(
      deployWithCustomArg(9, [
        mintPrice,
        maxPublicTokensPerWallet,
        maxAllowListTokensPerWallet,
        maxSupply + 1, // maxMarketingTokens,
      ])
    ).to.revertedWith('NFTCollection: invalid marketing share');
  });
});
