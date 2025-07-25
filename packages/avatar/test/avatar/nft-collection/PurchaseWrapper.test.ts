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
    const authorizedCallerAddress =
      await nftCollectionFixture.randomWallet.getAddress();

    const purchaseWrapper = await PurchaseWrapperFactory.connect(
      nftCollectionFixture.deployer
    ).deploy(deployerAddress, sandContractAddress, authorizedCallerAddress); // Pass admin, sandToken, and authorizedCaller

    // Authorize the collection for purchases
    await purchaseWrapper.setNftCollectionAuthorization(
      collectionContractAddress,
      true
    );

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
    it('should set the right admin', async function () {
      const {purchaseWrapper, deployer} = await loadFixture(
        setupPurchaseWrapperFixture
      );
      const DEFAULT_ADMIN_ROLE = ethers.ZeroHash; // DEFAULT_ADMIN_ROLE is 0x00...00
      expect(
        await purchaseWrapper.hasRole(
          DEFAULT_ADMIN_ROLE,
          await deployer.getAddress()
        )
      ).to.be.true;
    });

    it('should set the right authorized caller', async function () {
      const {purchaseWrapper, randomWallet: userA} = await loadFixture(
        setupPurchaseWrapperFixture
      );
      const userAAddress = await userA.getAddress();
      const authorizedCallerRole =
        await purchaseWrapper.AUTHORIZED_CALLER_ROLE();
      expect(await purchaseWrapper.hasRole(authorizedCallerRole, userAAddress))
        .to.be.true;
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
          ZeroAddress,
          deployerAddress
        )
      ).to.be.revertedWithCustomError(
        PurchaseWrapperFactory,
        'PurchaseWrapperSandTokenAddressCannotBeZero'
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

      const sandPrice = ethers.parseEther('100');
      const waveIndex = 0;
      const signatureId = 222;
      const randomTempTokenId = 12345;

      await nftCollection.setupWave(
        waveMaxTokensOverall,
        waveMaxTokensPerWallet,
        sandPrice
      );
      await sandContract.donateTo(userAAddress, sandPrice);
      expect(await sandContract.balanceOf(userAAddress)).to.be.eq(sandPrice);

      const signature = await waveMintSign(
        purchaseWrapperAddress, // Mint to purchase wrapper
        1,
        waveIndex,
        signatureId
      );

      const data = purchaseWrapper.interface.encodeFunctionData(
        'confirmPurchase',
        [
          userAAddress, // sender is userA, who will receive the NFT
          collectionContractAddress,
          waveIndex,
          signatureId,
          randomTempTokenId,
          signature,
        ]
      );

      const confirmPurchaseTx = await sandContract
        .connect(userA)
        .approveAndCall(purchaseWrapperAddress, sandPrice, data);

      const receipt = await confirmPurchaseTx.wait();
      if (!receipt) throw new Error('Transaction receipt not found');

      let mintedTokenId: bigint | undefined;
      for (const log of receipt.logs) {
        try {
          const parsedLog = purchaseWrapper.interface.parseLog(log);
          if (parsedLog && parsedLog.name === 'PurchaseConfirmed') {
            mintedTokenId = parsedLog.args.nftTokenId;
            expect(parsedLog.args.originalSender).to.equal(userAAddress);
            expect(parsedLog.args.nftCollection).to.equal(
              collectionContractAddress
            );
            expect(parsedLog.args.localTokenId).to.equal(randomTempTokenId);
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
      expect(await nftCollection.waveTotalMinted(waveIndex)).to.be.eq(1);
      expect(await nftCollection.totalSupply()).to.be.eq(1);

      expect(await sandContract.balanceOf(userAAddress)).to.be.eq(0);
      expect(await sandContract.balanceOf(purchaseWrapperAddress)).to.be.eq(0);
    });

    it('should allow user A to mint two tokens in a row successfully', async function () {
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
      const sandPrice = ethers.parseEther('100');
      const waveIndex = 0;

      await nftCollection.setupWave(
        waveMaxTokensOverall,
        waveMaxTokensPerWallet,
        sandPrice
      );
      // Donate for 2 tokens
      await sandContract.donateTo(userAAddress, sandPrice * BigInt(2));
      expect(await sandContract.balanceOf(userAAddress)).to.be.eq(
        sandPrice * BigInt(2)
      );

      // --- First Purchase ---
      const signatureId1 = 444;
      const randomTempTokenId1 = 54321;
      const signature1 = await waveMintSign(
        purchaseWrapperAddress,
        1,
        waveIndex,
        signatureId1
      );
      const data1 = purchaseWrapper.interface.encodeFunctionData(
        'confirmPurchase',
        [
          userAAddress,
          collectionContractAddress,
          waveIndex,
          signatureId1,
          randomTempTokenId1,
          signature1,
        ]
      );
      const tx1 = await sandContract
        .connect(userA)
        .approveAndCall(purchaseWrapperAddress, sandPrice, data1);
      const receipt1 = await tx1.wait();
      if (!receipt1) throw new Error('Transaction receipt not found');

      let mintedTokenId1: bigint | undefined;
      for (const log of receipt1.logs) {
        try {
          const parsedLog = purchaseWrapper.interface.parseLog(log);
          if (parsedLog && parsedLog.name === 'PurchaseConfirmed') {
            mintedTokenId1 = parsedLog.args.nftTokenId;
            break;
          }
        } catch (e) {
          // Likely a log from another contract
        }
      }
      expect(mintedTokenId1).to.not.be.undefined;
      if (mintedTokenId1 === undefined)
        throw new Error('Minted token ID not found for first purchase');
      expect(await nftCollection.ownerOf(mintedTokenId1)).to.be.eq(
        userAAddress
      );
      expect(await nftCollection.waveTotalMinted(waveIndex)).to.be.eq(1);
      expect(await nftCollection.totalSupply()).to.be.eq(1);
      expect(await sandContract.balanceOf(userAAddress)).to.be.eq(sandPrice);

      // --- Second Purchase ---
      const signatureId2 = 555;
      const randomTempTokenId2 = 65432;
      const signature2 = await waveMintSign(
        purchaseWrapperAddress,
        1,
        waveIndex,
        signatureId2
      );
      const data2 = purchaseWrapper.interface.encodeFunctionData(
        'confirmPurchase',
        [
          userAAddress,
          collectionContractAddress,
          waveIndex,
          signatureId2,
          randomTempTokenId2,
          signature2,
        ]
      );
      const tx2 = await sandContract
        .connect(userA)
        .approveAndCall(purchaseWrapperAddress, sandPrice, data2);
      const receipt2 = await tx2.wait();
      if (!receipt2) throw new Error('Transaction receipt not found');

      let mintedTokenId2: bigint | undefined;
      for (const log of receipt2.logs) {
        try {
          const parsedLog = purchaseWrapper.interface.parseLog(log);
          if (parsedLog && parsedLog.name === 'PurchaseConfirmed') {
            mintedTokenId2 = parsedLog.args.nftTokenId;
            break;
          }
        } catch (e) {
          // Likely a log from another contract
        }
      }
      expect(mintedTokenId2).to.not.be.undefined;
      if (mintedTokenId2 === undefined)
        throw new Error('Minted token ID not found for second purchase');

      expect(await nftCollection.ownerOf(mintedTokenId2)).to.be.eq(
        userAAddress
      );
      expect(await nftCollection.waveTotalMinted(waveIndex)).to.be.eq(2);
      expect(await nftCollection.totalSupply()).to.be.eq(2);

      expect(await sandContract.balanceOf(userAAddress)).to.be.eq(0);
      expect(await sandContract.balanceOf(purchaseWrapperAddress)).to.be.eq(0);
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
      const sandPrice = ethers.parseEther('100');
      const waveIndex = 0;
      const signatureId = 1;
      const randomTempTokenId = 123; // Will be used twice

      await nftCollection.setupWave(
        waveMaxTokensOverall,
        waveMaxTokensPerWallet,
        sandPrice
      );
      await sandContract.donateTo(userAAddress, sandPrice * BigInt(2)); // Enough for two

      const signature1 = await waveMintSign(
        purchaseWrapperAddress,
        1,
        waveIndex,
        signatureId
      );

      // First purchase
      const data1 = purchaseWrapper.interface.encodeFunctionData(
        'confirmPurchase',
        [
          userAAddress,
          collectionContractAddress,
          waveIndex,
          signatureId,
          randomTempTokenId, // Use the ID
          signature1,
        ]
      );
      await sandContract
        .connect(userA)
        .approveAndCall(purchaseWrapperAddress, sandPrice, data1);

      // Second purchase attempt with the same local token ID
      const signature2 = await waveMintSign(
        purchaseWrapperAddress,
        1,
        waveIndex,
        signatureId + 1
      ); // new sig ID

      const data2 = purchaseWrapper.interface.encodeFunctionData(
        'confirmPurchase',
        [
          userAAddress,
          collectionContractAddress,
          waveIndex,
          signatureId + 1,
          randomTempTokenId, // Reuse the ID
          signature2,
        ]
      );
      await expect(
        sandContract
          .connect(userA)
          .approveAndCall(purchaseWrapperAddress, sandPrice, data2)
      )
        .to.be.revertedWithCustomError(
          purchaseWrapper,
          'PurchaseWrapperLocalTokenIdAlreadyInUse'
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
        waveMaxTokensOverall,
        waveMaxTokensPerWallet,
        collectionContractAsOwner: nftCollection,
      } = await loadFixture(setupPurchaseWrapperFixture);

      const userAAddress = await userA.getAddress();
      const sandPrice = ethers.parseEther('100');
      const waveIndex = 0;
      const signatureId = 123;
      const randomTempTokenId = 789;

      await sandContract.donateTo(userAAddress, sandPrice);
      expect(await sandContract.balanceOf(userAAddress)).to.equal(sandPrice);
      await sandContract
        .connect(userA)
        .approve(purchaseWrapperAddress, sandPrice);

      await nftCollection.setupWave(
        waveMaxTokensOverall,
        waveMaxTokensPerWallet,
        sandPrice
      );

      const invalidSignature = '0xdeadbeef';

      const balanceBefore = await sandContract.balanceOf(userAAddress);

      const data = purchaseWrapper.interface.encodeFunctionData(
        'confirmPurchase',
        [
          userAAddress,
          collectionContractAddress,
          waveIndex,
          signatureId,
          randomTempTokenId,
          invalidSignature,
        ]
      );

      await expect(
        sandContract
          .connect(userA)
          .approveAndCall(purchaseWrapperAddress, sandPrice, data)
      ).to.be.revertedWithCustomError(
        purchaseWrapper,
        'PurchaseWrapperNftPurchaseFailedViaApproveAndCall'
      );

      expect(await sandContract.balanceOf(userAAddress)).to.equal(
        balanceBefore
      );
      expect(await sandContract.balanceOf(purchaseWrapperAddress)).to.equal(0);
    });

    it('should revert if called by non-authorized caller', async function () {
      const {
        collectionContractAddress,
        waveMintSign,
        sandContract,
        purchaseWrapper,
        purchaseWrapperAddress,
        randomWallet: userA,
        deployer,
      } = await loadFixture(setupPurchaseWrapperFixture);

      const sandPrice = ethers.parseEther('100');
      const waveIndex = 0;
      const signatureId = 1;
      const randomTempTokenId = 1;
      const userAAddress = await userA.getAddress();

      await sandContract.donateTo(userAAddress, sandPrice);
      await sandContract
        .connect(userA)
        .approve(purchaseWrapperAddress, sandPrice);

      const signature = await waveMintSign(
        purchaseWrapperAddress,
        1,
        waveIndex,
        signatureId
      );

      await expect(
        purchaseWrapper.connect(deployer).confirmPurchase(
          // deployer doesn't have AUTHORIZED_CALLER_ROLE
          userAAddress,
          collectionContractAddress,
          waveIndex,
          signatureId,
          randomTempTokenId,
          signature
        )
      ).to.be.revertedWithCustomError(
        purchaseWrapper,
        'PurchaseWrapperCallerNotAuthorized'
      );
    });
  });

  describe('safeTransferFrom(address from, address to, uint256 localTokenId)', function () {
    let userAAddress: string;
    let userBAddress: string;
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

      // User A must approve the PurchaseWrapper to manage their NFTs from the collection
      // if they intend to use the wrapper's transfer functions.
      // This approval would typically happen on the NFT collection itself.
      await collectionContract
        .connect(userA)
        .setApprovalForAll(purchaseWrapperAddress, true);

      purchaseWrapperAsUserA = purchaseWrapper.connect(userA);
      nftCollection = collectionContract;

      const sandPrice = ethers.parseEther('100');
      const waveIndex = 0;
      const signatureId = 333;

      await collectionContractAsOwner.setupWave(
        waveMaxTokensOverall,
        waveMaxTokensPerWallet,
        sandPrice
      );

      await sandContract.donateTo(userAAddress, sandPrice);

      const signature = await waveMintSign(
        purchaseWrapperAddress,
        1,
        waveIndex,
        signatureId
      );

      const data = purchaseWrapper.interface.encodeFunctionData(
        'confirmPurchase',
        [
          userAAddress,
          collectionContractAddress,
          waveIndex,
          signatureId,
          randomTempTokenId,
          signature,
        ]
      );
      const tx = await sandContract
        .connect(userA)
        .approveAndCall(purchaseWrapperAddress, sandPrice, data);

      const receipt = await tx.wait();
      if (!receipt) throw new Error('Transaction receipt not found for setup');
      for (const log of receipt.logs) {
        try {
          const parsedLog = purchaseWrapper.interface.parseLog(log);
          if (parsedLog && parsedLog.name === 'PurchaseConfirmed') {
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

    it('should allow original recipient (userA) to safeTransfer NFT to userB via wrapper', async function () {
      await expect(
        purchaseWrapperAsUserA.safeTransferFrom(
          userAAddress,
          userBAddress,
          randomTempTokenId
        )
      )
        .to.emit(purchaseWrapperAsUserA, 'NftTransferredViaWrapper')
        .withArgs(randomTempTokenId, userAAddress, userBAddress, mintedTokenId);
      expect(await nftCollection.ownerOf(mintedTokenId)).to.equal(userBAddress);
    });

    it('should revert safeTransferFrom if to address is zero', async function () {
      await expect(
        purchaseWrapperAsUserA.safeTransferFrom(
          userAAddress,
          ZeroAddress,
          randomTempTokenId
        )
      ).to.be.revertedWithCustomError(
        purchaseWrapperAsUserA,
        'PurchaseWrapperTransferToZeroAddress'
      );
    });

    it('should revert if localTokenId is invalid/not used', async function () {
      const invalidLocalTokenId = 11111;
      await expect(
        purchaseWrapperAsUserA.safeTransferFrom(
          userAAddress,
          userBAddress,
          invalidLocalTokenId
        )
      )
        .to.be.revertedWithCustomError(
          purchaseWrapperAsUserA,
          'PurchaseWrapperInvalidLocalTokenIdOrPurchaseNotCompleted'
        )
        .withArgs(invalidLocalTokenId);
    });

    it('should revert if "from" address is not the original recipient', async function () {
      // User A (original recipient) tries to transfer from User B (not original recipient for this token)
      await expect(
        purchaseWrapperAsUserA.safeTransferFrom(
          userBAddress, // from is userB
          userAAddress,
          randomTempTokenId
        )
      )
        .to.be.revertedWithCustomError(
          purchaseWrapperAsUserA,
          'PurchaseWrapperFromAddressIsNotOriginalRecipient'
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

    it('should revert recoverSand if called by non-admin', async function () {
      const {purchaseWrapperAsUserA, randomWallet} = await loadFixture(
        setupPurchaseWrapperFixture
      );
      await expect(
        purchaseWrapperAsUserA.recoverSand(await randomWallet.getAddress())
      ).to.be.revertedWithCustomError(
        purchaseWrapperAsUserA,
        'AccessControlUnauthorizedAccount'
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
        'PurchaseWrapperInvalidRecipientAddress'
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
        'PurchaseWrapperNoSandTokensToRecover'
      );
    });
  });

  describe('setNftCollectionAuthorization', function () {
    it('should allow admin to authorize a collection', async function () {
      const {
        purchaseWrapperAsDeployer,
        collectionContractAddress,
        purchaseWrapper,
      } = await loadFixture(setupPurchaseWrapperFixture);

      // It's authorized in the fixture, so we de-authorize it first.
      await purchaseWrapperAsDeployer.setNftCollectionAuthorization(
        collectionContractAddress,
        false
      );

      // Let's re-authorize and check for the event.
      await expect(
        purchaseWrapperAsDeployer.setNftCollectionAuthorization(
          collectionContractAddress,
          true
        )
      )
        .to.emit(purchaseWrapper, 'NftCollectionAuthorized')
        .withArgs(collectionContractAddress, true);
    });

    it('should allow admin to de-authorize a collection', async function () {
      const {
        purchaseWrapperAsDeployer,
        collectionContractAddress,
        purchaseWrapper,
      } = await loadFixture(setupPurchaseWrapperFixture);

      // It is authorized in the fixture.
      await expect(
        purchaseWrapperAsDeployer.setNftCollectionAuthorization(
          collectionContractAddress,
          false
        )
      )
        .to.emit(purchaseWrapper, 'NftCollectionAuthorized')
        .withArgs(collectionContractAddress, false);
    });

    it('should revert if a non-admin tries to authorize a collection', async function () {
      const {purchaseWrapperAsUserA, collectionContractAddress} =
        await loadFixture(setupPurchaseWrapperFixture);

      await expect(
        purchaseWrapperAsUserA.setNftCollectionAuthorization(
          collectionContractAddress,
          true
        )
      ).to.be.revertedWithCustomError(
        purchaseWrapperAsUserA,
        'AccessControlUnauthorizedAccount'
      );
    });

    it('should revert if the collection address is the zero address', async function () {
      const {purchaseWrapperAsDeployer} = await loadFixture(
        setupPurchaseWrapperFixture
      );

      await expect(
        purchaseWrapperAsDeployer.setNftCollectionAuthorization(
          ZeroAddress,
          true
        )
      ).to.be.revertedWithCustomError(
        purchaseWrapperAsDeployer,
        'PurchaseWrapperNftCollectionAddressCannotBeZero'
      );
    });

    it('should prevent purchase from a de-authorized collection', async function () {
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
        purchaseWrapperAsDeployer,
      } = await loadFixture(setupPurchaseWrapperFixture);

      const userAAddress = await userA.getAddress();

      const sandPrice = ethers.parseEther('100');
      const waveIndex = 0;
      const signatureId = 222;
      const randomTempTokenId = 12345;

      // De-authorize the collection
      await purchaseWrapperAsDeployer.setNftCollectionAuthorization(
        collectionContractAddress,
        false
      );

      await nftCollection.setupWave(
        waveMaxTokensOverall,
        waveMaxTokensPerWallet,
        sandPrice
      );
      await sandContract.donateTo(userAAddress, sandPrice);

      const signature = await waveMintSign(
        purchaseWrapperAddress, // Mint to purchase wrapper
        1,
        waveIndex,
        signatureId
      );

      const data = purchaseWrapper.interface.encodeFunctionData(
        'confirmPurchase',
        [
          userAAddress, // sender is userA, who will receive the NFT
          collectionContractAddress,
          waveIndex,
          signatureId,
          randomTempTokenId,
          signature,
        ]
      );

      await expect(
        sandContract
          .connect(userA)
          .approveAndCall(purchaseWrapperAddress, sandPrice, data)
      )
        .to.be.revertedWithCustomError(
          purchaseWrapper,
          'PurchaseWrapperNftCollectionNotAuthorized'
        )
        .withArgs(collectionContractAddress);
    });
  });
});
