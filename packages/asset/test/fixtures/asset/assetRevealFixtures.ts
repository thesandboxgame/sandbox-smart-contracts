import {ethers, upgrades} from 'hardhat';
import {
  batchRevealSignature,
  burnAndRevealSignature,
  revealSignature,
} from '../../utils/revealSignature';
import {
  DEFAULT_SUBSCRIPTION,
  CATALYST_BASE_URI,
  CATALYST_IPFS_CID_PER_TIER,
} from '../../../data/constants';

const name = 'Sandbox Asset Reveal';
const version = '1.0';
const DEFAULT_BPS = 300;

export async function runRevealTestSetup() {
  const [
    catalystMinter,
    trustedForwarder,
    assetAdmin,
    user,
    catalystAdmin,
    catalystRoyaltyRecipient,
    authValidatorAdmin,
    backendAuthWallet,
    mockMarketplace1,
    mockMarketplace2,
    commonRoyaltyReceiver,
    managerAdmin,
    contractRoyaltySetter,
  ] = await ethers.getSigners();

  // test upgradeable contract using '@openzeppelin/hardhat-upgrades'
  // DEPLOY DEPENDENCIES: ASSET, CATALYST, AUTH VALIDATOR, OPERATOR FILTER
  // note: reveal tests use a MockMinter instead of AssetCreate

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
      commonRoyaltyReceiver.address,
      DEFAULT_BPS,
      RoyaltyManagerContract.address,
    ],
    {
      initializer: 'initialize',
    }
  );

  await AssetContract.deployed();

  // deploy wrapped TokenIdUtils contract
  const TokenIdUtilsFactory = await ethers.getContractFactory(
    'TokenIdUtilsWrapped'
  );
  const TokenIdUtilsContract = await TokenIdUtilsFactory.deploy();
  await TokenIdUtilsContract.deployed();

  const CatalystFactory = await ethers.getContractFactory('Catalyst');
  const CatalystContract = await upgrades.deployProxy(
    CatalystFactory,
    [
      CATALYST_BASE_URI,
      trustedForwarder.address,
      catalystRoyaltyRecipient.address,
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

  const MockAssetReveal = await ethers.getContractFactory('MockAssetReveal');
  const MockAssetRevealContract = await MockAssetReveal.deploy();
  await MockAssetRevealContract.deployed();

  // END DEPLOY DEPENDENCIES

  const AssetRevealFactory = await ethers.getContractFactory('AssetReveal');

  const AssetRevealContract = await upgrades.deployProxy(
    AssetRevealFactory,
    [
      name,
      version,
      AssetContract.address,
      AuthValidatorContract.address,
      trustedForwarder.address,
      assetAdmin.address,
    ],
    {
      initializer: 'initialize',
    }
  );

  await AssetRevealContract.deployed();

  // SETUP VALIDATOR
  await AuthValidatorContract.connect(authValidatorAdmin).setSigner(
    AssetRevealContract.address,
    backendAuthWallet.address
  );

  // SET UP ROLES
  const AssetRevealContractAsUser = AssetRevealContract.connect(user);
  const AssetRevealContractAsAdmin = AssetRevealContract.connect(assetAdmin);

  const MockMinterFactory = await ethers.getContractFactory('MockMinter');
  const MockMinterContract = await MockMinterFactory.deploy(
    AssetContract.address
  );
  const AssetContractAsAdmin = AssetContract.connect(assetAdmin);
  // add mock minter as minter
  const MinterRole = await AssetContract.MINTER_ROLE();
  const BurnerRole = await AssetContract.BURNER_ROLE();
  const AdminRole = await AssetContract.DEFAULT_ADMIN_ROLE();
  await AssetContractAsAdmin.grantRole(MinterRole, MockMinterContract.address);

  // add AssetReveal contracts as both MINTER and BURNER for Asset contract
  await AssetContractAsAdmin.grantRole(MinterRole, AssetRevealContract.address);
  await AssetContractAsAdmin.grantRole(BurnerRole, AssetRevealContract.address);
  // END SET UP ROLES

  // SETUP USER WITH MINTED ASSETS
  // mint a tier 5 asset with 10 copies
  const unRevMintTx = await MockMinterContract.mintAsset(
    user.address,
    10, // amount
    5, // tier
    false, // revealed
    'QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcfc9gy3CqptuoETJA' // metadata hash
  );
  const unRevResult = await unRevMintTx.wait();
  const unrevealedtokenId = unRevResult.events[5].args.tokenId.toString();

  // mint a tier 5 asset with 10 copies
  const unRevMintTx2 = await MockMinterContract.mintAsset(
    user.address,
    10,
    5,
    false,
    'QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcfc9gy3CqptuoETJD'
  );
  const unRevResult2 = await unRevMintTx2.wait();

  // TODO: check events used in fixture
  const unrevealedtokenId2 = unRevResult2.events[3].args.tokenId.toString();

  // mint a revealed version, tier 5 asset with 10 copies
  const revMintTx = await MockMinterContract.mintAsset(
    user.address,
    10,
    5,
    true,
    'QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcfc9gy3CqptuoETJC'
  );
  const revResult = await revMintTx.wait();
  const revealedtokenId = revResult.events[3].args.tokenId.toString();

  // END SETUP USER WITH MINTED ASSETS

  // HELPER FUNCTIONS
  const revealAsset = async (
    signature: string,
    tokenId: number,
    amounts: number[],
    metadataHashes: string[],
    revealHashes: string[]
  ) => {
    const tx = await AssetRevealContractAsUser.revealMint(
      signature,
      tokenId,
      amounts,
      metadataHashes,
      revealHashes
    );
    const result = await tx.wait();
    return result;
  };

  const revealAssetBatch = async (
    signature: string,
    tokenIds: number[],
    amounts: number[][],
    metadataHashes: string[][],
    revealHashes: string[][]
  ) => {
    const tx = await AssetRevealContractAsUser.revealBatchMint(
      signature,
      tokenIds,
      amounts,
      metadataHashes,
      revealHashes
    );
    const result = await tx.wait();
    return result;
  };

  const instantReveal = async (
    signature: string,
    tokenId: number,
    burnAmount: number,
    mintAmounts: number[],
    metadataHashes: string[],
    revealHashes: string[]
  ) => {
    const tx = await AssetRevealContractAsUser.burnAndReveal(
      signature,
      tokenId,
      burnAmount,
      mintAmounts,
      metadataHashes,
      revealHashes
    );
    const result = await tx.wait();
    return result;
  };

  const generateRevealSignature = async (
    revealer: string,
    prevTokenId: number,
    amounts: number[],
    metadataHashes: string[],
    revealHashes: string[]
  ) => {
    const signature = await revealSignature(
      revealer,
      prevTokenId,
      amounts,
      metadataHashes,
      revealHashes,
      AssetRevealContract,
      backendAuthWallet
    );
    return signature;
  };

  const generateBatchRevealSignature = async (
    revealer: string,
    prevTokenIds: number[],
    amounts: number[][],
    metadataHashes: string[][],
    revealHashes: string[][]
  ) => {
    const signature = await batchRevealSignature(
      revealer,
      prevTokenIds,
      amounts,
      metadataHashes,
      revealHashes,
      AssetRevealContract,
      backendAuthWallet
    );
    return signature;
  };

  const generateBurnAndRevealSignature = async (
    revealer: string,
    prevTokenId: number,
    amounts: number[],
    metadataHashes: string[],
    revealHashes: string[]
  ) => {
    const signature = await burnAndRevealSignature(
      revealer,
      prevTokenId,
      amounts,
      metadataHashes,
      revealHashes,
      AssetRevealContract,
      backendAuthWallet
    );
    return signature;
  };
  // END HELPER FUNCTIONS

  return {
    generateRevealSignature,
    generateBatchRevealSignature,
    generateBurnAndRevealSignature,
    revealAsset,
    revealAssetBatch,
    instantReveal,
    AssetRevealContract,
    AssetRevealContractAsUser,
    AssetRevealContractAsAdmin,
    MockAssetRevealContract,
    TokenIdUtilsContract,
    AssetContract,
    AuthValidatorContract,
    trustedForwarder,
    unrevealedtokenId,
    unrevealedtokenId2,
    revealedtokenId,
    AdminRole,
    user,
    assetAdmin,
  };
}
