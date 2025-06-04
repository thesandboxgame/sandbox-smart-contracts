import {loadFixture} from '@nomicfoundation/hardhat-network-helpers';
import {expect} from 'chai';
import {ZeroAddress} from 'ethers';
import {ethers} from 'hardhat';
import {NFTCollection, PurchaseWrapper} from '../../../typechain-types';
import {setupNFTCollectionContract} from './NFTCollection.fixtures';

describe('PurchaseWrapper', function () {
  async function setupPurchaseWrapperFixture() {
    const nftCollectionFixture = await setupNFTCollectionContract();
    const PurchaseWrapperFactory = await ethers.getContractFactory(
      'PurchaseWrapper'
    );
    const sandContractAddress =
      await nftCollectionFixture.sandContract.getAddress();
    const deployerAddress = await nftCollectionFixture.deployer.getAddress();
    const collectionContractAddress =
      await nftCollectionFixture.collectionContract.getAddress();

    const purchaseWrapper = await PurchaseWrapperFactory.connect(
      nftCollectionFixture.deployer
    ).deploy(deployerAddress, sandContractAddress); // Pass initialOwner

    return {
      ...nftCollectionFixture,
      purchaseWrapper,
      purchaseWrapperAddress: await purchaseWrapper.getAddress(),
      collectionContractAddress,
      purchaseWrapperAsDeployer: purchaseWrapper.connect(
        nftCollectionFixture.deployer
      ),
      purchaseWrapperAsUserA: purchaseWrapper.connect(
        nftCollectionFixture.randomWallet
      ),
      purchaseWrapperAsUserB: purchaseWrapper.connect(
        nftCollectionFixture.randomWallet2
      ),
    };
  }

  describe('Deployment', function () {
    it('should set the right owner', async function () {
      const {purchaseWrapper, deployer} = await loadFixture(
        setupPurchaseWrapperFixture
      );
      expect(await purchaseWrapper.owner()).to.equal(
        await deployer.getAddress()
      );
    });

    it('should set the right SAND token address', async function () {
      const {purchaseWrapper, sandContract} = await loadFixture(
        setupPurchaseWrapperFixture
      );
      expect(await purchaseWrapper.sandToken()).to.equal(
        await sandContract.getAddress()
      );
    });

    it('should fail if SAND token address is zero', async function () {
      const {deployer} = await loadFixture(setupPurchaseWrapperFixture);
      const deployerAddress = await deployer.getAddress();
      const PurchaseWrapperFactory = await ethers.getContractFactory(
        'PurchaseWrapper'
      );
      await expect(
        PurchaseWrapperFactory.connect(deployer).deploy(
          deployerAddress,
          ZeroAddress
        )
      ).to.be.revertedWithCustomError(
        PurchaseWrapperFactory,
        'PurchaseWrapper__SandTokenAddressCannotBeZero'
      );
    });
  });

  describe('confirmPurchase', function () {
    it('should allow user A to initiate purchase, NFT is minted to PurchaseWrapper, then transferred to user A', async function () {
      const {
        collectionContractAsOwner: nftCollection,
        collectionContractAddress,
        waveMintSign,
        sandContract,
        randomWallet: userA,
        purchaseWrapper,
        purchaseWrapperAddress,
        waveMaxTokensOverall,
        waveMaxTokensPerWallet,
      } = await loadFixture(setupPurchaseWrapperFixture);

      const userAAddress = await userA.getAddress();

      const tokenAmount = 1;
      const unitPrice = ethers.parseEther('100');
      const totalPrice = unitPrice * BigInt(tokenAmount);
      const waveIndex = 0;
      const signatureId = 222;
      const randomTempTokenId = 12345;

      await nftCollection.setupWave(
        waveMaxTokensOverall,
        waveMaxTokensPerWallet,
        unitPrice
      );
      await sandContract.donateTo(userAAddress, totalPrice);
      expect(await sandContract.balanceOf(userAAddress)).to.be.eq(totalPrice);

      const signature = await waveMintSign(
        purchaseWrapperAddress, // Mint to purchase wrapper
        tokenAmount,
        waveIndex,
        signatureId
      );

      await sandContract
        .connect(userA)
        .approve(purchaseWrapperAddress, totalPrice);

      const confirmPurchaseTx = purchaseWrapper
        .connect(userA) // User A calls confirmPurchase
        .confirmPurchase(
          userAAddress, // sender is userA, who will receive the NFT
          collectionContractAddress,
          totalPrice,
          waveIndex,
          tokenAmount,
          signatureId,
          randomTempTokenId,
          signature
        );

      await expect(confirmPurchaseTx)
        .to.emit(purchaseWrapper, 'PurchaseConfirmed')
        .withArgs(
          userAAddress,
          collectionContractAddress,
          randomTempTokenId,
          totalPrice
        );

      const receipt = await (await confirmPurchaseTx).wait();
      if (!receipt) throw new Error('Transaction receipt not found');

      let mintedTokenId: bigint | undefined;
      for (const log of receipt.logs) {
        try {
          const parsedLog = purchaseWrapper.interface.parseLog(log);
          if (parsedLog && parsedLog.name === 'NftReceivedAndForwarded') {
            mintedTokenId = parsedLog.args.nftTokenId;
            expect(parsedLog.args.localTokenId).to.equal(randomTempTokenId);
            expect(parsedLog.args.nftCollection).to.equal(
              collectionContractAddress
            );
            expect(parsedLog.args.originalSender).to.equal(userAAddress);
            break;
          }
        } catch (e) {
          // Likely a log from another contract
        }
      }
      expect(mintedTokenId).to.not.be.undefined;
      if (mintedTokenId === undefined)
        throw new Error('Minted token ID not found');

      expect(await nftCollection.ownerOf(mintedTokenId)).to.be.eq(userAAddress);
      expect(await nftCollection.waveTotalMinted(waveIndex)).to.be.eq(
        tokenAmount
      );
      expect(await nftCollection.totalSupply()).to.be.eq(tokenAmount);

      expect(await sandContract.balanceOf(userAAddress)).to.be.eq(0);
      expect(await sandContract.balanceOf(purchaseWrapperAddress)).to.be.eq(0);
    });

    it('should revert if sender address is zero', async function () {
      const {
        collectionContractAddress,
        waveMintSign,
        sandContract,
        purchaseWrapper,
        purchaseWrapperAddress,
        randomWallet: userA,
      } = await loadFixture(setupPurchaseWrapperFixture);

      const tokenAmount = 1;
      const unitPrice = ethers.parseEther('100');
      const totalPrice = unitPrice * BigInt(tokenAmount);
      const waveIndex = 0;
      const signatureId = 1;
      const randomTempTokenId = 1;
      const userAAddress = await userA.getAddress();

      await sandContract.donateTo(userAAddress, totalPrice);
      await sandContract
        .connect(userA)
        .approve(purchaseWrapperAddress, totalPrice);

      const signature = await waveMintSign(
        purchaseWrapperAddress,
        tokenAmount,
        waveIndex,
        signatureId
      );

      await expect(
        purchaseWrapper.connect(userA).confirmPurchase(
          ZeroAddress, // sender
          collectionContractAddress,
          totalPrice,
          waveIndex,
          tokenAmount,
          signatureId,
          randomTempTokenId,
          signature
        )
      ).to.be.revertedWithCustomError(
        purchaseWrapper,
        'PurchaseWrapper__SenderAddressCannotBeZero'
      );
    });

    it('should revert if NFT Collection address is zero', async function () {
      const {
        waveMintSign,
        sandContract,
        purchaseWrapper,
        purchaseWrapperAddress,
        randomWallet: userA,
      } = await loadFixture(setupPurchaseWrapperFixture);

      const tokenAmount = 1;
      const unitPrice = ethers.parseEther('100');
      const totalPrice = unitPrice * BigInt(tokenAmount);
      const waveIndex = 0;
      const signatureId = 1;
      const randomTempTokenId = 1;
      const userAAddress = await userA.getAddress();

      await sandContract.donateTo(userAAddress, totalPrice);
      await sandContract
        .connect(userA)
        .approve(purchaseWrapperAddress, totalPrice);

      const signature = await waveMintSign(
        purchaseWrapperAddress,
        tokenAmount,
        waveIndex,
        signatureId
      );

      await expect(
        purchaseWrapper.connect(userA).confirmPurchase(
          userAAddress,
          ZeroAddress, // nftCollection
          totalPrice,
          waveIndex,
          tokenAmount,
          signatureId,
          randomTempTokenId,
          signature
        )
      ).to.be.revertedWithCustomError(
        purchaseWrapper,
        'PurchaseWrapper__NftCollectionAddressCannotBeZero'
      );
    });

    it('should revert if local token ID is already in use', async function () {
      const {
        collectionContractAsOwner: nftCollection,
        collectionContractAddress,
        waveMintSign,
        sandContract,
        randomWallet: userA,
        purchaseWrapper,
        purchaseWrapperAddress,
        waveMaxTokensOverall,
        waveMaxTokensPerWallet,
      } = await loadFixture(setupPurchaseWrapperFixture);

      const userAAddress = await userA.getAddress();
      const tokenAmount = 1;
      const unitPrice = ethers.parseEther('100');
      const totalPrice = unitPrice * BigInt(tokenAmount);
      const waveIndex = 0;
      const signatureId = 1;
      const randomTempTokenId = 123; // Will be used twice

      await nftCollection.setupWave(
        waveMaxTokensOverall,
        waveMaxTokensPerWallet,
        unitPrice
      );
      await sandContract.donateTo(userAAddress, totalPrice * BigInt(2)); // Enough for two
      await sandContract
        .connect(userA)
        .approve(purchaseWrapperAddress, totalPrice * BigInt(2));

      const signature = await waveMintSign(
        purchaseWrapperAddress,
        tokenAmount,
        waveIndex,
        signatureId
      );

      // First purchase
      await purchaseWrapper.connect(userA).confirmPurchase(
        userAAddress,
        collectionContractAddress,
        totalPrice,
        waveIndex,
        tokenAmount,
        signatureId,
        randomTempTokenId, // Use the ID
        signature
      );

      // Second purchase attempt with the same local token ID
      const signature2 = await waveMintSign(
        purchaseWrapperAddress,
        tokenAmount,
        waveIndex,
        signatureId + 1
      ); // new sig ID
      await expect(
        purchaseWrapper.connect(userA).confirmPurchase(
          userAAddress,
          collectionContractAddress,
          totalPrice,
          waveIndex,
          tokenAmount,
          signatureId + 1,
          randomTempTokenId, // Reuse the ID
          signature2
        )
      )
        .to.be.revertedWithCustomError(
          purchaseWrapper,
          'PurchaseWrapper__LocalTokenIdAlreadyInUse'
        )
        .withArgs(randomTempTokenId);
    });

    it('should refund sender if approveAndCall on SAND fails (e.g. NFT collection reverts)', async function () {
      const {
        collectionContractAddress,
        sandContract,
        randomWallet: userA,
        purchaseWrapper,
        purchaseWrapperAddress,
      } = await loadFixture(setupPurchaseWrapperFixture);

      const userAAddress = await userA.getAddress();
      const tokenAmount = 1;
      const unitPrice = ethers.parseEther('100');
      const totalPrice = unitPrice * BigInt(tokenAmount);
      const waveIndex = 0;
      const signatureId = 123;
      const randomTempTokenId = 789;

      await sandContract.donateTo(userAAddress, totalPrice);
      expect(await sandContract.balanceOf(userAAddress)).to.equal(totalPrice);
      await sandContract
        .connect(userA)
        .approve(purchaseWrapperAddress, totalPrice);

      const invalidSignature = '0xdeadbeef';

      const balanceBefore = await sandContract.balanceOf(userAAddress);

      await expect(
        purchaseWrapper
          .connect(userA)
          .confirmPurchase(
            userAAddress,
            collectionContractAddress,
            totalPrice,
            waveIndex,
            tokenAmount,
            signatureId,
            randomTempTokenId,
            invalidSignature
          )
      ).to.be.revertedWithCustomError(
        purchaseWrapper,
        'PurchaseWrapper__NftPurchaseFailedViaApproveAndCall'
      );

      expect(await sandContract.balanceOf(userAAddress)).to.equal(
        balanceBefore
      );
      expect(await sandContract.balanceOf(purchaseWrapperAddress)).to.equal(0);
    });
  });

  describe('transferFrom (and safeTransferFrom variants)', function () {
    let userAAddress: string;
    let userBAddress: string;
    let purchaseWrapperAsUserB: PurchaseWrapper;
    let nftCollection: NFTCollection;
    let purchaseWrapperAsUserA: PurchaseWrapper;
    let mintedTokenId: bigint;
    const randomTempTokenId = 98765;

    beforeEach(async function () {
      const {
        collectionContract,
        collectionContractAddress,
        collectionContractAsOwner,
        purchaseWrapper,
        purchaseWrapperAddress,
        randomWallet: userA,
        randomWallet2: userB,
        waveMaxTokensOverall,
        waveMaxTokensPerWallet,
        sandContract,
        waveMintSign,
      } = await loadFixture(setupPurchaseWrapperFixture);
      userAAddress = await userA.getAddress();
      userBAddress = await userB.getAddress();

      await collectionContract
        .connect(userA)
        .setApprovalForAll(purchaseWrapperAddress, true);

      purchaseWrapperAsUserA = purchaseWrapper.connect(userA);
      purchaseWrapperAsUserB = purchaseWrapper.connect(userB);
      nftCollection = collectionContract;

      const tokenAmount = 1;
      const unitPrice = ethers.parseEther('100');
      const totalPrice = unitPrice * BigInt(tokenAmount);
      const waveIndex = 0;
      const signatureId = 333;

      await collectionContractAsOwner.setupWave(
        waveMaxTokensOverall,
        waveMaxTokensPerWallet,
        unitPrice
      );

      await sandContract.donateTo(userAAddress, totalPrice);
      await sandContract
        .connect(userA)
        .approve(purchaseWrapperAddress, totalPrice);

      const signature = await waveMintSign(
        purchaseWrapperAddress,
        tokenAmount,
        waveIndex,
        signatureId
      );

      const tx = await purchaseWrapper
        .connect(userA)
        .confirmPurchase(
          userAAddress,
          collectionContractAddress,
          totalPrice,
          waveIndex,
          tokenAmount,
          signatureId,
          randomTempTokenId,
          signature
        );
      const receipt = await tx.wait();
      if (!receipt) throw new Error('Transaction receipt not found for setup');
      for (const log of receipt.logs) {
        try {
          const parsedLog = purchaseWrapper.interface.parseLog(log);
          if (parsedLog && parsedLog.name === 'NftReceivedAndForwarded') {
            mintedTokenId = parsedLog.args.nftTokenId;
            break;
          }
        } catch (e) {
          // Likely a log from another contract
        }
      }
      if (mintedTokenId === undefined)
        throw new Error('Minted token ID not found in setup');
      expect(await collectionContract.ownerOf(mintedTokenId)).to.equal(
        userAAddress
      );
    });

    it('should allow original recipient (userA) to transfer NFT to userB via wrapper', async function () {
      await expect(
        purchaseWrapperAsUserA.transferFrom(
          userAAddress,
          userBAddress,
          randomTempTokenId
        )
      )
        .to.emit(purchaseWrapperAsUserA, 'NftTransferredViaWrapper')
        .withArgs(randomTempTokenId, userAAddress, userBAddress, mintedTokenId);

      expect(await nftCollection.ownerOf(mintedTokenId)).to.equal(userBAddress);
    });

    it('should allow original recipient (userA) to safeTransfer NFT to userB via wrapper', async function () {
      await expect(
        purchaseWrapperAsUserA['safeTransferFrom(address,address,uint256)'](
          userAAddress,
          userBAddress,
          randomTempTokenId
        )
      )
        .to.emit(purchaseWrapperAsUserA, 'NftTransferredViaWrapper')
        .withArgs(randomTempTokenId, userAAddress, userBAddress, mintedTokenId);
      expect(await nftCollection.ownerOf(mintedTokenId)).to.equal(userBAddress);
    });

    it('should allow original recipient (userA) to safeTransfer NFT with data to userB via wrapper', async function () {
      const data = '0x1234';
      // Note: The actual NFT collection's safeTransferFrom must handle the data or ignore it.
      // The wrapper just passes it along.
      await expect(
        purchaseWrapperAsUserA[
          'safeTransferFrom(address,address,uint256,bytes)'
        ](userAAddress, userBAddress, randomTempTokenId, data)
      )
        .to.emit(purchaseWrapperAsUserA, 'NftTransferredViaWrapper')
        .withArgs(randomTempTokenId, userAAddress, userBAddress, mintedTokenId);

      expect(await nftCollection.ownerOf(mintedTokenId)).to.equal(userBAddress);
    });

    it('should revert transferFrom if to address is zero', async function () {
      await expect(
        purchaseWrapperAsUserA.transferFrom(
          userAAddress,
          ZeroAddress,
          randomTempTokenId
        )
      ).to.be.revertedWithCustomError(
        purchaseWrapperAsUserA,
        'PurchaseWrapper__TransferToZeroAddress'
      );
    });

    it('should revert safeTransferFrom if to address is zero', async function () {
      await expect(
        purchaseWrapperAsUserA['safeTransferFrom(address,address,uint256)'](
          userAAddress,
          ZeroAddress,
          randomTempTokenId
        )
      ).to.be.revertedWithCustomError(
        purchaseWrapperAsUserA,
        'PurchaseWrapper__TransferToZeroAddress'
      );
    });

    it('should revert safeTransferFrom with data if to address is zero', async function () {
      await expect(
        purchaseWrapperAsUserA[
          'safeTransferFrom(address,address,uint256,bytes)'
        ](userAAddress, ZeroAddress, randomTempTokenId, '0x12')
      ).to.be.revertedWithCustomError(
        purchaseWrapperAsUserA,
        'PurchaseWrapper__TransferToZeroAddress'
      );
    });

    it('should revert if localTokenId is invalid/not used', async function () {
      const invalidLocalTokenId = 11111;
      await expect(
        purchaseWrapperAsUserA.transferFrom(
          userAAddress,
          userBAddress,
          invalidLocalTokenId
        )
      )
        .to.be.revertedWithCustomError(
          purchaseWrapperAsUserA,
          'PurchaseWrapper__InvalidLocalTokenIdOrPurchaseNotCompleted'
        )
        .withArgs(invalidLocalTokenId);
    });

    it('should revert if "from" address is not the original recipient', async function () {
      // User B (not original recipient) tries to transfer
      await expect(
        purchaseWrapperAsUserB.transferFrom(
          userAAddress, // from is still userA
          userBAddress,
          randomTempTokenId
        )
      )
        .to.be.revertedWithCustomError(
          purchaseWrapperAsUserB,
          'PurchaseWrapper__CallerMustBeFromAddress'
        )
        .withArgs(userBAddress, userAAddress);

      // Also test if from address itself is wrong
      await expect(
        purchaseWrapperAsUserA.transferFrom(
          userBAddress, // from is userB
          userAAddress,
          randomTempTokenId
        )
      )
        .to.be.revertedWithCustomError(
          purchaseWrapperAsUserA,
          'PurchaseWrapper__FromAddressIsNotOriginalRecipient'
        )
        .withArgs(userBAddress, userAAddress);
    });

    it('should revert if caller (msg.sender) is not the "from" address', async function () {
      // User B tries to initiate a transfer FROM user A
      await expect(
        purchaseWrapperAsUserB.transferFrom(
          userAAddress,
          userBAddress,
          randomTempTokenId
        )
      )
        .to.be.revertedWithCustomError(
          purchaseWrapperAsUserB,
          'PurchaseWrapper__CallerMustBeFromAddress'
        )
        .withArgs(userBAddress, userAAddress);
    });
  });

  describe('recoverSand', function () {
    it('should allow owner to recover SAND tokens', async function () {
      const {
        purchaseWrapperAsDeployer,
        sandContract,
        deployer,
        purchaseWrapperAddress,
        randomWallet,
      } = await loadFixture(setupPurchaseWrapperFixture);
      const recoveryRecipient = randomWallet;
      const recoveryRecipientAddress = await recoveryRecipient.getAddress();
      const amountToSend = ethers.parseEther('50');

      // Send some SAND to the PurchaseWrapper contract directly
      await sandContract
        .connect(deployer)
        .donateTo(purchaseWrapperAddress, amountToSend);
      expect(await sandContract.balanceOf(purchaseWrapperAddress)).to.equal(
        amountToSend
      );

      const initialRecipientBalance = await sandContract.balanceOf(
        recoveryRecipientAddress
      );

      await expect(
        purchaseWrapperAsDeployer.recoverSand(recoveryRecipientAddress)
      )
        .to.emit(sandContract, 'Transfer') // Check for SafeERC20.safeTransfer
        .withArgs(
          purchaseWrapperAddress,
          recoveryRecipientAddress,
          amountToSend
        );

      expect(await sandContract.balanceOf(purchaseWrapperAddress)).to.equal(0);
      expect(await sandContract.balanceOf(recoveryRecipientAddress)).to.equal(
        initialRecipientBalance + amountToSend
      );
    });

    it('should revert recoverSand if called by non-owner', async function () {
      const {purchaseWrapperAsUserA, randomWallet} = await loadFixture(
        setupPurchaseWrapperFixture
      );
      await expect(
        purchaseWrapperAsUserA.recoverSand(await randomWallet.getAddress())
      ).to.be.revertedWithCustomError(
        purchaseWrapperAsUserA,
        'OwnableUnauthorizedAccount'
      );
    });

    it('should revert recoverSand if recipient is zero address', async function () {
      const {purchaseWrapperAsDeployer} = await loadFixture(
        setupPurchaseWrapperFixture
      );
      await expect(
        purchaseWrapperAsDeployer.recoverSand(ZeroAddress)
      ).to.be.revertedWithCustomError(
        purchaseWrapperAsDeployer,
        'PurchaseWrapper__InvalidRecipientAddress'
      );
    });

    it('should revert recoverSand if no SAND tokens to recover', async function () {
      const {
        purchaseWrapperAsDeployer,
        randomWallet,
        purchaseWrapperAddress,
        sandContract,
      } = await loadFixture(setupPurchaseWrapperFixture);
      expect(await sandContract.balanceOf(purchaseWrapperAddress)).to.equal(0); // Ensure no balance
      await expect(
        purchaseWrapperAsDeployer.recoverSand(await randomWallet.getAddress())
      ).to.be.revertedWithCustomError(
        purchaseWrapperAsDeployer,
        'PurchaseWrapper__NoSandTokensToRecover'
      );
    });
  });
});
