import {expect} from 'chai';

import {setupNFTCollectionContract} from './NFTCollection.fixtures';
import {loadFixture} from '@nomicfoundation/hardhat-network-helpers';
import {ZeroAddress} from 'ethers';

describe('NFTCollection operator registry', function () {
  it('owner should be able to setOperatorRegistry', async function () {
    const {
      collectionContractAsOwner: contract,
      nftCollectionAdmin,
      randomWallet,
    } = await loadFixture(setupNFTCollectionContract);
    expect(await contract.operatorFilterRegistry()).to.be.eq(ZeroAddress);
    await expect(contract.setOperatorRegistry(randomWallet))
      .to.emit(contract, 'OperatorRegistrySet')
      .withArgs(nftCollectionAdmin, ZeroAddress, randomWallet);
    expect(await contract.operatorFilterRegistry()).to.be.eq(randomWallet);
  });

  it('other should fail to setOperatorRegistry', async function () {
    const {collectionContractAsRandomWallet: contract, randomWallet} =
      await loadFixture(setupNFTCollectionContract);
    await expect(contract.setOperatorRegistry(randomWallet))
      .to.revertedWithCustomError(contract, 'OwnableUnauthorizedAccount')
      .withArgs(randomWallet);
  });

  it('owner should be able to register in the registry', async function () {
    const {
      collectionContractAsOwner: contract,
      nftCollectionAdmin,
      mockOperatorFilterRegistry,
    } = await loadFixture(setupNFTCollectionContract);
    await contract.setOperatorRegistry(mockOperatorFilterRegistry);
    await expect(contract.register(ZeroAddress, false))
      .to.emit(contract, 'ContractRegistered')
      .withArgs(
        nftCollectionAdmin,
        mockOperatorFilterRegistry,
        ZeroAddress,
        false
      );
  });

  it('owner should be able to registerAndSubscribe in the registry', async function () {
    const {
      collectionContractAsOwner: contract,
      nftCollectionAdmin,
      randomWallet,
      mockOperatorFilterRegistry,
    } = await loadFixture(setupNFTCollectionContract);
    await contract.setOperatorRegistry(mockOperatorFilterRegistry);
    await expect(contract.register(randomWallet, true))
      .to.emit(contract, 'ContractRegistered')
      .withArgs(
        nftCollectionAdmin,
        mockOperatorFilterRegistry,
        randomWallet,
        true
      );
  });

  it('owner should be able to registerAndCopyEntries in the registry', async function () {
    const {
      collectionContractAsOwner: contract,
      nftCollectionAdmin,
      randomWallet,
      mockOperatorFilterRegistry,
    } = await loadFixture(setupNFTCollectionContract);
    await contract.setOperatorRegistry(mockOperatorFilterRegistry);
    await expect(contract.register(randomWallet, false))
      .to.emit(contract, 'ContractRegistered')
      .withArgs(
        nftCollectionAdmin,
        mockOperatorFilterRegistry,
        randomWallet,
        false
      );
  });

  it('other should fail to register in the registry', async function () {
    const {
      collectionContractAsOwner,
      collectionContractAsRandomWallet: contract,
      randomWallet,
      mockOperatorFilterRegistry,
    } = await loadFixture(setupNFTCollectionContract);
    await collectionContractAsOwner.setOperatorRegistry(
      mockOperatorFilterRegistry
    );
    await expect(contract.register(ZeroAddress, false))
      .to.revertedWithCustomError(contract, 'OwnableUnauthorizedAccount')
      .withArgs(randomWallet);
  });

  it('should fail to call protected methods protected by onlyAllowedOperator when blacklisted in the registry', async function () {
    const {
      collectionContractAsOwner: contract,
      nftCollectionAdmin,
      randomWallet,
      mockOperatorFilterRegistry,
    } = await loadFixture(setupNFTCollectionContract);
    await mockOperatorFilterRegistry.doRevert(true, false);
    await contract.setOperatorRegistry(mockOperatorFilterRegistry);
    await contract.register(ZeroAddress, false);
    await expect(
      contract.safeBatchTransferFrom(ZeroAddress, randomWallet, [], '0x')
    )
      .to.revertedWithCustomError(contract, 'OperatorNotAllowed')
      .withArgs(nftCollectionAdmin);
    await expect(contract.batchTransferFrom(ZeroAddress, randomWallet, []))
      .to.revertedWithCustomError(contract, 'OperatorNotAllowed')
      .withArgs(nftCollectionAdmin);
    await expect(contract.transferFrom(ZeroAddress, randomWallet, 123))
      .to.revertedWithCustomError(contract, 'OperatorNotAllowed')
      .withArgs(nftCollectionAdmin);
    await expect(
      contract['safeTransferFrom(address,address,uint256)'](
        ZeroAddress,
        randomWallet,
        123
      )
    )
      .to.revertedWithCustomError(contract, 'OperatorNotAllowed')
      .withArgs(nftCollectionAdmin);
    await expect(
      contract['safeTransferFrom(address,address,uint256,bytes)'](
        ZeroAddress,
        randomWallet,
        123,
        '0x'
      )
    )
      .to.revertedWithCustomError(contract, 'OperatorNotAllowed')
      .withArgs(nftCollectionAdmin);
  });

  it('should succeed to call protected methods protected by onlyAllowedOperator', async function () {
    const {
      collectionContractAsOwner: contract,
      collectionOwner,
      randomWallet,
      mockOperatorFilterRegistry,
      mint,
    } = await loadFixture(setupNFTCollectionContract);
    await contract.setOperatorRegistry(mockOperatorFilterRegistry);
    await contract.register(ZeroAddress, false);

    await contract.safeBatchTransferFrom(
      collectionOwner,
      randomWallet,
      [],
      '0x'
    );
    await contract.batchTransferFrom(collectionOwner, randomWallet, []);
    await mint(3);
    await contract.transferFrom(collectionOwner, randomWallet, 1);
    await contract['safeTransferFrom(address,address,uint256)'](
      collectionOwner,
      randomWallet,
      2
    );
    await contract['safeTransferFrom(address,address,uint256,bytes)'](
      collectionOwner,
      randomWallet,
      3,
      '0x'
    );
  });

  it('should fail to call protected methods protected by onlyAllowedOperatorApproval when blacklisted in the registry', async function () {
    const {
      collectionContractAsOwner: contract,
      randomWallet,
      mockOperatorFilterRegistry,
    } = await loadFixture(setupNFTCollectionContract);
    await mockOperatorFilterRegistry.doRevert(true, false);
    await contract.setOperatorRegistry(mockOperatorFilterRegistry);
    await contract.register(ZeroAddress, false);
    await expect(contract.setApprovalForAll(randomWallet, true))
      .to.revertedWithCustomError(contract, 'OperatorNotAllowed')
      .withArgs(randomWallet);
    await expect(contract.approve(randomWallet, 123))
      .to.revertedWithCustomError(contract, 'OperatorNotAllowed')
      .withArgs(randomWallet);
  });

  it('should succeed to call protected methods protected by onlyAllowedOperatorApproval', async function () {
    const {
      collectionContractAsOwner: contract,
      randomWallet,
      mockOperatorFilterRegistry,
      mint,
    } = await loadFixture(setupNFTCollectionContract);
    await contract.setOperatorRegistry(mockOperatorFilterRegistry);
    await contract.register(ZeroAddress, false);
    await contract.setApprovalForAll(randomWallet, true);
    await mint(1);
    await contract.approve(randomWallet, 1);
  });

  describe('coverage', function () {
    it('should fail to call a protected method when the registry return false', async function () {
      const {
        collectionContractAsOwner: contract,
        randomWallet,
        mockOperatorFilterRegistry,
      } = await loadFixture(setupNFTCollectionContract);
      await mockOperatorFilterRegistry.doFalse(true);
      await contract.setOperatorRegistry(mockOperatorFilterRegistry);
      await contract.register(ZeroAddress, false);
      await expect(contract.setApprovalForAll(randomWallet, true))
        .to.revertedWithCustomError(contract, 'OperatorNotAllowed')
        .withArgs(randomWallet);
    });

    it('should not register when the registry is not a contract or not set', async function () {
      const {
        collectionContractAsOwner: contract,
        nftCollectionAdmin,
        randomWallet,
      } = await loadFixture(setupNFTCollectionContract);
      await expect(contract.register(ZeroAddress, false))
        .revertedWithCustomError(contract, 'RegistryNotSet')
        .withArgs(nftCollectionAdmin);

      await contract.setOperatorRegistry(randomWallet);
      await expect(contract.register(ZeroAddress, false))
        .revertedWithCustomError(contract, 'RegistryNotSet')
        .withArgs(nftCollectionAdmin);
    });

    it('should not register the same address twice', async function () {
      const {
        collectionContractAsOwner: contract,
        mockOperatorFilterRegistry,
        nftCollectionAdmin,
      } = await loadFixture(setupNFTCollectionContract);
      await contract.setOperatorRegistry(mockOperatorFilterRegistry);
      await contract.register(ZeroAddress, false);
      await expect(contract.register(ZeroAddress, false))
        .revertedWithCustomError(contract, 'AlreadyRegistered')
        .withArgs(nftCollectionAdmin);
    });
  });
});
