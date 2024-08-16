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
    const {collectionContractAsRandomWallet, randomWallet} = await loadFixture(
      setupNFTCollectionContract
    );
    await expect(
      collectionContractAsRandomWallet.setOperatorRegistry(randomWallet)
    ).to.revertedWith('Ownable: caller is not the owner');
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
        false,
        true
      );
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
    //  safeTransferFrom -> onlyAllowedOperator
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
  // setApprovalForAll, approve-> onlyAllowedOperatorApproval
});
