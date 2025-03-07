import {loadFixture, time} from '@nomicfoundation/hardhat-network-helpers';
import {expect} from 'chai';
import {ethers, upgrades} from 'hardhat';
import {runCreateTestSetup} from './fixtures/game-passes-fixture';

describe('SandboxPasses1155Upgradeable', function () {
  describe('Initialization', function () {
    it('should initialize with correct values', async function () {
      const {
        sandboxPasses,
        admin,
        operator,
        signer,
        treasury,
        royaltyReceiver,
        paymentToken,
        BASE_URI,
        TOKEN_ID_1,
        ROYALTY_PERCENTAGE,
        MAX_SUPPLY,
        MAX_PER_WALLET,
        TOKEN_METADATA,
      } = await loadFixture(runCreateTestSetup);

      expect(await sandboxPasses.baseURI()).to.equal(BASE_URI);
      expect(await sandboxPasses.defaultTreasuryWallet()).to.equal(
        treasury.address,
      );
      expect(await sandboxPasses.paymentToken()).to.equal(
        await paymentToken.getAddress(),
      );

      // Check roles
      expect(
        await sandboxPasses.hasRole(
          await sandboxPasses.ADMIN_ROLE(),
          admin.address,
        ),
      ).to.be.true;
      expect(
        await sandboxPasses.hasRole(
          await sandboxPasses.OPERATOR_ROLE(),
          operator.address,
        ),
      ).to.be.true;
      expect(
        await sandboxPasses.hasRole(
          await sandboxPasses.SIGNER_ROLE(),
          signer.address,
        ),
      ).to.be.true;

      // Check royalty info
      const royaltyInfo = await sandboxPasses.royaltyInfo(TOKEN_ID_1, 10000);
      expect(royaltyInfo[0]).to.equal(royaltyReceiver.address);
      expect(royaltyInfo[1]).to.equal((ROYALTY_PERCENTAGE * 10000n) / 10000n);

      // Check token configuration
      const tokenConfig = await sandboxPasses.tokenConfigs(TOKEN_ID_1);
      expect(tokenConfig.isConfigured).to.be.true;
      expect(tokenConfig.transferable).to.be.true;
      expect(tokenConfig.maxSupply).to.equal(MAX_SUPPLY);
      expect(tokenConfig.metadata).to.equal(TOKEN_METADATA);
      expect(tokenConfig.maxPerWallet).to.equal(MAX_PER_WALLET);
    });
  });

  describe('Token Configuration', function () {
    it('should allow admin to configure a new token', async function () {
      const {sandboxPasses, admin, user1} =
        await loadFixture(runCreateTestSetup);
      const NEW_TOKEN_ID = 3;

      await expect(
        sandboxPasses
          .connect(admin)
          .configureToken(
            NEW_TOKEN_ID,
            true,
            200,
            20,
            'ipfs://QmNewToken',
            user1.address,
          ),
      )
        .to.emit(sandboxPasses, 'TokenConfigured')
        .withArgs(
          admin.address, // caller address
          NEW_TOKEN_ID,
          true,
          200,
          20,
          'ipfs://QmNewToken',
          user1.address,
        );

      const tokenConfig = await sandboxPasses.tokenConfigs(NEW_TOKEN_ID);
      expect(tokenConfig.isConfigured).to.be.true;
      expect(tokenConfig.transferable).to.be.true;
      expect(tokenConfig.maxSupply).to.equal(200);
      expect(tokenConfig.maxPerWallet).to.equal(20);
      expect(tokenConfig.metadata).to.equal('ipfs://QmNewToken');
      expect(tokenConfig.treasuryWallet).to.equal(user1.address);
    });

    it('should not allow non-admin to configure a token', async function () {
      const {sandboxPasses, user1} = await loadFixture(runCreateTestSetup);
      await expect(
        sandboxPasses
          .connect(user1)
          .configureToken(3, true, 100, 10, 'metadata', ethers.ZeroAddress),
      ).to.be.revertedWithCustomError(
        sandboxPasses,
        'AccessControlUnauthorizedAccount',
      );
    });

    it("should not allow configuring a token that's already configured", async function () {
      const {sandboxPasses, admin, TOKEN_ID_1} =
        await loadFixture(runCreateTestSetup);
      await expect(
        sandboxPasses
          .connect(admin)
          .configureToken(
            TOKEN_ID_1,
            true,
            100,
            10,
            'metadata',
            ethers.ZeroAddress,
          ),
      ).to.be.revertedWithCustomError(sandboxPasses, 'TokenAlreadyConfigured');
    });

    it('should allow updating token configuration', async function () {
      const {sandboxPasses, admin, user2, TOKEN_ID_1} =
        await loadFixture(runCreateTestSetup);

      await expect(
        sandboxPasses.connect(admin).updateTokenConfig(
          TOKEN_ID_1,
          200, // new max supply
          15, // new max per wallet
          'ipfs://QmUpdated',
          user2.address,
        ),
      )
        .to.emit(sandboxPasses, 'TokenConfigUpdated')
        .withArgs(
          admin.address, // caller address
          TOKEN_ID_1,
          200,
          15,
          'ipfs://QmUpdated',
          user2.address,
        );

      const tokenConfig = await sandboxPasses.tokenConfigs(TOKEN_ID_1);
      expect(tokenConfig.maxSupply).to.equal(200);
      expect(tokenConfig.maxPerWallet).to.equal(15);
      expect(tokenConfig.metadata).to.equal('ipfs://QmUpdated');
      expect(tokenConfig.treasuryWallet).to.equal(user2.address);
    });

    it('should not allow decreasing max supply below current supply', async function () {
      const {sandboxPasses, admin, user1, TOKEN_ID_1, TOKEN_METADATA} =
        await loadFixture(runCreateTestSetup);

      // First mint some tokens
      await sandboxPasses
        .connect(admin)
        .adminMint(user1.address, TOKEN_ID_1, 50);

      // Try to update max supply to below current supply
      await expect(
        sandboxPasses
          .connect(admin)
          .updateTokenConfig(
            TOKEN_ID_1,
            40,
            10,
            TOKEN_METADATA,
            ethers.ZeroAddress,
          ),
      ).to.be.revertedWithCustomError(
        sandboxPasses,
        'MaxSupplyBelowCurrentSupply',
      );
    });

    it('should allow setting transferability', async function () {
      const {sandboxPasses, admin, TOKEN_ID_1, TOKEN_ID_2} =
        await loadFixture(runCreateTestSetup);

      // Change transferable token to non-transferable
      await expect(
        sandboxPasses.connect(admin).setTransferable(TOKEN_ID_1, false),
      )
        .to.emit(sandboxPasses, 'TransferabilityUpdated')
        .withArgs(admin.address, TOKEN_ID_1, false);

      const tokenConfig = await sandboxPasses.tokenConfigs(TOKEN_ID_1);
      expect(tokenConfig.transferable).to.be.false;

      // Change non-transferable token to transferable
      await expect(
        sandboxPasses.connect(admin).setTransferable(TOKEN_ID_2, true),
      )
        .to.emit(sandboxPasses, 'TransferabilityUpdated')
        .withArgs(admin.address, TOKEN_ID_2, true);

      const tokenConfig2 = await sandboxPasses.tokenConfigs(TOKEN_ID_2);
      expect(tokenConfig2.transferable).to.be.true;
    });

    it('should allow updating transfer whitelist', async function () {
      const {sandboxPasses, admin, user1, user2, TOKEN_ID_2} =
        await loadFixture(runCreateTestSetup);

      // Whitelist user1 for non-transferable token
      await expect(
        sandboxPasses
          .connect(admin)
          .updateTransferWhitelist(TOKEN_ID_2, [user1.address], true),
      )
        .to.emit(sandboxPasses, 'TransferWhitelistUpdated')
        .withArgs(admin.address, TOKEN_ID_2, [user1.address], true);
      expect(
        await sandboxPasses.isTransferWhitelisted(TOKEN_ID_2, user1.address),
      ).to.be.true;
      expect(
        await sandboxPasses.isTransferWhitelisted(TOKEN_ID_2, user2.address),
      ).to.be.false;
      // Remove user1 from whitelist
      await expect(
        sandboxPasses
          .connect(admin)
          .updateTransferWhitelist(TOKEN_ID_2, [user1.address], false),
      )
        .to.emit(sandboxPasses, 'TransferWhitelistUpdated')
        .withArgs(admin.address, TOKEN_ID_2, [user1.address], false);
      expect(
        await sandboxPasses.isTransferWhitelisted(TOKEN_ID_2, user1.address),
      ).to.be.false;
    });

    it('should not allow non-admin to set transferability', async function () {
      const {sandboxPasses, user1, TOKEN_ID_1} =
        await loadFixture(runCreateTestSetup);

      await expect(
        sandboxPasses.connect(user1).setTransferable(TOKEN_ID_1, false),
      ).to.be.revertedWithCustomError(
        sandboxPasses,
        'AccessControlUnauthorizedAccount',
      );
    });

    it('should not allow non-admin to update token configuration', async function () {
      const {sandboxPasses, user1, TOKEN_ID_1} =
        await loadFixture(runCreateTestSetup);

      await expect(
        sandboxPasses.connect(user1).updateTokenConfig(
          TOKEN_ID_1,
          200, // new max supply
          15, // new max per wallet
          'ipfs://QmUpdated',
          user1.address,
        ),
      ).to.be.revertedWithCustomError(
        sandboxPasses,
        'AccessControlUnauthorizedAccount',
      );
    });

    it('should not allow non-admin to update transfer whitelist', async function () {
      const {sandboxPasses, user1, TOKEN_ID_1, user2} =
        await loadFixture(runCreateTestSetup);

      await expect(
        sandboxPasses
          .connect(user1)
          .updateTransferWhitelist(TOKEN_ID_1, [user2.address], true),
      ).to.be.revertedWithCustomError(
        sandboxPasses,
        'AccessControlUnauthorizedAccount',
      );
    });
  });

  describe('Admin Minting', function () {
    it('should allow admin to mint tokens', async function () {
      const {sandboxPasses, admin, user1, TOKEN_ID_1, MINT_AMOUNT} =
        await loadFixture(runCreateTestSetup);

      await sandboxPasses
        .connect(admin)
        .adminMint(user1.address, TOKEN_ID_1, MINT_AMOUNT);

      expect(await sandboxPasses.balanceOf(user1.address, TOKEN_ID_1)).to.equal(
        MINT_AMOUNT,
      );
      expect(await sandboxPasses['totalSupply(uint256)'](TOKEN_ID_1)).to.equal(
        MINT_AMOUNT,
      );
    });

    it('should allow admin to batch mint tokens', async function () {
      const {sandboxPasses, admin, TOKEN_ID_1, TOKEN_ID_2, MINT_AMOUNT} =
        await loadFixture(runCreateTestSetup);

      await sandboxPasses
        .connect(admin)
        .adminBatchMint(
          admin.address,
          [TOKEN_ID_1, TOKEN_ID_2],
          [MINT_AMOUNT, MINT_AMOUNT * 2],
        );

      expect(await sandboxPasses.balanceOf(admin.address, TOKEN_ID_1)).to.equal(
        MINT_AMOUNT,
      );
      expect(await sandboxPasses.balanceOf(admin.address, TOKEN_ID_2)).to.equal(
        MINT_AMOUNT * 2,
      );
    });

    it('should allow admin to mint to multiple recipients', async function () {
      const {sandboxPasses, admin, TOKEN_ID_1, TOKEN_ID_2, MINT_AMOUNT} =
        await loadFixture(runCreateTestSetup);

      await sandboxPasses
        .connect(admin)
        .adminMultiRecipientMint(
          [admin.address, admin.address],
          [TOKEN_ID_1, TOKEN_ID_2],
          [MINT_AMOUNT, MINT_AMOUNT * 2],
        );

      expect(await sandboxPasses.balanceOf(admin.address, TOKEN_ID_1)).to.equal(
        MINT_AMOUNT,
      );
      expect(await sandboxPasses.balanceOf(admin.address, TOKEN_ID_2)).to.equal(
        MINT_AMOUNT * 2,
      );
    });

    it('should not allow minting unconfigured tokens', async function () {
      const {sandboxPasses, admin, MINT_AMOUNT} =
        await loadFixture(runCreateTestSetup);

      await expect(
        sandboxPasses.connect(admin).adminMint(admin.address, 999, MINT_AMOUNT),
      ).to.be.revertedWithCustomError(sandboxPasses, 'TokenNotConfigured');
    });

    it('should not allow exceeding max supply', async function () {
      const {sandboxPasses, admin, TOKEN_ID_1, MAX_SUPPLY} =
        await loadFixture(runCreateTestSetup);

      await expect(
        sandboxPasses
          .connect(admin)
          .adminMint(admin.address, TOKEN_ID_1, MAX_SUPPLY + 1),
      ).to.be.revertedWithCustomError(sandboxPasses, 'MaxSupplyExceeded');
    });

    it('should not allow non-admin to mint tokens', async function () {
      const {sandboxPasses, user1, TOKEN_ID_1, MINT_AMOUNT} =
        await loadFixture(runCreateTestSetup);

      await expect(
        sandboxPasses
          .connect(user1)
          .adminMint(user1.address, TOKEN_ID_1, MINT_AMOUNT),
      ).to.be.revertedWithCustomError(
        sandboxPasses,
        'AccessControlUnauthorizedAccount',
      );
    });

    it('should not allow non-admin to batch mint tokens', async function () {
      const {sandboxPasses, user1, TOKEN_ID_1, TOKEN_ID_2, MINT_AMOUNT} =
        await loadFixture(runCreateTestSetup);

      await expect(
        sandboxPasses
          .connect(user1)
          .adminBatchMint(
            user1.address,
            [TOKEN_ID_1, TOKEN_ID_2],
            [MINT_AMOUNT, MINT_AMOUNT * 2],
          ),
      ).to.be.revertedWithCustomError(
        sandboxPasses,
        'AccessControlUnauthorizedAccount',
      );
    });

    it('should not allow non-admin to mint to multiple recipients', async function () {
      const {sandboxPasses, user1, user2, TOKEN_ID_1, TOKEN_ID_2, MINT_AMOUNT} =
        await loadFixture(runCreateTestSetup);

      await expect(
        sandboxPasses
          .connect(user1)
          .adminMultiRecipientMint(
            [user1.address, user2.address],
            [TOKEN_ID_1, TOKEN_ID_2],
            [MINT_AMOUNT, MINT_AMOUNT * 2],
          ),
      ).to.be.revertedWithCustomError(
        sandboxPasses,
        'AccessControlUnauthorizedAccount',
      );
    });
  });

  describe('Signature-Based Minting', function () {
    it('should allow minting with valid signature', async function () {
      const {
        sandboxPasses,
        signer,
        user1,
        paymentToken,
        TOKEN_ID_1,
        MINT_AMOUNT,
        createMintSignature,
        treasury,
      } = await loadFixture(runCreateTestSetup);
      const price = ethers.parseEther('0.1');
      const deadline = (await time.latest()) + 3600; // 1 hour from now
      const nonce = 0; // First transaction for user

      // Approve payment token
      await paymentToken
        .connect(user1)
        .approve(await sandboxPasses.getAddress(), price);

      // Create signature
      const signature = await createMintSignature(
        signer,
        user1.address,
        TOKEN_ID_1,
        MINT_AMOUNT,
        price,
        deadline,
        nonce,
      );

      // Mint with signature
      await sandboxPasses
        .connect(user1)
        .mint(
          user1.address,
          TOKEN_ID_1,
          MINT_AMOUNT,
          price,
          deadline,
          signature,
        );

      expect(await sandboxPasses.balanceOf(user1.address, TOKEN_ID_1)).to.equal(
        MINT_AMOUNT,
      );
      expect(await sandboxPasses['totalSupply(uint256)'](TOKEN_ID_1)).to.equal(
        MINT_AMOUNT,
      );

      // Check treasury received payment
      expect(await paymentToken.balanceOf(treasury.address)).to.equal(price);
    });

    it('should allow minting with approveAndCall', async function () {
      const {
        signer,
        user1,
        TOKEN_ID_1,
        MINT_AMOUNT,
        createMintSignature,
        approveAndCallMint,
      } = await loadFixture(runCreateTestSetup);

      const price = ethers.parseEther('0.1');
      const deadline = (await time.latest()) + 3600; // 1 hour from now
      const nonce = 0; // First transaction for user

      const signature = await createMintSignature(
        signer,
        user1.address,
        TOKEN_ID_1,
        MINT_AMOUNT,
        price,
        deadline,
        nonce,
      );

      await expect(
        approveAndCallMint(user1, price, [
          user1.address,
          TOKEN_ID_1,
          MINT_AMOUNT,
          price,
          deadline,
          signature,
        ]),
      ).to.not.be.reverted;
    });

    it('should allow batch minting with approveAndCall', async function () {
      const {
        sandboxPasses,
        signer,
        user1,
        paymentToken,
        TOKEN_ID_1,
        TOKEN_ID_2,
        MINT_AMOUNT,
        createMintSignature,
        approveAndCallBatchMint,
      } = await loadFixture(runCreateTestSetup);

      const price1 = ethers.parseEther('0.1');
      const price2 = ethers.parseEther('0.2');
      const deadline = (await time.latest()) + 3600; // 1 hour from now
      const nonce1 = 0;
      const nonce2 = 1;

      // Approve payment token
      await paymentToken
        .connect(user1)
        .approve(await sandboxPasses.getAddress(), price1 + price2);

      // Create signatures
      const signature1 = await createMintSignature(
        signer,
        user1.address,
        TOKEN_ID_1,
        MINT_AMOUNT,
        price1,
        deadline,
        nonce1,
      );

      const signature2 = await createMintSignature(
        signer,
        user1.address,
        TOKEN_ID_2,
        MINT_AMOUNT * 2,
        price2,
        deadline,
        nonce2,
      );

      await expect(
        approveAndCallBatchMint(user1, price1 + price2, [
          user1.address,
          [TOKEN_ID_1, TOKEN_ID_2],
          [MINT_AMOUNT, MINT_AMOUNT * 2],
          [price1, price2],
          [deadline, deadline],
          [signature1, signature2],
        ]),
      ).to.not.be.reverted;
    });

    // Batch mint with signatures
    it('should allow batch minting with valid signatures', async function () {
      const {
        sandboxPasses,
        signer,
        user1,
        paymentToken,
        TOKEN_ID_1,
        TOKEN_ID_2,
        MINT_AMOUNT,
        createMintSignature,
        treasury,
      } = await loadFixture(runCreateTestSetup);
      const price1 = ethers.parseEther('0.1');
      const price2 = ethers.parseEther('0.2');
      const deadline = (await time.latest()) + 3600; // 1 hour from now
      const nonce1 = 0;
      const nonce2 = 1;

      // Approve payment token
      await paymentToken
        .connect(user1)
        .approve(await sandboxPasses.getAddress(), price1 + price2);

      // Create signatures
      const signature1 = await createMintSignature(
        signer,
        user1.address,
        TOKEN_ID_1,
        MINT_AMOUNT,
        price1,
        deadline,
        nonce1,
      );

      const signature2 = await createMintSignature(
        signer,
        user1.address,
        TOKEN_ID_2,
        MINT_AMOUNT * 2,
        price2,
        deadline,
        nonce2,
      );

      // Batch mint with signatures
      await sandboxPasses
        .connect(user1)
        .batchMint(
          user1.address,
          [TOKEN_ID_1, TOKEN_ID_2],
          [MINT_AMOUNT, MINT_AMOUNT * 2],
          [price1, price2],
          [deadline, deadline],
          [signature1, signature2],
        );

      expect(await sandboxPasses.balanceOf(user1.address, TOKEN_ID_1)).to.equal(
        MINT_AMOUNT,
      );
      expect(await sandboxPasses.balanceOf(user1.address, TOKEN_ID_2)).to.equal(
        MINT_AMOUNT * 2,
      );

      // Check treasury received payment
      expect(await paymentToken.balanceOf(treasury.address)).to.equal(
        price1 + price2,
      );
    });

    it('should not allow minting with expired signature', async function () {
      const {
        sandboxPasses,
        signer,
        user1,
        TOKEN_ID_1,
        MINT_AMOUNT,
        createMintSignature,
      } = await loadFixture(runCreateTestSetup);
      const price = ethers.parseEther('0.1');
      const deadline = (await time.latest()) - 3600; // 1 hour in the past
      const nonce = 0;

      // Create signature
      const signature = await createMintSignature(
        signer,
        user1.address,
        TOKEN_ID_1,
        MINT_AMOUNT,
        price,
        deadline,
        nonce,
      );

      // Try to mint with expired signature
      await expect(
        sandboxPasses
          .connect(user1)
          .mint(
            user1.address,
            TOKEN_ID_1,
            MINT_AMOUNT,
            price,
            deadline,
            signature,
          ),
      ).to.be.revertedWithCustomError(sandboxPasses, 'SignatureExpired');
    });

    it('should not allow minting with signature from unauthorized signer', async function () {
      const {
        sandboxPasses,
        user1,
        user2,
        TOKEN_ID_1,
        MINT_AMOUNT,
        createMintSignature,
      } = await loadFixture(runCreateTestSetup);
      const price = ethers.parseEther('0.1');
      const deadline = (await time.latest()) + 3600;
      const nonce = 0;

      // Create signature from unauthorized user
      const signature = await createMintSignature(
        user2, // Not a signer
        user1.address,
        TOKEN_ID_1,
        MINT_AMOUNT,
        price,
        deadline,
        nonce,
      );

      // Try to mint with invalid signature
      await expect(
        sandboxPasses
          .connect(user1)
          .mint(
            user1.address,
            TOKEN_ID_1,
            MINT_AMOUNT,
            price,
            deadline,
            signature,
          ),
      ).to.be.revertedWithCustomError(sandboxPasses, 'InvalidSigner');
    });

    it('should not allow exceeding max per wallet', async function () {
      const {
        sandboxPasses,
        signer,
        user1,
        paymentToken,
        TOKEN_ID_1,
        MAX_PER_WALLET,
        createMintSignature,
      } = await loadFixture(runCreateTestSetup);
      const price = ethers.parseEther('0.1');
      const deadline = (await time.latest()) + 3600;
      const nonce = 0;

      // Approve payment token
      await paymentToken
        .connect(user1)
        .approve(await sandboxPasses.getAddress(), price);

      // Create signature for more than max per wallet
      const signature = await createMintSignature(
        signer,
        user1.address,
        TOKEN_ID_1,
        MAX_PER_WALLET + 1,
        price,
        deadline,
        nonce,
      );

      // Try to mint more than max per wallet
      await expect(
        sandboxPasses
          .connect(user1)
          .mint(
            user1.address,
            TOKEN_ID_1,
            MAX_PER_WALLET + 1,
            price,
            deadline,
            signature,
          ),
      ).to.be.revertedWithCustomError(sandboxPasses, 'ExceedsMaxPerWallet');
    });

    it('should allow batch minting up to MAX_BATCH_SIZE', async function () {
      const {
        sandboxPasses,
        signer,
        user1,
        paymentToken,
        admin,
        createMintSignature,
      } = await loadFixture(runCreateTestSetup);

      const MAX_BATCH_SIZE = 100; // Match the contract's constant
      const price = ethers.parseEther('0.01');
      const deadline = (await time.latest()) + 3600;

      // Configure tokens (we need 100 configured tokens)
      const tokenIds = [];
      const amounts = [];
      const prices = [];
      const deadlines = [];
      const signatures = [];

      // First configure all needed tokens
      for (let i = 4; i < MAX_BATCH_SIZE + 4; i++) {
        // Configure each token
        await sandboxPasses.connect(admin).configureToken(
          i,
          true, // transferable
          100, // max supply
          10, // max per wallet
          `ipfs://token${i}`, // metadata
          ethers.ZeroAddress, // use default treasury
        );

        tokenIds.push(i);
        amounts.push(1); // mint 1 of each
        prices.push(price);
        deadlines.push(deadline);
      }

      // Generate signatures for each token
      for (let i = 0; i < MAX_BATCH_SIZE; i++) {
        signatures.push(
          await createMintSignature(
            signer,
            user1.address,
            tokenIds[i],
            amounts[i],
            price,
            deadline,
            i, // nonce
          ),
        );
      }

      // Approve payment token for the whole batch
      await paymentToken
        .connect(user1)
        .approve(
          await sandboxPasses.getAddress(),
          price * BigInt(MAX_BATCH_SIZE),
        );

      // Batch mint with signatures
      await sandboxPasses
        .connect(user1)
        .batchMint(
          user1.address,
          tokenIds,
          amounts,
          prices,
          deadlines,
          signatures,
        );

      // Verify a few tokens were minted successfully
      expect(await sandboxPasses.balanceOf(user1.address, 4)).to.equal(1);
      expect(await sandboxPasses.balanceOf(user1.address, 5)).to.equal(1);
      expect(
        await sandboxPasses.balanceOf(user1.address, MAX_BATCH_SIZE + 3),
      ).to.equal(1);
    });

    it('should fail when batch size exceeds MAX_BATCH_SIZE', async function () {
      const {
        sandboxPasses,
        signer,
        user1,
        paymentToken,
        admin,
        createMintSignature,
      } = await loadFixture(runCreateTestSetup);

      const MAX_BATCH_SIZE = 100; // Match the contract's constant
      const EXCEEDED_SIZE = MAX_BATCH_SIZE + 1;
      const price = ethers.parseEther('0.01');
      const deadline = (await time.latest()) + 3600;

      // Configure tokens (we need 101 configured tokens)
      const tokenIds = [];
      const amounts = [];
      const prices = [];
      const deadlines = [];
      const signatures = [];

      // First configure all needed tokens, start from 4 as previous tokens have been configured
      for (let i = 4; i < EXCEEDED_SIZE + 4; i++) {
        // Configure each token
        await sandboxPasses.connect(admin).configureToken(
          i,
          true, // transferable
          100, // max supply
          10, // max per wallet
          `ipfs://token${i}`, // metadata
          ethers.ZeroAddress, // use default treasury
        );

        tokenIds.push(i);
        amounts.push(1); // mint 1 of each
        prices.push(price);
        deadlines.push(deadline);
      }

      // Generate signatures for each token
      for (let i = 0; i < EXCEEDED_SIZE; i++) {
        signatures.push(
          await createMintSignature(
            signer,
            user1.address,
            tokenIds[i],
            amounts[i],
            price,
            deadline,
            i, // nonce
          ),
        );
      }

      // Approve payment token for the whole batch
      await paymentToken
        .connect(user1)
        .approve(
          await sandboxPasses.getAddress(),
          price * BigInt(EXCEEDED_SIZE),
        );

      // Attempt to batch mint with signatures - should fail
      await expect(
        sandboxPasses
          .connect(user1)
          .batchMint(
            user1.address,
            tokenIds,
            amounts,
            prices,
            deadlines,
            signatures,
          ),
      )
        .to.be.revertedWithCustomError(sandboxPasses, 'BatchSizeExceeded')
        .withArgs(EXCEEDED_SIZE, MAX_BATCH_SIZE);
    });

    it('should not allow minting with incorrect nonce', async function () {
      const {
        sandboxPasses,
        signer,
        user1,
        paymentToken,
        TOKEN_ID_1,
        MINT_AMOUNT,
        createMintSignature,
      } = await loadFixture(runCreateTestSetup);
      const price = ethers.parseEther('0.1');
      const deadline = (await time.latest()) + 3600; // 1 hour from now
      const incorrectNonce = 1; // User's nonce should be 0 initially

      // Approve payment token
      await paymentToken
        .connect(user1)
        .approve(await sandboxPasses.getAddress(), price);

      // Create signature with incorrect nonce
      const signature = await createMintSignature(
        signer,
        user1.address,
        TOKEN_ID_1,
        MINT_AMOUNT,
        price,
        deadline,
        incorrectNonce,
      );

      // Try to mint with incorrect nonce
      await expect(
        sandboxPasses
          .connect(user1)
          .mint(
            user1.address,
            TOKEN_ID_1,
            MINT_AMOUNT,
            price,
            deadline,
            signature,
          ),
      ).to.be.revertedWithCustomError(sandboxPasses, 'InvalidSigner'); // invalid signer because the hash was incorrect due to bad nonce
    });

    it('should not allow replay attacks by reusing signatures', async function () {
      const {
        sandboxPasses,
        signer,
        user1,
        paymentToken,
        TOKEN_ID_1,
        MINT_AMOUNT,
        createMintSignature,
      } = await loadFixture(runCreateTestSetup);
      const price = ethers.parseEther('0.1');
      const deadline = (await time.latest()) + 3600; // 1 hour from now
      const nonce = 0; // First transaction for user

      // Approve payment token for two transactions
      await paymentToken
        .connect(user1)
        .approve(await sandboxPasses.getAddress(), price * 2n);

      // Create signature
      const signature = await createMintSignature(
        signer,
        user1.address,
        TOKEN_ID_1,
        MINT_AMOUNT,
        price,
        deadline,
        nonce,
      );

      // First mint should succeed
      await sandboxPasses
        .connect(user1)
        .mint(
          user1.address,
          TOKEN_ID_1,
          MINT_AMOUNT,
          price,
          deadline,
          signature,
        );

      // Second mint with same signature should fail (replay attack)
      await expect(
        sandboxPasses
          .connect(user1)
          .mint(
            user1.address,
            TOKEN_ID_1,
            MINT_AMOUNT,
            price,
            deadline,
            signature,
          ),
      ).to.be.revertedWithCustomError(sandboxPasses, 'InvalidSigner'); // invalid signer because the hash was incorrect due nonce in sig and contract mismatch
    });

    it('should increment user nonce after successful mint', async function () {
      const {
        sandboxPasses,
        signer,
        user1,
        paymentToken,
        TOKEN_ID_1,
        MINT_AMOUNT,
        createMintSignature,
      } = await loadFixture(runCreateTestSetup);
      const price = ethers.parseEther('0.1');
      const deadline = (await time.latest()) + 3600; // 1 hour from now

      // Check initial nonce
      expect(await sandboxPasses.getNonce(user1.address)).to.equal(0);

      // Approve payment token
      await paymentToken
        .connect(user1)
        .approve(await sandboxPasses.getAddress(), price);

      // Create signature with correct nonce
      const signature = await createMintSignature(
        signer,
        user1.address,
        TOKEN_ID_1,
        MINT_AMOUNT,
        price,
        deadline,
        0, // Initial nonce
      );

      // Mint with signature
      await sandboxPasses
        .connect(user1)
        .mint(
          user1.address,
          TOKEN_ID_1,
          MINT_AMOUNT,
          price,
          deadline,
          signature,
        );

      // Verify nonce was incremented
      expect(await sandboxPasses.getNonce(user1.address)).to.equal(1);
    });
  });

  describe('Burn and Mint Operations', function () {
    it('should allow operator to burn and mint', async function () {
      const {
        sandboxPasses,
        operator,
        admin,
        TOKEN_ID_1,
        TOKEN_ID_2,
        MINT_AMOUNT,
      } = await loadFixture(runCreateTestSetup);

      await sandboxPasses
        .connect(admin)
        .adminMint(admin.address, TOKEN_ID_1, MINT_AMOUNT);

      await sandboxPasses
        .connect(operator)
        .operatorBurnAndMint(
          admin.address,
          admin.address,
          TOKEN_ID_1,
          2,
          TOKEN_ID_2,
          3,
        );

      expect(await sandboxPasses.balanceOf(admin.address, TOKEN_ID_1)).to.equal(
        MINT_AMOUNT - 2,
      );
      expect(await sandboxPasses.balanceOf(admin.address, TOKEN_ID_2)).to.equal(
        3,
      );
    });

    it('should allow operator to batch burn and mint', async function () {
      const {
        sandboxPasses,
        operator,
        admin,
        TOKEN_ID_1,
        TOKEN_ID_2,
        MINT_AMOUNT,
        user1,
      } = await loadFixture(runCreateTestSetup);

      await sandboxPasses
        .connect(admin)
        .adminMint(user1.address, TOKEN_ID_1, MINT_AMOUNT);
      // Mint additional tokens for batch burn

      await sandboxPasses
        .connect(admin)
        .adminMint(user1.address, TOKEN_ID_2, MINT_AMOUNT);

      await sandboxPasses
        .connect(operator)
        .operatorBatchBurnAndMint(
          user1.address,
          user1.address,
          [TOKEN_ID_1, TOKEN_ID_2],
          [2, 3],
          [TOKEN_ID_2, TOKEN_ID_1],
          [4, 5],
        );

      expect(await sandboxPasses.balanceOf(user1.address, TOKEN_ID_1)).to.equal(
        MINT_AMOUNT - 2 + 5,
      );
      expect(await sandboxPasses.balanceOf(user1.address, TOKEN_ID_2)).to.equal(
        MINT_AMOUNT - 3 + 4,
      );
    });

    it('should allow user to burn and mint with valid signature', async function () {
      const {
        sandboxPasses,
        signer,
        user1,
        TOKEN_ID_1,
        TOKEN_ID_2,
        MINT_AMOUNT,
        admin,
        createBurnAndMintSignature,
      } = await loadFixture(runCreateTestSetup);

      await sandboxPasses
        .connect(admin)
        .adminMint(user1.address, TOKEN_ID_1, MINT_AMOUNT);

      const deadline = (await time.latest()) + 3600;
      const nonce = 0;

      // Create signature
      const signature = await createBurnAndMintSignature(
        signer,
        user1.address,
        TOKEN_ID_1,
        2,
        TOKEN_ID_2,
        3,
        deadline,
        nonce,
      );

      // Burn and mint with signature
      await sandboxPasses
        .connect(user1)
        .burnAndMint(
          user1.address,
          TOKEN_ID_1,
          2,
          TOKEN_ID_2,
          3,
          deadline,
          signature,
        );

      expect(await sandboxPasses.balanceOf(user1.address, TOKEN_ID_1)).to.equal(
        MINT_AMOUNT - 2,
      );
      expect(await sandboxPasses.balanceOf(user1.address, TOKEN_ID_2)).to.equal(
        3,
      );
    });
  });

  describe('Transfer Restrictions', function () {
    beforeEach(async function () {
      const fixture = await loadFixture(runCreateTestSetup);
      const {sandboxPasses, admin, TOKEN_ID_1, TOKEN_ID_2, MINT_AMOUNT} =
        fixture;

      // Mint tokens to be tested
      await sandboxPasses
        .connect(admin)
        .adminMint(admin.address, TOKEN_ID_1, MINT_AMOUNT);

      await sandboxPasses
        .connect(admin)
        .adminMint(admin.address, TOKEN_ID_2, MINT_AMOUNT);
    });

    it('should allow transferring transferable tokens', async function () {
      const {sandboxPasses, admin, user1, user2, TOKEN_ID_1, MINT_AMOUNT} =
        await loadFixture(runCreateTestSetup);

      await sandboxPasses
        .connect(admin)
        .adminMint(user1.address, TOKEN_ID_1, MINT_AMOUNT);

      // Now transfer should succeed
      await sandboxPasses
        .connect(user1)
        .safeTransferFrom(user1.address, user2.address, TOKEN_ID_1, 2, '0x');

      expect(await sandboxPasses.balanceOf(user1.address, TOKEN_ID_1)).to.equal(
        MINT_AMOUNT - 2,
      );
      expect(await sandboxPasses.balanceOf(user2.address, TOKEN_ID_1)).to.equal(
        2,
      );
    });

    it('should not allow transferring non-transferable tokens', async function () {
      const {sandboxPasses, user1, user2, TOKEN_ID_2, admin, MINT_AMOUNT} =
        await loadFixture(runCreateTestSetup);

      await sandboxPasses
        .connect(admin)
        .adminMint(user1.address, TOKEN_ID_2, MINT_AMOUNT);

      await expect(
        sandboxPasses
          .connect(user1)
          .safeTransferFrom(user1.address, user2.address, TOKEN_ID_2, 2, '0x'),
      ).to.be.revertedWithCustomError(sandboxPasses, 'TransferNotAllowed');
    });

    it('should allow whitelisted addresses to transfer non-transferable tokens', async function () {
      const {sandboxPasses, admin, user1, user2, TOKEN_ID_2, MINT_AMOUNT} =
        await loadFixture(runCreateTestSetup);

      await sandboxPasses
        .connect(admin)
        .adminMint(user1.address, TOKEN_ID_2, MINT_AMOUNT);

      // Whitelist user1 for transfers
      await sandboxPasses
        .connect(admin)
        .updateTransferWhitelist(TOKEN_ID_2, [user1.address], true);

      // Now the transfer should succeed
      await sandboxPasses
        .connect(user1)
        .safeTransferFrom(user1.address, user2.address, TOKEN_ID_2, 2, '0x');

      expect(await sandboxPasses.balanceOf(user1.address, TOKEN_ID_2)).to.equal(
        MINT_AMOUNT - 2,
      );
      expect(await sandboxPasses.balanceOf(user2.address, TOKEN_ID_2)).to.equal(
        2,
      );
    });

    it('should allow admin to transfer non-transferable tokens', async function () {
      const {sandboxPasses, admin, user1, TOKEN_ID_2, MINT_AMOUNT} =
        await loadFixture(runCreateTestSetup);

      await sandboxPasses
        .connect(admin)
        .adminMint(admin.address, TOKEN_ID_2, MINT_AMOUNT);

      // Admin should be able to transfer non-transferable tokens
      await sandboxPasses
        .connect(admin)
        .safeTransferFrom(admin.address, user1.address, TOKEN_ID_2, 2, '0x');

      expect(await sandboxPasses.balanceOf(admin.address, TOKEN_ID_2)).to.equal(
        MINT_AMOUNT - 2,
      );
      expect(await sandboxPasses.balanceOf(user1.address, TOKEN_ID_2)).to.equal(
        2,
      );
    });

    it('should not allow non-admin to set transferability', async function () {
      const {sandboxPasses, user1, TOKEN_ID_1} =
        await loadFixture(runCreateTestSetup);

      await expect(
        sandboxPasses.connect(user1).setTransferable(TOKEN_ID_1, false),
      ).to.be.revertedWithCustomError(
        sandboxPasses,
        'AccessControlUnauthorizedAccount',
      );
    });
  });

  describe('Royalties', function () {
    it('should return correct royalty info for default royalty', async function () {
      const {sandboxPasses, TOKEN_ID_1, ROYALTY_PERCENTAGE, royaltyReceiver} =
        await loadFixture(runCreateTestSetup);

      const salePrice = ethers.parseEther('1');
      const royaltyInfo = await sandboxPasses.royaltyInfo(
        TOKEN_ID_1,
        salePrice,
      );

      expect(royaltyInfo[0]).to.equal(royaltyReceiver);
      expect(royaltyInfo[1]).to.equal(
        (salePrice * ROYALTY_PERCENTAGE) / 10000n,
      );
    });

    it('should allow admin to set default royalty', async function () {
      const {sandboxPasses, admin, TOKEN_ID_1} =
        await loadFixture(runCreateTestSetup);

      const newRoyaltyPercentage = 1000n; // 10%

      await sandboxPasses
        .connect(admin)
        .setDefaultRoyalty(
          await sandboxPasses.getAddress(),
          newRoyaltyPercentage,
        );

      const salePrice = ethers.parseEther('1');
      const royaltyInfo = await sandboxPasses.royaltyInfo(
        TOKEN_ID_1,
        salePrice,
      );

      expect(royaltyInfo[0]).to.equal(await sandboxPasses.getAddress());
      expect(royaltyInfo[1]).to.equal(
        (salePrice * newRoyaltyPercentage) / 10000n,
      );
    });

    it('should allow admin to set token-specific royalty', async function () {
      const {sandboxPasses, admin, TOKEN_ID_2} =
        await loadFixture(runCreateTestSetup);

      const tokenRoyaltyPercentage = 800n; // 8%

      await sandboxPasses
        .connect(admin)
        .setTokenRoyalty(
          TOKEN_ID_2,
          await sandboxPasses.getAddress(),
          tokenRoyaltyPercentage,
        );

      const salePrice = ethers.parseEther('1');
      const royaltyInfo = await sandboxPasses.royaltyInfo(
        TOKEN_ID_2,
        salePrice,
      );

      expect(royaltyInfo[0]).to.equal(await sandboxPasses.getAddress());
      expect(royaltyInfo[1]).to.equal(
        (salePrice * tokenRoyaltyPercentage) / 10000n,
      );
    });

    it('should not allow non-admin to set default royalty', async function () {
      const {sandboxPasses, user1} = await loadFixture(runCreateTestSetup);

      const newRoyaltyPercentage = 1000n; // 10%

      await expect(
        sandboxPasses
          .connect(user1)
          .setDefaultRoyalty(
            await sandboxPasses.getAddress(),
            newRoyaltyPercentage,
          ),
      ).to.be.revertedWithCustomError(
        sandboxPasses,
        'AccessControlUnauthorizedAccount',
      );
    });

    it('should not allow non-admin to set token-specific royalty', async function () {
      const {sandboxPasses, user1, TOKEN_ID_2} =
        await loadFixture(runCreateTestSetup);

      const tokenRoyaltyPercentage = 800n; // 8%

      await expect(
        sandboxPasses
          .connect(user1)
          .setTokenRoyalty(
            TOKEN_ID_2,
            await sandboxPasses.getAddress(),
            tokenRoyaltyPercentage,
          ),
      ).to.be.revertedWithCustomError(
        sandboxPasses,
        'AccessControlUnauthorizedAccount',
      );
    });
  });

  describe('Pause Functionality', function () {
    it('should allow admin to pause and unpause the contract', async function () {
      const {sandboxPasses, admin} = await loadFixture(runCreateTestSetup);

      expect(await sandboxPasses.paused()).to.be.false;

      await sandboxPasses.connect(admin).pause();
      expect(await sandboxPasses.paused()).to.be.true;

      await sandboxPasses.connect(admin).unpause();
      expect(await sandboxPasses.paused()).to.be.false;
    });

    it('should not allow non-admin to pause the contract', async function () {
      const {sandboxPasses, user1} = await loadFixture(runCreateTestSetup);

      await expect(
        sandboxPasses.connect(user1).pause(),
      ).to.be.revertedWithCustomError(
        sandboxPasses,
        'AccessControlUnauthorizedAccount',
      );
    });

    it('should not allow non-admin to unpause the contract', async function () {
      const {sandboxPasses, admin, user1} =
        await loadFixture(runCreateTestSetup);

      // First pause as admin
      await sandboxPasses.connect(admin).pause();

      // Try to unpause as non-admin
      await expect(
        sandboxPasses.connect(user1).unpause(),
      ).to.be.revertedWithCustomError(
        sandboxPasses,
        'AccessControlUnauthorizedAccount',
      );
    });

    it('should not allow minting when paused', async function () {
      const {
        sandboxPasses,
        admin,
        TOKEN_ID_1,
        MINT_AMOUNT,
        createMintSignature,
      } = await loadFixture(runCreateTestSetup);

      await sandboxPasses.connect(admin).pause();

      const price = ethers.parseEther('0.1');
      const deadline = (await time.latest()) + 3600;
      const nonce = 0;

      // Create signature
      const signature = await createMintSignature(
        admin,
        admin.address,
        TOKEN_ID_1,
        MINT_AMOUNT,
        price,
        deadline,
        nonce,
      );

      // Try to mint while paused
      await expect(
        sandboxPasses
          .connect(admin)
          .mint(
            admin.address,
            TOKEN_ID_1,
            MINT_AMOUNT,
            price,
            deadline,
            signature,
          ),
      ).to.be.revertedWithCustomError(sandboxPasses, 'EnforcedPause');
    });

    it('should not allow transfers when paused', async function () {
      const {sandboxPasses, admin, TOKEN_ID_1, MINT_AMOUNT} =
        await loadFixture(runCreateTestSetup);

      // Mint tokens first
      await sandboxPasses
        .connect(admin)
        .adminMint(admin.address, TOKEN_ID_1, MINT_AMOUNT);

      // Pause the contract
      await sandboxPasses.connect(admin).pause();

      // Try to transfer while paused
      await expect(
        sandboxPasses
          .connect(admin)
          .safeTransferFrom(admin.address, admin.address, TOKEN_ID_1, 2, '0x'),
      ).to.be.revertedWithCustomError(sandboxPasses, 'EnforcedPause');
    });
  });

  describe('URI', function () {
    it('should return correct token URI', async function () {
      const {sandboxPasses, TOKEN_ID_1, BASE_URI} =
        await loadFixture(runCreateTestSetup);

      expect(await sandboxPasses.uri(TOKEN_ID_1)).to.equal(
        `${BASE_URI}${TOKEN_ID_1}.json`,
      );
    });

    it('should allow admin to update base URI', async function () {
      const {sandboxPasses, admin, TOKEN_ID_1, BASE_URI} =
        await loadFixture(runCreateTestSetup);

      const newBaseURI = 'https://new-api.example.com/metadata/';

      await expect(sandboxPasses.connect(admin).setBaseURI(newBaseURI))
        .to.emit(sandboxPasses, 'BaseURISet')
        .withArgs(admin.address, BASE_URI, newBaseURI);

      expect(await sandboxPasses.baseURI()).to.equal(newBaseURI);
      expect(await sandboxPasses.uri(TOKEN_ID_1)).to.equal(
        `${newBaseURI}${TOKEN_ID_1}.json`,
      );
    });

    it('should not allow non-admin to update base URI', async function () {
      const {sandboxPasses, user1} = await loadFixture(runCreateTestSetup);

      const newBaseURI = 'https://new-api.example.com/metadata/';

      await expect(
        sandboxPasses.connect(user1).setBaseURI(newBaseURI),
      ).to.be.revertedWithCustomError(
        sandboxPasses,
        'AccessControlUnauthorizedAccount',
      );
    });
  });

  describe('ERC165/Interface Support', function () {
    it('should support ERC1155 interface', async function () {
      const {sandboxPasses} = await loadFixture(runCreateTestSetup);

      const ERC1155InterfaceId = '0xd9b67a26';
      expect(await sandboxPasses.supportsInterface(ERC1155InterfaceId)).to.be
        .true;
    });

    it('should support ERC2981 interface', async function () {
      const {sandboxPasses} = await loadFixture(runCreateTestSetup);

      const ERC2981InterfaceId = '0x2a55205a';
      expect(await sandboxPasses.supportsInterface(ERC2981InterfaceId)).to.be
        .true;
    });

    it('should support AccessControl interface', async function () {
      const {sandboxPasses} = await loadFixture(runCreateTestSetup);

      const AccessControlInterfaceId = '0x7965db0b';
      expect(await sandboxPasses.supportsInterface(AccessControlInterfaceId)).to
        .be.true;
    });
  });

  describe('Event Emissions', function () {
    it('should emit TokenConfigured event when configuring a token', async function () {
      const {sandboxPasses, admin, user1} =
        await loadFixture(runCreateTestSetup);
      const NEW_TOKEN_ID = 5;

      await expect(
        sandboxPasses
          .connect(admin)
          .configureToken(
            NEW_TOKEN_ID,
            true,
            200,
            20,
            'ipfs://QmNewToken',
            user1.address,
          ),
      )
        .to.emit(sandboxPasses, 'TokenConfigured')
        .withArgs(
          admin.address, // caller address
          NEW_TOKEN_ID,
          true,
          200,
          20,
          'ipfs://QmNewToken',
          user1.address,
        );
    });

    it('should emit TokenConfigUpdated event when updating a token', async function () {
      const {sandboxPasses, admin, user2, TOKEN_ID_1} =
        await loadFixture(runCreateTestSetup);

      await expect(
        sandboxPasses.connect(admin).updateTokenConfig(
          TOKEN_ID_1,
          200, // new max supply
          15, // new max per wallet
          'ipfs://QmUpdated',
          user2.address,
        ),
      )
        .to.emit(sandboxPasses, 'TokenConfigUpdated')
        .withArgs(
          admin.address, // caller address
          TOKEN_ID_1,
          200,
          15,
          'ipfs://QmUpdated',
          user2.address,
        );
    });

    it('should emit TransferabilityUpdated event when changing transferability', async function () {
      const {sandboxPasses, admin, TOKEN_ID_1} =
        await loadFixture(runCreateTestSetup);

      await expect(
        sandboxPasses.connect(admin).setTransferable(TOKEN_ID_1, false),
      )
        .to.emit(sandboxPasses, 'TransferabilityUpdated')
        .withArgs(admin.address, TOKEN_ID_1, false);
    });

    it('should emit TransferWhitelistUpdated event when updating whitelist', async function () {
      const {sandboxPasses, admin, user1, TOKEN_ID_1} =
        await loadFixture(runCreateTestSetup);

      await expect(
        sandboxPasses
          .connect(admin)
          .updateTransferWhitelist(TOKEN_ID_1, [user1.address], true),
      )
        .to.emit(sandboxPasses, 'TransferWhitelistUpdated')
        .withArgs(admin.address, TOKEN_ID_1, [user1.address], true);
    });

    it('should emit BaseURISet event when updating base URI', async function () {
      const {sandboxPasses, admin, BASE_URI} =
        await loadFixture(runCreateTestSetup);

      const newBaseURI = 'https://new-api.example.com/metadata/';

      await expect(sandboxPasses.connect(admin).setBaseURI(newBaseURI))
        .to.emit(sandboxPasses, 'BaseURISet')
        .withArgs(admin.address, BASE_URI, newBaseURI);
    });

    it('should emit TokensRecovered event when recovering tokens', async function () {
      const {sandboxPasses, admin, treasury, deployToken} =
        await loadFixture(runCreateTestSetup);

      const mockToken = await deployToken();
      const amount = ethers.parseEther('10');
      await mockToken.mint(await sandboxPasses.getAddress(), amount);

      await expect(
        sandboxPasses
          .connect(admin)
          .recoverERC20(await mockToken.getAddress(), treasury.address, amount),
      )
        .to.emit(sandboxPasses, 'TokensRecovered')
        .withArgs(
          admin.address,
          await mockToken.getAddress(),
          treasury.address,
          amount,
        );
    });
  });

  describe('Token Recovery', function () {
    it('should allow admin to recover ERC20 tokens', async function () {
      const {sandboxPasses, admin, treasury, deployToken} =
        await loadFixture(runCreateTestSetup);

      // Create a mock ERC20 token and send some to the contract
      const mockToken = await deployToken();
      const amount = ethers.parseEther('10');
      await mockToken.mint(await sandboxPasses.getAddress(), amount);

      // Verify the balance
      expect(
        await mockToken.balanceOf(await sandboxPasses.getAddress()),
      ).to.equal(amount);

      // Recover the tokens
      await expect(
        sandboxPasses
          .connect(admin)
          .recoverERC20(await mockToken.getAddress(), treasury.address, amount),
      )
        .to.emit(sandboxPasses, 'TokensRecovered')
        .withArgs(
          admin.address,
          await mockToken.getAddress(),
          treasury.address,
          amount,
        );

      // Verify the recovery worked
      expect(
        await mockToken.balanceOf(await sandboxPasses.getAddress()),
      ).to.equal(0);
      expect(await mockToken.balanceOf(treasury.address)).to.equal(amount);
    });

    it('should not allow non-admin to recover ERC20 tokens', async function () {
      const {sandboxPasses, user1, treasury, deployToken} =
        await loadFixture(runCreateTestSetup);

      // Create a mock ERC20 token and send some to the contract
      const mockToken = await deployToken();
      const amount = ethers.parseEther('10');
      await mockToken.mint(await sandboxPasses.getAddress(), amount);

      // Try to recover as non-admin
      await expect(
        sandboxPasses
          .connect(user1)
          .recoverERC20(await mockToken.getAddress(), treasury.address, amount),
      ).to.be.revertedWithCustomError(
        sandboxPasses,
        'AccessControlUnauthorizedAccount',
      );
    });

    it('should not allow recovering payment token while contract is active', async function () {
      const {sandboxPasses, admin, treasury, paymentToken} =
        await loadFixture(runCreateTestSetup);
      const amount = ethers.parseEther('10');
      await paymentToken.mint(await sandboxPasses.getAddress(), amount);

      // Try to recover the payment token while contract is not paused
      await expect(
        sandboxPasses
          .connect(admin)
          .recoverERC20(
            await paymentToken.getAddress(),
            treasury.address,
            amount,
          ),
      ).to.be.revertedWithCustomError(
        sandboxPasses,
        'PaymentTokenRecoveryNotAllowed',
      );

      // Pause the contract
      await sandboxPasses.connect(admin).pause();

      // Now it should work
      await expect(
        sandboxPasses
          .connect(admin)
          .recoverERC20(
            await paymentToken.getAddress(),
            treasury.address,
            amount,
          ),
      ).to.not.be.reverted;
    });
  });

  describe('Additional Error Cases', function () {
    it('should revert when configuring token with zero maxPerWallet', async function () {
      const {sandboxPasses, admin} = await loadFixture(runCreateTestSetup);
      const NEW_TOKEN_ID = 10;

      await expect(
        sandboxPasses.connect(admin).configureToken(
          NEW_TOKEN_ID,
          true,
          100,
          0, // Zero maxPerWallet
          'ipfs://QmNewToken',
          admin.address,
        ),
      ).to.be.revertedWithCustomError(sandboxPasses, 'ZeroMaxPerWallet');
    });

    it('should revert when updating token with zero maxPerWallet', async function () {
      const {sandboxPasses, admin, TOKEN_ID_1} =
        await loadFixture(runCreateTestSetup);
      await expect(
        sandboxPasses.connect(admin).updateTokenConfig(
          TOKEN_ID_1,
          200,
          0, // Zero maxPerWallet
          'ipfs://QmUpdated',
          admin.address,
        ),
      ).to.be.revertedWithCustomError(sandboxPasses, 'ZeroMaxPerWallet');
    });

    it('should revert with BurnMintNotConfigured for unconfigured burn token', async function () {
      const {
        sandboxPasses,
        signer,
        user1,
        TOKEN_ID_2,
        createBurnAndMintSignature,
      } = await loadFixture(runCreateTestSetup);
      const NON_CONFIGURED_TOKEN = 999;
      const deadline = (await time.latest()) + 3600;
      const nonce = 0;

      // Create signature
      const signature = await createBurnAndMintSignature(
        signer,
        user1.address,
        NON_CONFIGURED_TOKEN, // Non-configured token
        2,
        TOKEN_ID_2,
        3,
        deadline,
        nonce,
      );

      await expect(
        sandboxPasses
          .connect(user1)
          .burnAndMint(
            user1.address,
            NON_CONFIGURED_TOKEN,
            2,
            TOKEN_ID_2,
            3,
            deadline,
            signature,
          ),
      ).to.be.revertedWithCustomError(sandboxPasses, 'BurnMintNotConfigured');
    });

    it('should revert with ArrayLengthMismatch in batch operations', async function () {
      const {sandboxPasses, admin, TOKEN_ID_1, TOKEN_ID_2, MINT_AMOUNT} =
        await loadFixture(runCreateTestSetup);
      await expect(
        sandboxPasses.connect(admin).adminBatchMint(
          admin.address,
          [TOKEN_ID_1, TOKEN_ID_2], // Length 2
          [MINT_AMOUNT], // Length 1
        ),
      ).to.be.revertedWithCustomError(sandboxPasses, 'ArrayLengthMismatch');
    });
  });

  describe('Initialization Errors', function () {
    it('should revert when initializing with zero addresses', async function () {
      const {
        SandboxPasses,
        sandboxPasses,
        admin,
        BASE_URI,
        royaltyReceiver,
        ROYALTY_PERCENTAGE,
        paymentToken,
        trustedForwarder,
        treasury,
        operator,
        signer,
      } = await loadFixture(runCreateTestSetup);

      // Try with zero admin address
      await expect(
        upgrades.deployProxy(SandboxPasses, [
          BASE_URI,
          royaltyReceiver.address,
          ROYALTY_PERCENTAGE,
          ethers.ZeroAddress, // Zero admin address
          operator.address,
          signer.address,
          await paymentToken.getAddress(),
          trustedForwarder.address,
          treasury.address,
          admin.address,
        ]),
      ).to.be.revertedWithCustomError(
        await SandboxPasses.deploy(),
        'ZeroAddress',
      );

      // Try with zero treasury address
      await expect(
        upgrades.deployProxy(SandboxPasses, [
          BASE_URI,
          royaltyReceiver.address,
          ROYALTY_PERCENTAGE,
          admin.address,
          operator.address,
          signer.address,
          await paymentToken.getAddress(),
          trustedForwarder.address,
          ethers.ZeroAddress, // Zero treasury address
          admin.address,
        ]),
      ).to.be.revertedWithCustomError(sandboxPasses, 'ZeroAddress');
    });

    it('should revert when initializing with invalid payment token', async function () {
      const {
        SandboxPasses,
        admin,
        BASE_URI,
        royaltyReceiver,
        ROYALTY_PERCENTAGE,
        trustedForwarder,
        treasury,
        operator,
        signer,
        user1,
      } = await loadFixture(runCreateTestSetup);

      // Deploy with an EOA as payment token (which is not a valid ERC20)
      await expect(
        upgrades.deployProxy(SandboxPasses, [
          BASE_URI,
          royaltyReceiver.address,
          ROYALTY_PERCENTAGE,
          admin.address,
          operator.address,
          signer.address,
          user1.address, // Not an ERC20 token
          trustedForwarder.address,
          treasury.address,
          admin.address,
        ]),
      ).to.be.revertedWithCustomError(SandboxPasses, 'InvalidPaymentToken');
    });
  });
});
