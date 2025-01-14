import {expect} from 'chai';

import {loadFixture} from '@nomicfoundation/hardhat-network-helpers';
import {ZeroAddress} from 'ethers';
import {setupNFTCollectionContract} from './NFTCollection.fixtures';

describe('NFTCollection mint', function () {
  describe('backward compatible mint', function () {
    it('user should be able to mint with the right signature and payment', async function () {
      const {
        collectionContractAsOwner: contract,
        mintSign,
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
        await mintSign(randomWallet, 222),
      ]);
      expect(await sandContract.balanceOf(treasury)).to.be.eq(0);
      expect(await sandContract.balanceOf(randomWallet)).to.be.eq(price);
      expect(await contract.isMintAllowed(0, randomWallet, amount)).to.be.true;
      await sandContract
        .connect(randomWallet)
        .approveAndCall(contract, price, encodedData);
      expect(await sandContract.balanceOf(treasury)).to.be.eq(price);
      expect(await sandContract.balanceOf(randomWallet)).to.be.eq(0);
      expect(await contract.getSignatureType(222)).to.be.eq(1);
      const transferEvents = await contract.queryFilter('Transfer');
      for (let i = 0; i < transferEvents.length; i++) {
        const tokenId = transferEvents[i].args.tokenId;
        expect(await contract.ownerOf(tokenId)).to.be.eq(randomWallet);
      }
      const indexWave = await contract.waveCount();
      expect(
        await contract.waveOwnerToClaimedCounts(indexWave - 1n, randomWallet)
      ).to.be.eq(2);
      expect(await contract.waveTotalMinted(indexWave - 1n)).to.be.eq(2);
      expect(await contract.totalSupply()).to.be.eq(2);
    });

    it('should not be able to mint over waveMaxTokensPerWallet', async function () {
      const {
        collectionContractAsOwner: contract,
        mintSign,
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
          await mintSign(randomWallet, 222)
        )
      )
        .to.revertedWithCustomError(contract, 'CannotMint')
        .withArgs(randomWallet, waveMaxTokensPerWallet + 1);
    });

    it('should not be able to mint over waveMaxTokensOverall', async function () {
      const {
        collectionContractAsOwner: contract,
        mintSign,
        sandContract,
        randomWallet,
        randomWallet2,
        waveMaxTokensOverall,
      } = await loadFixture(setupNFTCollectionContract);
      await contract.setupWave(
        waveMaxTokensOverall,
        waveMaxTokensOverall - 1,
        0
      );
      await sandContract.mint(
        contract,
        randomWallet,
        waveMaxTokensOverall - 1,
        222,
        await mintSign(randomWallet, 222)
      );
      await expect(
        sandContract.mint(
          contract,
          randomWallet2,
          waveMaxTokensOverall - 1,
          223,
          await mintSign(randomWallet2, 223)
        )
      )
        .to.revertedWithCustomError(contract, 'CannotMint')
        .withArgs(randomWallet2, waveMaxTokensOverall - 1);
    });

    it('should not be able to mint over maxSupply', async function () {
      const {
        collectionContractAsOwner: contract,
        mintSign,
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
        await mintSign(randomWallet, 222)
      );
      await contract.setupWave(maxSupply, maxSupply, 0);
      await expect(
        sandContract.mint(
          contract,
          randomWallet,
          maxSupply,
          223,
          await mintSign(randomWallet, 223)
        )
      )
        .to.revertedWithCustomError(contract, 'CannotMint')
        .withArgs(randomWallet, maxSupply);
    });

    it('should not be able to mint without enough balance', async function () {
      const {
        collectionContractAsOwner: contract,
        mintSign,
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
          await mintSign(randomWallet, 222)
        )
      ).to.revertedWith('ERC20: insufficient allowance');
      const encodedData = contract.interface.encodeFunctionData('mint', [
        await randomWallet.getAddress(),
        1,
        222,
        await mintSign(randomWallet, 222),
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
          mintSign,
        } = await loadFixture(setupNFTCollectionContract);
        await collectionContractAsOwner.setupWave(10, 1, 0);
        await expect(
          sandContract.mint(
            contract,
            ZeroAddress,
            1,
            222,
            await mintSign(ZeroAddress, 222)
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
          mintSign,
        } = await loadFixture(setupNFTCollectionContract);
        await collectionContractAsOwner.setupWave(10, 1, 0);
        await expect(
          sandContract.mint(
            contract,
            randomWallet,
            0,
            222,
            await mintSign(randomWallet, 222)
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
          mintSign,
        } = await loadFixture(setupNFTCollectionContract);
        await collectionContractAsOwner.setupWave(10, 1, 2);
        await expect(
          sandContract.mint(
            contract,
            randomWallet,
            1,
            1,
            await mintSign(randomWallet, 222, randomWallet)
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
          mintSign,
        } = await loadFixture(setupNFTCollectionContract);
        await collectionContractAsOwner.setupWave(10, 1, 0);
        const signature = await mintSign(randomWallet, 222);
        await sandContract.mint(contract, randomWallet, 1, 222, signature);
        await expect(
          sandContract.mint(contract, randomWallet, 1, 222, signature)
        )
          .to.revertedWithCustomError(contract, 'InvalidSignature')
          .withArgs(222);
      });
    });
  });

  describe('wave mint', function () {
    it('user should be able to waveMint with the right signature and payment', async function () {
      const {
        collectionContractAsOwner: contract,
        waveMintSign,
        sandContract,
        randomWallet,
        treasury,
        maxSupply,
      } = await loadFixture(setupNFTCollectionContract);
      const unitPrice = 10;
      await sandContract.donateTo(randomWallet, unitPrice * 5);
      // Setup two waves
      await contract.setupWave(maxSupply, maxSupply, unitPrice);
      await contract.setupWave(maxSupply, maxSupply, unitPrice);
      expect(await sandContract.balanceOf(treasury)).to.be.eq(0);
      expect(await sandContract.balanceOf(randomWallet)).to.be.eq(
        unitPrice * 5
      );

      // buy 2 from first wave
      const encodedData0 = contract.interface.encodeFunctionData('waveMint', [
        await randomWallet.getAddress(),
        2,
        0,
        222,
        await waveMintSign(randomWallet, 2, 0, 222),
      ]);
      // buy 3 from second wave
      const encodedData1 = contract.interface.encodeFunctionData('waveMint', [
        await randomWallet.getAddress(),
        3,
        1,
        223,
        await waveMintSign(randomWallet, 3, 1, 223),
      ]);

      await sandContract
        .connect(randomWallet)
        .approveAndCall(contract, unitPrice * 2, encodedData0);
      await sandContract
        .connect(randomWallet)
        .approveAndCall(contract, unitPrice * 3, encodedData1);

      expect(await sandContract.balanceOf(treasury)).to.be.eq(unitPrice * 5);
      expect(await sandContract.balanceOf(randomWallet)).to.be.eq(0);
      expect(await contract.waveOwnerToClaimedCounts(0, randomWallet)).to.be.eq(
        2
      );
      expect(await contract.waveTotalMinted(0)).to.be.eq(2);
      expect(await contract.waveOwnerToClaimedCounts(1, randomWallet)).to.be.eq(
        3
      );
      expect(await contract.waveTotalMinted(1)).to.be.eq(3);
      expect(await contract.totalSupply()).to.be.eq(5);

      expect(await contract.waveOwnerToClaimedCounts(0, randomWallet)).to.be.eq(
        2
      );
      expect(await contract.waveOwnerToClaimedCounts(1, randomWallet)).to.be.eq(
        3
      );

      expect(await contract.getSignatureType(222)).to.be.eq(4);
      expect(await contract.getSignatureType(223)).to.be.eq(4);
    });
    it('should emit WaveMint event when waveMint is called', async function () {
      const {
        collectionContractAsOwner: contract,
        waveMintSign,
        sandContract,
        randomWallet,
        maxSupply,
      } = await loadFixture(setupNFTCollectionContract);
      const unitPrice = 10;
      await sandContract.donateTo(randomWallet, unitPrice * 5);
      await contract.setupWave(maxSupply, maxSupply, unitPrice);

      expect(await sandContract.balanceOf(randomWallet)).to.be.eq(
        unitPrice * 5
      );
      const encodedData = contract.interface.encodeFunctionData('waveMint', [
        await randomWallet.getAddress(),
        1,
        0,
        222,
        await waveMintSign(randomWallet, 1, 0, 222),
      ]);

      await sandContract
        .connect(randomWallet)
        .approveAndCall(contract, unitPrice, encodedData);

      const waveMintEvents = await contract.queryFilter(
        contract.filters.WaveMint()
      );

      const walletTotalMinted = await contract.waveOwnerToClaimedCounts(
        0,
        randomWallet
      );
      const waveTotalMinted = await contract.waveTotalMinted(0);

      expect(waveMintEvents).to.have.lengthOf(1);
      expect(waveMintEvents[0].args.tokenId).to.be.eq(1);
      expect(waveMintEvents[0].args.wallet).to.be.eq(randomWallet);
      expect(waveMintEvents[0].args.waveIndex).to.be.eq(0);
      expect(waveMintEvents[0].args.walletMintCount).to.be.eq(
        walletTotalMinted
      );
      expect(waveMintEvents[0].args.waveTotalMinted).to.be.eq(waveTotalMinted);
    });

    it('should emit WaveMint event when mint is called', async function () {
      const {
        collectionContractAsOwner: contract,
        mintSign,
        sandContract,
        randomWallet,
        maxSupply,
      } = await loadFixture(setupNFTCollectionContract);
      const unitPrice = 10;
      await sandContract.donateTo(randomWallet, unitPrice * 5);
      await contract.setupWave(maxSupply, maxSupply, unitPrice);

      const encodedData = contract.interface.encodeFunctionData('mint', [
        await randomWallet.getAddress(),
        1,
        222,
        await mintSign(randomWallet, 222),
      ]);
      await sandContract
        .connect(randomWallet)
        .approveAndCall(contract, unitPrice, encodedData);

      const mintEvents = await contract.queryFilter(
        contract.filters.WaveMint()
      );

      expect(mintEvents).to.have.lengthOf(1);
      expect(mintEvents[0].args.tokenId).to.be.eq(1);
      expect(mintEvents[0].args.wallet).to.be.eq(randomWallet);
      expect(mintEvents[0].args.waveIndex).to.be.eq(0);
      expect(mintEvents[0].args.walletMintCount).to.be.eq(1);
      expect(mintEvents[0].args.waveTotalMinted).to.be.eq(1);
    });

    describe('wrong args', function () {
      it('should not be able to waveMint if no wave was initialized', async function () {
        const {collectionContractAsRandomWallet: contract, randomWallet} =
          await loadFixture(setupNFTCollectionContract);
        await expect(
          contract.waveMint(randomWallet, 1, 0, 1, '0x')
        ).to.revertedWithCustomError(contract, 'ContractNotConfigured');
      });

      it('should not be able to waveMint when the caller is not allowed to execute mint', async function () {
        const {
          collectionContractAsOwner,
          collectionContractAsRandomWallet: contract,
          randomWallet,
        } = await loadFixture(setupNFTCollectionContract);

        await collectionContractAsOwner.setupWave(10, 1, 2);
        await expect(contract.waveMint(randomWallet, 1, 0, 1, '0x'))
          .to.revertedWithCustomError(contract, 'ERC721InvalidSender')
          .withArgs(randomWallet);
      });

      it('should not be able to waveMint when wallet address is zero', async function () {
        const {
          collectionContractAsOwner,
          collectionContractAsRandomWallet: contract,
          sandContract,
          waveMintSign,
        } = await loadFixture(setupNFTCollectionContract);
        await collectionContractAsOwner.setupWave(10, 1, 0);
        await expect(
          sandContract.waveMint(
            contract,
            ZeroAddress,
            1,
            0,
            222,
            await waveMintSign(ZeroAddress, 1, 0, 222)
          )
        )
          .to.revertedWithCustomError(contract, 'ERC721InvalidReceiver')
          .withArgs(ZeroAddress);
      });

      it('should not be able to waveMint when amount is zero', async function () {
        const {
          collectionContractAsOwner,
          collectionContractAsRandomWallet: contract,
          sandContract,
          randomWallet,
          waveMintSign,
        } = await loadFixture(setupNFTCollectionContract);
        await collectionContractAsOwner.setupWave(10, 1, 0);
        await expect(
          sandContract.waveMint(
            contract,
            randomWallet,
            0,
            0,
            222,
            await waveMintSign(randomWallet, 0, 0, 222)
          )
        )
          .to.revertedWithCustomError(contract, 'CannotMint')
          .withArgs(randomWallet, 0);
      });
    });

    describe('signature issues', function () {
      it('should not be able to waveMint when with an invalid signature', async function () {
        const {
          collectionContractAsOwner,
          collectionContractAsRandomWallet: contract,
          sandContract,
          randomWallet,
        } = await loadFixture(setupNFTCollectionContract);
        await collectionContractAsOwner.setupWave(10, 1, 2);
        await expect(
          sandContract.waveMint(contract, randomWallet, 1, 0, 1, '0x')
        )
          .to.revertedWithCustomError(contract, 'ECDSAInvalidSignatureLength')
          .withArgs(0);
      });

      it('should not be able to waveMint when with a wrong signature (signed by wrong address)', async function () {
        const {
          collectionContractAsOwner,
          collectionContractAsRandomWallet: contract,
          sandContract,
          randomWallet,
          mintSign,
        } = await loadFixture(setupNFTCollectionContract);
        await collectionContractAsOwner.setupWave(10, 1, 2);
        await expect(
          sandContract.waveMint(
            contract,
            randomWallet,
            1,
            0,
            1,
            await mintSign(randomWallet, 222, randomWallet)
          )
        )
          .to.revertedWithCustomError(contract, 'InvalidSignature')
          .withArgs(1);
      });

      it('should not be able to waveMint when the signature is used twice', async function () {
        const {
          collectionContractAsOwner,
          collectionContractAsRandomWallet: contract,
          sandContract,
          randomWallet,
          waveMintSign,
        } = await loadFixture(setupNFTCollectionContract);
        await collectionContractAsOwner.setupWave(10, 1, 0);
        const signature = await waveMintSign(randomWallet, 1, 0, 222);
        await sandContract.waveMint(
          contract,
          randomWallet,
          1,
          0,
          222,
          signature
        );
        await expect(
          sandContract.waveMint(contract, randomWallet, 1, 0, 222, signature)
        )
          .to.revertedWithCustomError(contract, 'InvalidSignature')
          .withArgs(222);
      });
    });
  });
});
