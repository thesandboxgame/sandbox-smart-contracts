import {ethers, upgrades} from 'hardhat';
import {
  createAssetMintSignature,
  createMultipleAssetsMintSignature,
  createLazyMintSignature,
  createLazyMintMultipleAssetsSignature,
} from '../../utils/createSignature';
import {
  DEFAULT_SUBSCRIPTION,
  CATALYST_BASE_URI,
  CATALYST_IPFS_CID_PER_TIER,
} from '../../../data/constants';
import {BigNumber} from 'ethers';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {parseEther} from 'ethers/lib/utils';

const name = 'Sandbox Asset Create';
const version = '1.0';

export type LazyMintBatchData = [
  tiers: number[],
  amounts: number[],
  unitPrices: BigNumber[],
  paymentTokens: string[],
  metadataHashes: string[],
  maxSupplies: number[],
  creators: string[]
];

export async function runCreateTestSetup() {
  const [
    catalystMinter,
    trustedForwarder,
    assetAdmin,
    user,
    otherWallet,
    catalystAdmin,
    authValidatorAdmin,
    backendAuthWallet,
    commonRoyaltyReceiver,
    managerAdmin,
    contractRoyaltySetter,
    mockMarketplace1,
    mockMarketplace2,
    creator,
    secondCreator,
    thirdCreator,
    fourthCreator,
    fifthCreator,
    treasury,
  ] = await ethers.getSigners();

  // test upgradeable contract using '@openzeppelin/hardhat-upgrades'
  // DEPLOY DEPENDENCIES: ASSET, CATALYST, AUTH VALIDATOR, OPERATOR FILTER REGISTRANT, ROYALTIES, MOCK EXCHANGE

  const MockOperatorFilterRegistryFactory = await ethers.getContractFactory(
    'MockOperatorFilterRegistry'
  );

  const operatorFilterRegistry = await MockOperatorFilterRegistryFactory.deploy(
    DEFAULT_SUBSCRIPTION,
    [mockMarketplace1.address, mockMarketplace2.address]
  );

  // Operator Filter Registrant
  const OperatorFilterSubscriptionFactory = await ethers.getContractFactory(
    'MockOperatorFilterSubscription'
  );

  // Provide: address _owner, address _localRegistry
  const OperatorFilterSubscriptionContract =
    await OperatorFilterSubscriptionFactory.deploy(
      assetAdmin.address,
      operatorFilterRegistry.address
    );

  const RoyaltySplitterFactory = await ethers.getContractFactory(
    'RoyaltySplitter'
  );
  const RoyaltySplitter = await RoyaltySplitterFactory.deploy();

  const RoyaltyManagerFactory = await ethers.getContractFactory(
    'RoyaltyManager'
  );
  const RoyaltyManagerContract = await upgrades.deployProxy(
    RoyaltyManagerFactory,
    [
      commonRoyaltyReceiver.address,
      5000,
      RoyaltySplitter.address,
      managerAdmin.address,
      contractRoyaltySetter.address,
      trustedForwarder.address,
    ],
    {
      initializer: 'initialize',
    }
  );
  await RoyaltyManagerContract.deployed();

  const AssetFactory = await ethers.getContractFactory('Asset');
  const AssetContract = await upgrades.deployProxy(
    AssetFactory,
    [
      trustedForwarder.address,
      assetAdmin.address,
      'ipfs://',
      OperatorFilterSubscriptionContract.address,
      RoyaltyManagerContract.address,
    ],
    {
      initializer: 'initialize',
    }
  );

  await AssetContract.deployed();
  const RoyaltyManagerAsAdmin = RoyaltyManagerContract.connect(managerAdmin);
  const splitterDeployerRole =
    await RoyaltyManagerContract.SPLITTER_DEPLOYER_ROLE();
  await RoyaltyManagerAsAdmin.grantRole(
    splitterDeployerRole,
    AssetContract.address
  );
  const CatalystFactory = await ethers.getContractFactory('Catalyst');
  const CatalystContract = await upgrades.deployProxy(
    CatalystFactory,
    [
      CATALYST_BASE_URI,
      trustedForwarder.address,
      OperatorFilterSubscriptionContract.address,
      catalystAdmin.address, // DEFAULT_ADMIN_ROLE
      catalystMinter.address, // MINTER_ROLE
      CATALYST_IPFS_CID_PER_TIER,
      RoyaltyManagerContract.address,
    ],
    {
      initializer: 'initialize',
    }
  );

  await CatalystContract.deployed();

  const AuthValidatorFactory = await ethers.getContractFactory(
    'AuthSuperValidator'
  );
  const AuthValidatorContract = await AuthValidatorFactory.deploy(
    authValidatorAdmin.address
  );

  await AuthValidatorContract.deployed();

  const MockERC20Factory = await ethers.getContractFactory('TestERC20');
  const MockERC20Contract = await MockERC20Factory.deploy('MockERC20', 'M20');

  // Mint some tokens to the user

  await MockERC20Contract.mint(user.address, parseEther('100'));

  const MockExchangeFactory = await ethers.getContractFactory('MockExchange');
  const MockExchangeContract = await MockExchangeFactory.deploy(
    CatalystContract.address,
    MockERC20Contract.address
  );

  // give MockExchangeContract minter role on CatalystContract
  const CATALYST_MINTER_ROLE = await CatalystContract.MINTER_ROLE();
  await CatalystContract.connect(catalystAdmin).grantRole(
    CATALYST_MINTER_ROLE,
    MockExchangeContract.address
  );

  // END DEPLOY DEPENDENCIES

  const MockAssetCreate = await ethers.getContractFactory('MockAssetCreate');
  const MockAssetCreateContract = await MockAssetCreate.deploy();
  await MockAssetCreateContract.deployed();

  const AssetCreateFactory = await ethers.getContractFactory('AssetCreate');

  const AssetCreateContract = await upgrades.deployProxy(
    AssetCreateFactory,
    [
      name,
      version,
      AssetContract.address,
      CatalystContract.address,
      AuthValidatorContract.address,
      trustedForwarder.address,
      assetAdmin.address, // DEFAULT_ADMIN_ROLE
    ],
    {
      initializer: 'initialize',
    }
  );

  await AssetCreateContract.deployed();

  const AssetCreateContractAsUser = AssetCreateContract.connect(user);

  // SETUP VALIDATOR
  await AuthValidatorContract.connect(authValidatorAdmin).setSigner(
    AssetCreateContract.address,
    backendAuthWallet.address
  );

  // SETUP ROLES
  // get AssetContract as DEFAULT_ADMIN_ROLE
  const AssetAsAdmin = AssetContract.connect(assetAdmin);
  const MinterRole = await AssetAsAdmin.MINTER_ROLE();
  await AssetAsAdmin.grantRole(MinterRole, AssetCreateContract.address);

  // get CatalystContract as DEFAULT_ADMIN_ROLE
  const CatalystAsAdmin = CatalystContract.connect(catalystAdmin);
  const CatalystBurnerRole = await CatalystAsAdmin.BURNER_ROLE();
  await CatalystAsAdmin.grantRole(
    CatalystBurnerRole,
    AssetCreateContract.address
  );

  const AdminRole = await AssetCreateContract.DEFAULT_ADMIN_ROLE();

  const AssetCreateContractAsAdmin = AssetCreateContract.connect(assetAdmin);
  const SpecialMinterRole = await AssetCreateContract.SPECIAL_MINTER_ROLE();

  const PauserRole = await AssetCreateContract.PAUSER_ROLE();
  await AssetCreateContractAsAdmin.grantRole(PauserRole, assetAdmin.address);
  // END SETUP ROLES

  // SETUP LAZY MINT
  await AssetCreateContractAsAdmin.setExchangeContract(
    MockExchangeContract.address
  );
  await AssetCreateContractAsAdmin.setLazyMintFeeReceiver(treasury.address);
  await AssetCreateContractAsAdmin.setLazyMintFee(1000); // 10%

  // HELPER FUNCTIONS
  const grantSpecialMinterRole = async (address: string) => {
    await AssetCreateContractAsAdmin.grantRole(SpecialMinterRole, address);
  };

  const mintCatalyst = async (
    tier: number,
    amount: number,
    to = user.address
  ) => {
    const signer = catalystMinter;
    await CatalystContract.connect(signer).mint(to, tier, amount);
  };

  const mintSingleAsset = async (
    signature: string,
    tier: number,
    amount: number,
    revealed: boolean,
    metadataHash: string
  ) => {
    const tx = await AssetCreateContractAsUser.createAsset(
      signature,
      tier,
      amount,
      revealed,
      metadataHash,
      user.address
    );
    const result = await tx.wait();
    return result;
  };

  const mintMultipleAssets = async (
    signature: string,
    tiers: number[],
    amounts: number[],
    revealed: boolean[],
    metadataHashes: string[]
  ) => {
    const tx = await AssetCreateContractAsUser.createMultipleAssets(
      signature,
      tiers,
      amounts,
      revealed,
      metadataHashes,
      user.address
    );

    const result = await tx.wait();
    return result;
  };

  const mintSpecialAsset = async (
    signature: string,
    amount: number,
    metadataHash: string
  ) => {
    const tx = await AssetCreateContractAsUser.createSpecialAsset(
      signature,
      amount,
      metadataHash,
      user.address
    );
    const result = await tx.wait();
    return result;
  };

  const mintMultipleSpecialAssets = async (
    signature: string,
    amounts: number[],
    metadataHashes: string[]
  ) => {
    const tx = await AssetCreateContractAsUser.createMultipleSpecialAssets(
      signature,
      amounts,
      metadataHashes,
      user.address
    );
    const result = await tx.wait();
    return result;
  };

  const approveAndCall = async (
    account: SignerWithAddress,
    amount: BigNumber,
    fnName: string,
    data: unknown[]
  ) => {
    const encodedData = AssetCreateContract.interface.encodeFunctionData(
      fnName,
      data
    );

    const tx = await MockERC20Contract.connect(account).approveAndCall(
      AssetCreateContract.address,
      amount,
      encodedData
    );
    const result = await tx.wait();
    return result;
  };

  const approveSandForExchange = async (
    owner: SignerWithAddress,
    amount: BigNumber
  ) => {
    await MockERC20Contract.connect(owner).approve(
      MockExchangeContract.address,
      amount
    );
  };

  const approveSandForAssetCreate = async (
    owner: SignerWithAddress,
    amount: BigNumber
  ) => {
    await MockERC20Contract.connect(owner).approve(
      AssetCreateContract.address,
      amount
    );
  };

  const lazyMintAsset = async (
    signature: string,
    tier: number,
    amount: number,
    unitPrice: BigNumber,
    paymentToken: string,
    metadataHash: string,
    maxSupply: number,
    creator: string,
    as: SignerWithAddress = user,
    from: string = as.address,
    exchangeMatch: unknown[] = []
  ) => {
    const tx = await AssetCreateContract.connect(as).lazyCreateAsset(
      from,
      signature,
      [
        as.address,
        tier,
        amount,
        unitPrice,
        paymentToken,
        metadataHash,
        maxSupply,
        creator,
      ],
      exchangeMatch
    );
    const result = await tx.wait();
    return result;
  };

  const lazyMintMultipleAssets = async (
    from: string,
    signature: string,
    mintData: LazyMintBatchData,
    as: SignerWithAddress = user,
    exchangeMatch: unknown[] = []
  ) => {
    const tx = await AssetCreateContract.connect(
      as || user
    ).lazyCreateMultipleAssets(
      from,
      signature,
      [as.address, ...mintData],
      exchangeMatch
    );
    const result = await tx.wait();
    return result;
  };

  const getCreatorNonce = async (creator: string) => {
    const nonce = await AssetCreateContract.creatorNonces(creator);
    return nonce;
  };

  const generateSingleMintSignature = async (
    creator: string,
    tier: number,
    amount: number,
    revealed: boolean,
    metadataHash: string
  ) => {
    const signature = await createAssetMintSignature(
      creator,
      tier,
      amount,
      revealed,
      metadataHash,
      AssetCreateContract,
      backendAuthWallet
    );
    return signature;
  };

  const generateMultipleMintSignature = async (
    creator: string,
    tiers: number[],
    amounts: number[],
    revealed: boolean[],
    metadataHashes: string[]
  ) => {
    const signature = await createMultipleAssetsMintSignature(
      creator,
      tiers,
      amounts,
      revealed,
      metadataHashes,
      AssetCreateContract,
      backendAuthWallet
    );
    return signature;
  };

  const generateLazyMintSignature = async (
    creator: string,
    tier: number,
    amount: number,
    unitPrice: BigNumber,
    paymentToken: string,
    metadataHash: string,
    maxSupply: number,
    caller: SignerWithAddress = user
  ) => {
    const signature = await createLazyMintSignature(
      creator,
      tier,
      amount,
      unitPrice,
      paymentToken,
      metadataHash,
      maxSupply,
      AssetCreateContract,
      backendAuthWallet,
      caller
    );
    return signature;
  };

  const generateLazyMintMultipleAssetsSignature = async (
    mintData: LazyMintBatchData,
    caller: SignerWithAddress = user
  ) => {
    const signature = await createLazyMintMultipleAssetsSignature(
      ...mintData,
      AssetCreateContract,
      backendAuthWallet,
      caller
    );
    return signature;
  };

  const pause = async () => {
    await AssetCreateContractAsAdmin.pause();
  };

  const unpause = async () => {
    await AssetCreateContractAsAdmin.unpause();
  };

  function extractTokenIdFromEventData(data: string): string {
    const tokenIdHex = data.slice(0, 66);
    return tokenIdHex;
  }

  // END HELPER FUNCTIONS

  const sampleExchangeOrderData = [
    {
      orderLeft: {
        maker: '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65',
        makeAsset: {
          assetType: {
            assetClass: '0x1',
            data: '0x00000000000000000000000068b1d87f95878fe05b998f19b66f4baba5de1aed',
          },
          value: 10000000000,
        },
        taker: '0x0000000000000000000000000000000000000000',
        takeAsset: {
          assetType: {
            assetClass: '0x1',
            data: '0x0000000000000000000000003aa5ebb10dc797cac828524e59a333d0a371443c',
          },
          value: 20000000000,
        },
        makeRecipient: '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65',
        salt: 1,
        start: 0,
        end: 0,
      },
      signatureLeft:
        '0x0708d272a71f1dc6901914ac10f64fb902e7b0ec9830e629cacf4c3e0d8742ae5bcb064da7a6cbaffd197379d8169769fc69338a3244cf05372543468f9773401c',
      orderRight: {
        maker: '0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc',
        makeAsset: {
          assetType: {
            assetClass: '0x1',
            data: '0x0000000000000000000000003aa5ebb10dc797cac828524e59a333d0a371443c',
          },
          value: 20000000000,
        },
        taker: '0x0000000000000000000000000000000000000000',
        takeAsset: {
          assetType: {
            assetClass: '0x1',
            data: '0x00000000000000000000000068b1d87f95878fe05b998f19b66f4baba5de1aed',
          },
          value: 10000000000,
        },
        makeRecipient: '0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc',
        salt: 1,
        start: 0,
        end: 0,
      },
      signatureRight:
        '0x51d72ad2c75d40a230ef44d11eab33d80ff6bff9a2dbfebc89626d075ba37ca84b4a10e4a2b2f924a5e4888853eae1f13f17e3264d5c410a4b7cfdc336a0f2911c',
    },
  ];

  return {
    metadataHashes: [
      'QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcfc9gy3CqptuoETJA',
      'QmcU8NLdWyoDAbPc67irYpCnCH9ciRUjMC784dvRfy1Fja',
    ],
    additionalMetadataHash: 'QmZEhV6rMsZfNyAmNKrWuN965xaidZ8r5nd2XkZq9yZ95L',
    user,
    creator,
    secondCreator,
    thirdCreator,
    fourthCreator,
    fifthCreator,
    treasury,
    AdminRole,
    PauserRole,
    trustedForwarder,
    otherWallet,
    AssetContract,
    AssetCreateContract,
    AssetCreateContractAsUser,
    AssetCreateContractAsAdmin,
    AuthValidatorContract,
    CatalystContract,
    MockERC20Contract,
    MockAssetCreateContract,
    sampleExchangeOrderData,
    mintCatalyst,
    mintSingleAsset,
    approveAndCall,
    approveSandForExchange,
    approveSandForAssetCreate,
    mintMultipleAssets,
    mintSpecialAsset,
    mintMultipleSpecialAssets,
    lazyMintAsset,
    lazyMintMultipleAssets,
    grantSpecialMinterRole,
    generateSingleMintSignature,
    generateMultipleMintSignature,
    generateLazyMintSignature,
    generateLazyMintMultipleAssetsSignature,
    getCreatorNonce,
    pause,
    unpause,
    extractTokenIdFromEventData,
  };
}
