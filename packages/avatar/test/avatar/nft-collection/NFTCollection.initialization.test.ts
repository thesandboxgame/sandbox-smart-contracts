import {expect} from 'chai';
import {ZeroAddress} from 'ethers';

import {setupNFTCollectionContract} from './NFTCollection.fixtures';
import {loadFixture} from '@nomicfoundation/hardhat-network-helpers';
import {upgrades} from 'hardhat';

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
      mint,
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

    const tx = collectionContract.deploymentTransaction();
    await expect(tx)
      .to.emit(collectionContract, 'OwnershipTransferred')
      .withArgs(ZeroAddress, nftCollectionAdmin);
    await expect(tx)
      .to.emit(collectionContract, 'TrustedForwarderSet')
      .withArgs(deployer, ZeroAddress, trustedForwarder);
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
    expect(await collectionContract.totalSupply()).to.be.eq(0);
    await mint(1);
    expect(await collectionContract.totalSupply()).to.be.eq(1);
    expect(await collectionContract.tokenURI(1)).to.be.eq(metadataUrl + '1');
  });

  it('should fail to initialize when called with wrong args', async function () {
    const {NFTCollectionFactory, getCustomArgs} = await loadFixture(
      setupNFTCollectionContract
    );
    const proxy = await upgrades.deployProxy(NFTCollectionFactory, [], {
      initializer: false,
    });
    await expect(proxy.initialize(...getCustomArgs(1, '')))
      .to.revertedWithCustomError(proxy, 'InvalidBaseTokenURI')
      .withArgs('');
    await expect(proxy.initialize(...getCustomArgs(2, '')))
      .to.revertedWithCustomError(proxy, 'InvalidName')
      .withArgs('');
    await expect(proxy.initialize(...getCustomArgs(3, '')))
      .to.revertedWithCustomError(proxy, 'InvalidSymbol')
      .withArgs('');
    await expect(proxy.initialize(...getCustomArgs(4, ZeroAddress)))
      .to.revertedWithCustomError(proxy, 'InvalidTreasury')
      .withArgs(ZeroAddress);
    await expect(proxy.initialize(...getCustomArgs(5, ZeroAddress)))
      .to.revertedWithCustomError(proxy, 'InvalidSignAddress')
      .withArgs(ZeroAddress);
    await expect(proxy.initialize(...getCustomArgs(7, ZeroAddress)))
      .to.revertedWithCustomError(proxy, 'InvalidAllowedToExecuteMint')
      .withArgs(ZeroAddress);
    await expect(proxy.initialize(...getCustomArgs(8, 0)))
      .to.revertedWithCustomError(proxy, 'LowMaxSupply')
      .withArgs(0, 0);
  });

  it('should fail to initialize twice', async function () {
    const {collectionContractAsOwner, initializeArgs} = await loadFixture(
      setupNFTCollectionContract
    );
    await expect(
      collectionContractAsOwner.initialize(...initializeArgs)
    ).to.revertedWithCustomError(
      collectionContractAsOwner,
      'InvalidInitialization'
    );
  });

  it('should fail to call __NFTCollection_init when contract is not initializing', async function () {
    const {nftCollectionMock, initializeArgs} = await loadFixture(
      setupNFTCollectionContract
    );
    await expect(
      nftCollectionMock.NFTCollection_init(...initializeArgs)
    ).to.revertedWithCustomError(nftCollectionMock, 'NotInitializing');
  });
});
