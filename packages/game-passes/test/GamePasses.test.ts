import {SignerWithAddress} from '@nomicfoundation/hardhat-ethers/signers';
import {time} from '@nomicfoundation/hardhat-network-helpers';
import {expect} from 'chai';
import {ethers, upgrades} from 'hardhat';
import {MockERC20, SandboxPasses1155Upgradeable} from '../typechain-types';

describe('SandboxPasses1155Upgradeable', function () {
  let sandboxPasses: SandboxPasses1155Upgradeable,
    admin: SignerWithAddress,
    operator: SignerWithAddress,
    signer: SignerWithAddress,
    user1: SignerWithAddress,
    user2: SignerWithAddress,
    treasury: SignerWithAddress,
    royaltyReceiver: SignerWithAddress,
    trustedForwarder: SignerWithAddress,
    paymentToken: MockERC20;

  const BASE_URI = 'https://api.example.com/token/';
  const ROYALTY_PERCENTAGE = 500n; // 5%
  const TOKEN_ID_1 = 1;
  const TOKEN_ID_2 = 2;
  const MINT_AMOUNT = 5;
  const MAX_SUPPLY = 100;
  const MAX_PER_WALLET = 10;
  const TOKEN_METADATA = 'ipfs://QmToken1';
  const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

  // EIP-712 constants
  const DOMAIN_NAME = 'SandboxPasses1155';
  const DOMAIN_VERSION = '1';

  // Helper function to create an EIP-712 signature for minting
  async function createMintSignature(
    signer: SignerWithAddress,
    caller: string,
    tokenId: number,
    amount: number,
    price: bigint,
    deadline: number,
    nonce: number,
  ): Promise<string> {
    const chainId = (await ethers.provider.getNetwork()).chainId;

    // Create domain data according to EIP-712
    const domain = {
      name: DOMAIN_NAME,
      version: DOMAIN_VERSION,
      chainId: chainId,
      verifyingContract: await sandboxPasses.getAddress(),
    };

    // Define the types
    const types = {
      MintRequest: [
        {name: 'caller', type: 'address'},
        {name: 'tokenId', type: 'uint256'},
        {name: 'amount', type: 'uint256'},
        {name: 'price', type: 'uint256'},
        {name: 'deadline', type: 'uint256'},
        {name: 'nonce', type: 'uint256'},
      ],
    };

    // Create the data to sign
    const value = {
      caller: caller,
      tokenId: tokenId,
      amount: amount,
      price: price,
      deadline: deadline,
      nonce: nonce,
    };

    // Sign the typed data properly
    return await signer.signTypedData(domain, types, value);
  }

  // Helper function to create an EIP-712 signature for burn and mint
  async function createBurnAndMintSignature(
    signer: SignerWithAddress,
    caller: string,
    burnId: number,
    burnAmount: number,
    mintId: number,
    mintAmount: number,
    deadline: number,
    nonce: number,
  ): Promise<string> {
    const chainId = (await ethers.provider.getNetwork()).chainId;

    // Create domain data according to EIP-712
    const domain = {
      name: DOMAIN_NAME,
      version: DOMAIN_VERSION,
      chainId: chainId,
      verifyingContract: await sandboxPasses.getAddress(),
    };

    // Define the types
    const types = {
      BurnAndMintRequest: [
        {name: 'caller', type: 'address'},
        {name: 'burnId', type: 'uint256'},
        {name: 'burnAmount', type: 'uint256'},
        {name: 'mintId', type: 'uint256'},
        {name: 'mintAmount', type: 'uint256'},
        {name: 'deadline', type: 'uint256'},
        {name: 'nonce', type: 'uint256'},
      ],
    };

    // Create the data to sign
    const value = {
      caller: caller,
      burnId: burnId,
      burnAmount: burnAmount,
      mintId: mintId,
      mintAmount: mintAmount,
      deadline: deadline,
      nonce: nonce,
    };

    // Sign the typed data properly
    return await signer.signTypedData(domain, types, value);
  }

  beforeEach(async function () {
    [
      admin,
      operator,
      signer,
      user1,
      user2,
      treasury,
      royaltyReceiver,
      trustedForwarder,
    ] = await ethers.getSigners();

    // Deploy mock ERC20 for payment token
    const MockERC20 = await ethers.getContractFactory('MockERC20');
    paymentToken = (await MockERC20.deploy(
      'Payment Token',
      'PAY',
      ethers.parseEther('1000000'),
    )) as MockERC20;
    await paymentToken.waitForDeployment();

    // Mint tokens to users
    await paymentToken.mint(user1.address, ethers.parseEther('1000'));
    await paymentToken.mint(user2.address, ethers.parseEther('1000'));

    // Deploy the contract using upgrades plugin
    const SandboxPasses = await ethers.getContractFactory(
      'SandboxPasses1155Upgradeable',
    );
    sandboxPasses = (await upgrades.deployProxy(SandboxPasses, [
      BASE_URI,
      royaltyReceiver.address,
      ROYALTY_PERCENTAGE,
      admin.address,
      operator.address,
      signer.address,
      await paymentToken.getAddress(),
      trustedForwarder.address,
      treasury.address,
    ])) as unknown as SandboxPasses1155Upgradeable;
    await sandboxPasses.waitForDeployment();

    // Set up default token configuration
    await sandboxPasses.connect(admin).configureToken(
      TOKEN_ID_1,
      true, // transferable
      MAX_SUPPLY,
      MAX_PER_WALLET,
      TOKEN_METADATA,
      ZERO_ADDRESS, // use default treasury
    );

    // Set up non-transferable token
    await sandboxPasses.connect(admin).configureToken(
      TOKEN_ID_2,
      false, // non-transferable
      MAX_SUPPLY,
      MAX_PER_WALLET,
      TOKEN_METADATA,
      ZERO_ADDRESS, // use default treasury
    );
  });

  describe('Initialization', function () {
    it('should initialize with correct values', async function () {
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
      const NEW_TOKEN_ID = 3;

      await sandboxPasses
        .connect(admin)
        .configureToken(
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
      await expect(
        sandboxPasses
          .connect(user1)
          .configureToken(3, true, 100, 10, 'metadata', ZERO_ADDRESS),
      ).to.be.revertedWithCustomError(
        sandboxPasses,
        'AccessControlUnauthorizedAccount',
      );
    });

    it("should not allow configuring a token that's already configured", async function () {
      await expect(
        sandboxPasses
          .connect(admin)
          .configureToken(TOKEN_ID_1, true, 100, 10, 'metadata', ZERO_ADDRESS),
      ).to.be.revertedWithCustomError(sandboxPasses, 'TokenAlreadyConfigured');
    });

    it('should allow updating token configuration', async function () {
      await sandboxPasses.connect(admin).updateTokenConfig(
        TOKEN_ID_1,
        200, // new max supply
        15, // new max per wallet
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
      // First mint some tokens
      await sandboxPasses
        .connect(admin)
        .adminMint(user1.address, TOKEN_ID_1, 50);

      // Try to update max supply to below current supply
      await expect(
        sandboxPasses
          .connect(admin)
          .updateTokenConfig(TOKEN_ID_1, 40, 10, TOKEN_METADATA, ZERO_ADDRESS),
      ).to.be.revertedWithCustomError(
        sandboxPasses,
        'MaxSupplyBelowCurrentSupply',
      );
    });

    it('should allow setting transferability', async function () {
      // Change transferable token to non-transferable
      await sandboxPasses.connect(admin).setTransferable(TOKEN_ID_1, false);

      const tokenConfig = await sandboxPasses.tokenConfigs(TOKEN_ID_1);
      expect(tokenConfig.transferable).to.be.false;

      // Change non-transferable token to transferable
      await sandboxPasses.connect(admin).setTransferable(TOKEN_ID_2, true);

      const tokenConfig2 = await sandboxPasses.tokenConfigs(TOKEN_ID_2);
      expect(tokenConfig2.transferable).to.be.true;
    });

    it('should allow updating transfer whitelist', async function () {
      // Whitelist user1 for non-transferable token
      await sandboxPasses
        .connect(admin)
        .updateTransferWhitelist(TOKEN_ID_2, [user1.address], true);

      expect(
        await sandboxPasses.isTransferWhitelisted(TOKEN_ID_2, user1.address),
      ).to.be.true;
      expect(
        await sandboxPasses.isTransferWhitelisted(TOKEN_ID_2, user2.address),
      ).to.be.false;

      // Remove user1 from whitelist
      await sandboxPasses
        .connect(admin)
        .updateTransferWhitelist(TOKEN_ID_2, [user1.address], false);

      expect(
        await sandboxPasses.isTransferWhitelisted(TOKEN_ID_2, user1.address),
      ).to.be.false;
    });
  });

  describe('Admin Minting', function () {
    it('should allow admin to mint tokens', async function () {
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
      await sandboxPasses
        .connect(admin)
        .adminBatchMint(
          user1.address,
          [TOKEN_ID_1, TOKEN_ID_2],
          [MINT_AMOUNT, MINT_AMOUNT * 2],
        );

      expect(await sandboxPasses.balanceOf(user1.address, TOKEN_ID_1)).to.equal(
        MINT_AMOUNT,
      );
      expect(await sandboxPasses.balanceOf(user1.address, TOKEN_ID_2)).to.equal(
        MINT_AMOUNT * 2,
      );
    });

    it('should allow admin to mint to multiple recipients', async function () {
      await sandboxPasses
        .connect(admin)
        .adminMultiRecipientMint(
          [user1.address, user2.address],
          [TOKEN_ID_1, TOKEN_ID_2],
          [MINT_AMOUNT, MINT_AMOUNT * 2],
        );

      expect(await sandboxPasses.balanceOf(user1.address, TOKEN_ID_1)).to.equal(
        MINT_AMOUNT,
      );
      expect(await sandboxPasses.balanceOf(user2.address, TOKEN_ID_2)).to.equal(
        MINT_AMOUNT * 2,
      );
    });

    it('should not allow minting unconfigured tokens', async function () {
      await expect(
        sandboxPasses.connect(admin).adminMint(user1.address, 999, MINT_AMOUNT),
      ).to.be.revertedWithCustomError(sandboxPasses, 'TokenNotConfigured');
    });

    it('should not allow exceeding max supply', async function () {
      await expect(
        sandboxPasses
          .connect(admin)
          .adminMint(user1.address, TOKEN_ID_1, MAX_SUPPLY + 1),
      ).to.be.revertedWithCustomError(sandboxPasses, 'MaxSupplyExceeded');
    });
  });

  describe('Signature-Based Minting', function () {
    it('should allow minting with valid signature', async function () {
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

    it('should allow batch minting with valid signatures', async function () {
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
  });

  describe('Burn and Mint Operations', function () {
    beforeEach(async function () {
      // Mint tokens to burn
      await sandboxPasses
        .connect(admin)
        .adminMint(user1.address, TOKEN_ID_1, MINT_AMOUNT);
    });

    it('should allow operator to burn and mint', async function () {
      await sandboxPasses
        .connect(operator)
        .operatorBurnAndMint(
          user1.address,
          user2.address,
          TOKEN_ID_1,
          2,
          TOKEN_ID_2,
          3,
        );

      expect(await sandboxPasses.balanceOf(user1.address, TOKEN_ID_1)).to.equal(
        MINT_AMOUNT - 2,
      );
      expect(await sandboxPasses.balanceOf(user2.address, TOKEN_ID_2)).to.equal(
        3,
      );
    });

    it('should allow operator to batch burn and mint', async function () {
      // Mint additional tokens for batch burn
      await sandboxPasses
        .connect(admin)
        .adminMint(user1.address, TOKEN_ID_2, MINT_AMOUNT);

      await sandboxPasses
        .connect(operator)
        .operatorBatchBurnAndMint(
          user1.address,
          user2.address,
          [TOKEN_ID_1, TOKEN_ID_2],
          [2, 3],
          [TOKEN_ID_2, TOKEN_ID_1],
          [4, 5],
        );

      expect(await sandboxPasses.balanceOf(user1.address, TOKEN_ID_1)).to.equal(
        MINT_AMOUNT - 2,
      );
      expect(await sandboxPasses.balanceOf(user1.address, TOKEN_ID_2)).to.equal(
        MINT_AMOUNT - 3,
      );
      expect(await sandboxPasses.balanceOf(user2.address, TOKEN_ID_1)).to.equal(
        5,
      );
      expect(await sandboxPasses.balanceOf(user2.address, TOKEN_ID_2)).to.equal(
        4,
      );
    });

    it('should allow user to burn and mint with valid signature', async function () {
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
      // Mint transferable and non-transferable tokens
      await sandboxPasses
        .connect(admin)
        .adminMint(user1.address, TOKEN_ID_1, MINT_AMOUNT); // Transferable
      await sandboxPasses
        .connect(admin)
        .adminMint(user1.address, TOKEN_ID_2, MINT_AMOUNT); // Non-transferable
    });

    it('should allow transferring transferable tokens', async function () {
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
      await expect(
        sandboxPasses
          .connect(user1)
          .safeTransferFrom(user1.address, user2.address, TOKEN_ID_2, 2, '0x'),
      ).to.be.revertedWithCustomError(sandboxPasses, 'TransferNotAllowed');
    });

    it('should allow whitelisted addresses to transfer non-transferable tokens', async function () {
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
      // Approve admin to transfer
      await sandboxPasses.connect(user1).setApprovalForAll(admin.address, true);

      // Admin should be able to transfer non-transferable tokens
      await sandboxPasses
        .connect(admin)
        .safeTransferFrom(user1.address, user2.address, TOKEN_ID_2, 2, '0x');

      expect(await sandboxPasses.balanceOf(user1.address, TOKEN_ID_2)).to.equal(
        MINT_AMOUNT - 2,
      );
      expect(await sandboxPasses.balanceOf(user2.address, TOKEN_ID_2)).to.equal(
        2,
      );
    });
  });

  describe('Royalties', function () {
    it('should return correct royalty info for default royalty', async function () {
      const salePrice = ethers.parseEther('1');
      const royaltyInfo = await sandboxPasses.royaltyInfo(
        TOKEN_ID_1,
        salePrice,
      );

      expect(royaltyInfo[0]).to.equal(royaltyReceiver.address);
      expect(royaltyInfo[1]).to.equal(
        (salePrice * ROYALTY_PERCENTAGE) / 10000n,
      );
    });

    it('should allow admin to set default royalty', async function () {
      const newRoyaltyPercentage = 1000n; // 10%

      await sandboxPasses
        .connect(admin)
        .setDefaultRoyalty(user2.address, newRoyaltyPercentage);

      const salePrice = ethers.parseEther('1');
      const royaltyInfo = await sandboxPasses.royaltyInfo(
        TOKEN_ID_1,
        salePrice,
      );

      expect(royaltyInfo[0]).to.equal(user2.address);
      expect(royaltyInfo[1]).to.equal(
        (salePrice * newRoyaltyPercentage) / 10000n,
      );
    });

    it('should allow admin to set token-specific royalty', async function () {
      const tokenRoyaltyPercentage = 800n; // 8%

      await sandboxPasses
        .connect(admin)
        .setTokenRoyalty(TOKEN_ID_2, user2.address, tokenRoyaltyPercentage);

      const salePrice = ethers.parseEther('1');
      const royaltyInfo = await sandboxPasses.royaltyInfo(
        TOKEN_ID_2,
        salePrice,
      );

      expect(royaltyInfo[0]).to.equal(user2.address);
      expect(royaltyInfo[1]).to.equal(
        (salePrice * tokenRoyaltyPercentage) / 10000n,
      );
    });
  });

  describe('Pause Functionality', function () {
    it('should allow admin to pause and unpause the contract', async function () {
      expect(await sandboxPasses.paused()).to.be.false;

      await sandboxPasses.connect(admin).pause();
      expect(await sandboxPasses.paused()).to.be.true;

      await sandboxPasses.connect(admin).unpause();
      expect(await sandboxPasses.paused()).to.be.false;
    });

    it('should not allow minting when paused', async function () {
      await sandboxPasses.connect(admin).pause();

      const price = ethers.parseEther('0.1');
      const deadline = (await time.latest()) + 3600;
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

      // Try to mint while paused
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
      ).to.be.revertedWithCustomError(sandboxPasses, 'EnforcedPause');
    });

    it('should not allow transfers when paused', async function () {
      // Mint tokens first
      await sandboxPasses
        .connect(admin)
        .adminMint(user1.address, TOKEN_ID_1, MINT_AMOUNT);

      // Pause the contract
      await sandboxPasses.connect(admin).pause();

      // Try to transfer while paused
      await expect(
        sandboxPasses
          .connect(user1)
          .safeTransferFrom(user1.address, user2.address, TOKEN_ID_1, 2, '0x'),
      ).to.be.revertedWithCustomError(sandboxPasses, 'EnforcedPause');
    });
  });

  describe('URI', function () {
    it('should return correct token URI', async function () {
      expect(await sandboxPasses.uri(TOKEN_ID_1)).to.equal(
        `${BASE_URI}${TOKEN_ID_1}.json`,
      );
    });

    it('should allow admin to update base URI', async function () {
      const newBaseURI = 'https://new-api.example.com/metadata/';

      await expect(sandboxPasses.connect(admin).setBaseURI(newBaseURI))
        .to.emit(sandboxPasses, 'BaseURISet')
        .withArgs(BASE_URI, newBaseURI);

      expect(await sandboxPasses.baseURI()).to.equal(newBaseURI);
      expect(await sandboxPasses.uri(TOKEN_ID_1)).to.equal(
        `${newBaseURI}${TOKEN_ID_1}.json`,
      );
    });
  });

  describe('ERC165/Interface Support', function () {
    it('should support ERC1155 interface', async function () {
      const ERC1155InterfaceId = '0xd9b67a26';
      expect(await sandboxPasses.supportsInterface(ERC1155InterfaceId)).to.be
        .true;
    });

    it('should support ERC2981 interface', async function () {
      const ERC2981InterfaceId = '0x2a55205a';
      expect(await sandboxPasses.supportsInterface(ERC2981InterfaceId)).to.be
        .true;
    });

    it('should support AccessControl interface', async function () {
      const AccessControlInterfaceId = '0x7965db0b';
      expect(await sandboxPasses.supportsInterface(AccessControlInterfaceId)).to
        .be.true;
    });
  });
});
