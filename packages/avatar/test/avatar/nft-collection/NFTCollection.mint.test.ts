import {expect} from 'chai';

import {setupNFTCollectionContract} from './NFTCollection.fixtures';
import {ZeroAddress} from 'ethers';
import {loadFixture} from '@nomicfoundation/hardhat-network-helpers';

describe('NFTCollection mint', function () {
  it('user should be able to mint with the right signature and payment', async function () {
    const {
      collectionContractAsOwner: contract,
      authSign,
      sandContract,
      randomWallet,
      treasury,
      maxSupply,
    } = await loadFixture(setupNFTCollectionContract);
    const amount = 2;
    const unitPrice = 10;
    const price = amount * unitPrice;
    await sandContract.donateTo(randomWallet, price);
    await contract.setupWave(maxSupply, maxSupply, unitPrice);
    const encodedData = contract.interface.encodeFunctionData('mint', [
      await randomWallet.getAddress(),
      amount,
      222,
      await authSign(randomWallet, 222),
    ]);
    expect(await sandContract.balanceOf(treasury)).to.be.eq(0);
    expect(await sandContract.balanceOf(randomWallet)).to.be.eq(price);
    expect(await contract.isMintAllowed(randomWallet, amount)).to.be.true;
    await sandContract
      .connect(randomWallet)
      .approveAndCall(contract, price, encodedData);
    expect(await sandContract.balanceOf(treasury)).to.be.eq(price);
    expect(await sandContract.balanceOf(randomWallet)).to.be.eq(0);
    expect(await contract.isSignatureUsed(222)).to.be.true;
    const transferEvents = await contract.queryFilter('Transfer');
    for (let i = 0; i < transferEvents.length; i++) {
      const tokenId = transferEvents[i].args.tokenId;
      expect(await contract.ownerOf(tokenId)).to.be.eq(randomWallet);
    }
    const indexWave = await contract.indexWave();
    expect(
      await contract.waveOwnerToClaimedCounts(indexWave - 1n, randomWallet)
    ).to.be.eq(2);
    expect(await contract.waveTotalMinted(indexWave - 1n)).to.be.eq(2);
    expect(await contract.totalSupply()).to.be.eq(2);
  });

  it('should not be able to mint over waveMaxTokensPerWallet', async function () {
    const {
      collectionContractAsOwner: contract,
      authSign,
      sandContract,
      randomWallet,
      waveMaxTokensOverall,
      waveMaxTokensPerWallet,
    } = await loadFixture(setupNFTCollectionContract);
    await contract.setupWave(waveMaxTokensOverall, waveMaxTokensPerWallet, 0);
    await expect(
      sandContract.mint(
        contract,
        randomWallet,
        waveMaxTokensPerWallet + 1,
        222,
        await authSign(randomWallet, 222)
      )
    )
      .to.revertedWithCustomError(contract, 'CannotMint')
      .withArgs(randomWallet, waveMaxTokensPerWallet + 1);
  });

  it('should not be able to mint over waveMaxTokensOverall', async function () {
    const {
      collectionContractAsOwner: contract,
      authSign,
      sandContract,
      randomWallet,
      randomWallet2,
      waveMaxTokensOverall,
    } = await loadFixture(setupNFTCollectionContract);
    await contract.setupWave(waveMaxTokensOverall, waveMaxTokensOverall - 1, 0);
    await sandContract.mint(
      contract,
      randomWallet,
      waveMaxTokensOverall - 1,
      222,
      await authSign(randomWallet, 222)
    );
    await expect(
      sandContract.mint(
        contract,
        randomWallet2,
        waveMaxTokensOverall - 1,
        223,
        await authSign(randomWallet2, 223)
      )
    )
      .to.revertedWithCustomError(contract, 'CannotMint')
      .withArgs(randomWallet2, waveMaxTokensOverall - 1);
  });

  it('should not be able to mint over maxSupply', async function () {
    const {
      collectionContractAsOwner: contract,
      authSign,
      sandContract,
      randomWallet,
      maxSupply,
    } = await loadFixture(setupNFTCollectionContract);
    await contract.setupWave(maxSupply, maxSupply, 0);
    await sandContract.mint(
      contract,
      randomWallet,
      maxSupply,
      222,
      await authSign(randomWallet, 222)
    );
    await contract.setupWave(maxSupply, maxSupply, 0);
    await expect(
      sandContract.mint(
        contract,
        randomWallet,
        maxSupply,
        223,
        await authSign(randomWallet, 223)
      )
    )
      .to.revertedWithCustomError(contract, 'CannotMint')
      .withArgs(randomWallet, maxSupply);
  });

  it('should not be able to mint without enough balance', async function () {
    const {
      collectionContractAsOwner: contract,
      authSign,
      sandContract,
      randomWallet,
      maxSupply,
    } = await loadFixture(setupNFTCollectionContract);
    const price = 10;
    await contract.setupWave(maxSupply, maxSupply, price);
    await expect(
      sandContract.mint(
        contract,
        randomWallet,
        maxSupply,
        222,
        await authSign(randomWallet, 222)
      )
    ).to.revertedWith('ERC20: insufficient allowance');
    const encodedData = contract.interface.encodeFunctionData('mint', [
      await randomWallet.getAddress(),
      1,
      222,
      await authSign(randomWallet, 222),
    ]);
    await expect(
      sandContract
        .connect(randomWallet)
        .approveAndCall(contract, price, encodedData)
    ).to.revertedWith('ERC20: transfer amount exceeds balance');
  });

  describe('wrong args', function () {
    it('should not be able to mint if no wave was initialized', async function () {
      const {collectionContractAsRandomWallet: contract, randomWallet} =
        await loadFixture(setupNFTCollectionContract);
      await expect(
        contract.mint(randomWallet, 1, 1, '0x')
      ).to.revertedWithCustomError(contract, 'ContractNotConfigured');
    });

    it('should not be able to mint when the caller is not allowed to execute mint', async function () {
      const {
        collectionContractAsOwner,
        collectionContractAsRandomWallet: contract,
        randomWallet,
      } = await loadFixture(setupNFTCollectionContract);

      await collectionContractAsOwner.setupWave(10, 1, 2);
      await expect(contract.mint(randomWallet, 1, 1, '0x'))
        .to.revertedWithCustomError(contract, 'ERC721InvalidSender')
        .withArgs(randomWallet);
    });

    it('should not be able to mint when wallet address is zero', async function () {
      const {
        collectionContractAsOwner,
        collectionContractAsRandomWallet: contract,
        sandContract,
        authSign,
      } = await loadFixture(setupNFTCollectionContract);
      await collectionContractAsOwner.setupWave(10, 1, 0);
      await expect(
        sandContract.mint(
          contract,
          ZeroAddress,
          1,
          222,
          await authSign(ZeroAddress, 222)
        )
      )
        .to.revertedWithCustomError(contract, 'ERC721InvalidReceiver')
        .withArgs(ZeroAddress);
    });

    it('should not be able to mint when amount is zero', async function () {
      const {
        collectionContractAsOwner,
        collectionContractAsRandomWallet: contract,
        sandContract,
        randomWallet,
        authSign,
      } = await loadFixture(setupNFTCollectionContract);
      await collectionContractAsOwner.setupWave(10, 1, 0);
      await expect(
        sandContract.mint(
          contract,
          randomWallet,
          0,
          222,
          await authSign(randomWallet, 222)
        )
      )
        .to.revertedWithCustomError(contract, 'CannotMint')
        .withArgs(randomWallet, 0);
    });
  });

  describe('signature issues', function () {
    it('should not be able to mint when with an invalid signature', async function () {
      const {
        collectionContractAsOwner,
        collectionContractAsRandomWallet: contract,
        sandContract,
        randomWallet,
      } = await loadFixture(setupNFTCollectionContract);
      await collectionContractAsOwner.setupWave(10, 1, 2);
      await expect(sandContract.mint(contract, randomWallet, 1, 1, '0x'))
        .to.revertedWithCustomError(contract, 'ECDSAInvalidSignatureLength')
        .withArgs(0);
    });

    it('should not be able to mint when with a wrong signature (signed by wrong address)', async function () {
      const {
        collectionContractAsOwner,
        collectionContractAsRandomWallet: contract,
        sandContract,
        randomWallet,
        authSign,
      } = await loadFixture(setupNFTCollectionContract);
      await collectionContractAsOwner.setupWave(10, 1, 2);
      await expect(
        sandContract.mint(
          contract,
          randomWallet,
          1,
          1,
          await authSign(randomWallet, 222, randomWallet)
        )
      )
        .to.revertedWithCustomError(contract, 'InvalidSignature')
        .withArgs(1);
    });

    it('should not be able to mint when the signature is used twice', async function () {
      const {
        collectionContractAsOwner,
        collectionContractAsRandomWallet: contract,
        sandContract,
        randomWallet,
        authSign,
      } = await loadFixture(setupNFTCollectionContract);
      await collectionContractAsOwner.setupWave(10, 1, 0);
      const signature = await authSign(randomWallet, 222);
      await sandContract.mint(contract, randomWallet, 1, 222, signature);
      await expect(sandContract.mint(contract, randomWallet, 1, 222, signature))
        .to.revertedWithCustomError(contract, 'InvalidSignature')
        .withArgs(222);
    });
  });
});
