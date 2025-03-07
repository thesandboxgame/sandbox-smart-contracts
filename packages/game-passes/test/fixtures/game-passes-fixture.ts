import {SignerWithAddress} from '@nomicfoundation/hardhat-ethers/signers';
import {AddressLike, BigNumberish, BytesLike} from 'ethers';
import {ethers, upgrades} from 'hardhat';
import {MockERC20, SandboxPasses1155Upgradeable} from '../../typechain-types';

export async function runCreateTestSetup() {
  const DOMAIN_NAME = 'SandboxPasses1155';
  const DOMAIN_VERSION = '1';
  const BASE_URI = 'https://api.example.com/token/';
  const ROYALTY_PERCENTAGE = 500n; // 5%
  const TOKEN_ID_1 = 1;
  const TOKEN_ID_2 = 2;
  const TOKEN_ID_3 = 3;
  const TOKEN_ID_4 = 4;
  const MINT_AMOUNT = 5;
  const MAX_SUPPLY = 100;
  const MAX_PER_WALLET = 10;
  const TOKEN_METADATA = 'ipfs://QmToken1';

  const [
    admin,
    operator,
    signer,
    user1,
    user2,
    treasury,
    royaltyReceiver,
    trustedForwarder,
    owner,
  ] = await ethers.getSigners();

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

  const deployToken = async () => {
    const MockERC20 = await ethers.getContractFactory('MockERC20');
    return (await MockERC20.deploy(
      'Payment Token',
      'PAY',
      ethers.parseEther('1000000'),
    )) as MockERC20;
  };

  // Create fixture for contract deployment and setup

  // Deploy mock ERC20 for payment token
  const MockERC20 = await ethers.getContractFactory('MockERC20');
  const paymentToken = (await MockERC20.deploy(
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
  const sandboxPasses = (await upgrades.deployProxy(SandboxPasses, [
    BASE_URI,
    royaltyReceiver.address,
    ROYALTY_PERCENTAGE,
    admin.address,
    operator.address,
    signer.address,
    await paymentToken.getAddress(),
    trustedForwarder.address,
    treasury.address,
    owner.address,
  ])) as unknown as SandboxPasses1155Upgradeable;
  await sandboxPasses.waitForDeployment();

  // Set up default token configuration
  await sandboxPasses.connect(admin).configureToken(
    TOKEN_ID_1,
    true, // transferable
    MAX_SUPPLY,
    MAX_PER_WALLET,
    TOKEN_METADATA,
    ethers.ZeroAddress, // use default treasury
  );

  // Set up non-transferable token
  await sandboxPasses.connect(admin).configureToken(
    TOKEN_ID_2,
    false, // non-transferable
    MAX_SUPPLY,
    MAX_PER_WALLET,
    TOKEN_METADATA,
    ethers.ZeroAddress, // use default treasury
  );
  // Before testing burn and mint operations, mint tokens to the users
  // This helper function will make testing burn operations easier
  async function mintTokensForBurn(
    to: string,
    tokenId: number,
    amount: number,
  ) {
    await sandboxPasses.connect(admin).adminMint(to, tokenId, amount);
  }

  const approveAndCallMint = async (
    account: SignerWithAddress,
    amount: bigint,
    values: [
      AddressLike,
      BigNumberish,
      BigNumberish,
      BigNumberish,
      BigNumberish,
      BytesLike,
    ],
  ) => {
    const encodedData = sandboxPasses.interface.encodeFunctionData(
      'mint',
      values,
    );

    const tx = await paymentToken
      .connect(account)
      .approveAndCall(await sandboxPasses.getAddress(), amount, encodedData);
    const result = await tx.wait();
    return result;
  };

  const approveAndCallBatchMint = async (
    account: SignerWithAddress,
    amount: bigint,
    values: [
      AddressLike,
      BigNumberish[],
      BigNumberish[],
      BigNumberish[],
      BigNumberish[],
      BytesLike[],
    ],
  ) => {
    const encodedData = sandboxPasses.interface.encodeFunctionData(
      'batchMint',
      values,
    );

    const tx = await paymentToken
      .connect(account)
      .approveAndCall(await sandboxPasses.getAddress(), amount, encodedData);
    const result = await tx.wait();
    return result;
  };

  return {
    SandboxPasses,
    sandboxPasses,
    admin,
    operator,
    signer,
    user1,
    user2,
    treasury,
    royaltyReceiver,
    trustedForwarder,
    owner: admin,
    paymentToken,
    deployToken,
    createMintSignature,
    createBurnAndMintSignature,
    mintTokensForBurn,
    approveAndCallMint,
    approveAndCallBatchMint,
    DOMAIN_NAME,
    DOMAIN_VERSION,
    BASE_URI,
    ROYALTY_PERCENTAGE,
    TOKEN_ID_1,
    TOKEN_ID_2,
    TOKEN_ID_3,
    TOKEN_ID_4,
    MINT_AMOUNT,
    MAX_SUPPLY,
    MAX_PER_WALLET,
    TOKEN_METADATA,
  };
}
