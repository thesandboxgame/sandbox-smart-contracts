import {expect} from 'chai';

import {setupNFTCollectionContract} from './NFTCollection.fixtures';
import {ZeroAddress} from 'ethers';

describe('NFTCollection mint', function () {
  it('user should be able to mint with the right signature and payment', async function () {
    const {
      collectionContractAsOwner: contract,
      authSign,
      sandContract,
      randomWallet,
      treasury,
      maxSupply,
    } = await setupNFTCollectionContract();
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
    expect(await contract.checkMintAllowed(randomWallet, amount)).to.be.true;
    await sandContract
      .connect(randomWallet)
      .approveAndCall(contract, price, encodedData);
    expect(await sandContract.balanceOf(treasury)).to.be.eq(price);
    expect(await sandContract.balanceOf(randomWallet)).to.be.eq(0);
    const transferEvents = await contract.queryFilter('Transfer');
    for (let i = 0; i < transferEvents.length; i++) {
      const tokenId = transferEvents[i].args.tokenId;
      expect(await contract.ownerOf(tokenId)).to.be.eq(randomWallet);
    }
    const indexWave = await contract.indexWave();
    expect(
      await contract.waveOwnerToClaimedCounts(randomWallet, indexWave - 1n)
    ).to.be.eq(2);
    expect(await contract.waveTotalMinted()).to.be.eq(2);
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
    } = await setupNFTCollectionContract();
    await contract.setupWave(waveMaxTokensOverall, waveMaxTokensPerWallet, 0);
    await expect(
      sandContract.mint(
        contract,
        randomWallet,
        waveMaxTokensPerWallet + 1,
        222,
        await authSign(randomWallet, 222)
      )
    ).to.revertedWith('NFTCollection: max allowed');
  });

  it('should not be able to mint over waveMaxTokensOverall', async function () {
    const {
      collectionContractAsOwner: contract,
      authSign,
      sandContract,
      randomWallet,
      randomWallet2,
      waveMaxTokensOverall,
    } = await setupNFTCollectionContract();
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
    ).to.revertedWith('NFTCollection: wave completed');
  });

  it('should not be able to mint over maxSupply', async function () {
    const {
      collectionContractAsOwner: contract,
      authSign,
      sandContract,
      randomWallet,
      maxSupply,
    } = await setupNFTCollectionContract();
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
    ).to.revertedWith('NFTCollection: max reached');
  });

  it('should not be able to mint without enough balance', async function () {
    const {
      collectionContractAsOwner: contract,
      authSign,
      sandContract,
      randomWallet,
      maxSupply,
    } = await setupNFTCollectionContract();
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
        await setupNFTCollectionContract();
      await expect(contract.mint(randomWallet, 1, 1, '0x')).to.revertedWith(
        'NFTCollection: contract is not configured'
      );
    });

    it('should not be able to mint when the caller is not allowed to execute mint', async function () {
      const {
        collectionContractAsOwner,
        collectionContractAsRandomWallet: contract,
        randomWallet,
      } = await setupNFTCollectionContract();

      await collectionContractAsOwner.setupWave(10, 1, 2);
      await expect(contract.mint(randomWallet, 1, 1, '0x')).to.revertedWith(
        'NFTCollection: caller is not allowed'
      );
    });

    it('should not be able to mint when wallet address is zero', async function () {
      const {
        collectionContractAsOwner,
        collectionContractAsRandomWallet: contract,
        sandContract,
      } = await setupNFTCollectionContract();
      await collectionContractAsOwner.setupWave(10, 1, 2);
      await expect(
        sandContract.mint(contract, ZeroAddress, 1, 1, '0x')
      ).to.revertedWith('NFTCollection: wallet is zero address');
    });

    it('should not be able to mint when amount is zero', async function () {
      const {
        collectionContractAsOwner,
        collectionContractAsRandomWallet: contract,
        sandContract,
        randomWallet,
      } = await setupNFTCollectionContract();
      await collectionContractAsOwner.setupWave(10, 1, 2);
      await expect(
        sandContract.mint(contract, randomWallet, 0, 1, '0x')
      ).to.revertedWith('NFTCollection: amount cannot be 0');
    });
  });

  describe('signature issues', function () {
    it('should not be able to mint when with an invalid signature', async function () {
      const {
        collectionContractAsOwner,
        collectionContractAsRandomWallet: contract,
        sandContract,
        randomWallet,
      } = await setupNFTCollectionContract();
      await collectionContractAsOwner.setupWave(10, 1, 2);
      await expect(
        sandContract.mint(contract, randomWallet, 1, 1, '0x')
      ).to.revertedWith('ECDSA: invalid signature length');
    });

    it('should not be able to mint when with a wrong signature (signed by wrong address)', async function () {
      const {
        collectionContractAsOwner,
        collectionContractAsRandomWallet: contract,
        sandContract,
        randomWallet,
        authSign,
      } = await setupNFTCollectionContract();
      await collectionContractAsOwner.setupWave(10, 1, 2);
      await expect(
        sandContract.mint(
          contract,
          randomWallet,
          1,
          1,
          await authSign(randomWallet, 222, randomWallet)
        )
      ).to.revertedWith('NFTCollection: signature failed');
    });

    it('should not be able to mint when the signature is used twice', async function () {
      const {
        collectionContractAsOwner,
        collectionContractAsRandomWallet: contract,
        sandContract,
        randomWallet,
        authSign,
      } = await setupNFTCollectionContract();
      await collectionContractAsOwner.setupWave(10, 1, 0);
      const signature = await authSign(randomWallet, 222);
      await sandContract.mint(contract, randomWallet, 1, 222, signature);
      await expect(
        sandContract.mint(contract, randomWallet, 1, 222, signature)
      ).to.revertedWith('NFTCollection: signatureId already used');
    });
  });
});
