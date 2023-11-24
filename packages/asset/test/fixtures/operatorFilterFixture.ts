import {ethers, upgrades} from 'hardhat';
import {setupUsers} from '../../util';
import {
  DEFAULT_SUBSCRIPTION,
  CATALYST_BASE_URI,
  CATALYST_IPFS_CID_PER_TIER,
} from '../../data/constants';

const DEFAULT_BPS = 300;

export async function setupOperatorFilter() {
  const [
    deployer,
    upgradeAdmin,
    catalystAdmin,
    catalystMinter,
    assetAdmin,
    user1,
    user2,
    user3,
    user4,
    commonRoyaltyReceiver,
    managerAdmin,
    contractRoyaltySetter,
  ] = await ethers.getSigners();

  const TrustedForwarderFactory = await ethers.getContractFactory(
    'MockTrustedForwarder'
  );
  const TrustedForwarder = await TrustedForwarderFactory.deploy();

  const MockERC1155MarketPlace1Factory = await ethers.getContractFactory(
    'MockERC1155MarketPlace1'
  );

  const mockMarketPlace1 = await MockERC1155MarketPlace1Factory.deploy();
  await mockMarketPlace1.deployed();

  const MockERC1155MarketPlace2Factory = await ethers.getContractFactory(
    'MockERC1155MarketPlace2'
  );

  const mockMarketPlace2 = await MockERC1155MarketPlace2Factory.deploy();
  await mockMarketPlace2.deployed();

  const MockERC1155MarketPlace3Factory = await ethers.getContractFactory(
    'MockERC1155MarketPlace3'
  );

  const mockMarketPlace3 = await MockERC1155MarketPlace3Factory.deploy();
  await mockMarketPlace3.deployed();

  const MockERC1155MarketPlace4Factory = await ethers.getContractFactory(
    'MockERC1155MarketPlace4'
  );

  const mockMarketPlace4 = await MockERC1155MarketPlace4Factory.deploy();
  await mockMarketPlace4.deployed();
  const MockOperatorFilterRegistryFactory = await ethers.getContractFactory(
    'MockOperatorFilterRegistry'
  );
  const operatorFilterRegistry = await MockOperatorFilterRegistryFactory.deploy(
    DEFAULT_SUBSCRIPTION,
    [mockMarketPlace1.address, mockMarketPlace2.address]
  );
  await operatorFilterRegistry.deployed();

  const filterOperatorSubscriptionFactory = await ethers.getContractFactory(
    'MockOperatorFilterSubscription'
  );

  const filterOperatorSubscription =
    await filterOperatorSubscriptionFactory.deploy(
      deployer.address,
      operatorFilterRegistry.address
    );

  const operatorFilterRegistryAsSubscription =
    operatorFilterRegistry.connect(deployer);

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
      TrustedForwarder.address,
    ],
    {
      initializer: 'initialize',
    }
  );
  await RoyaltyManagerContract.deployed();

  const AssetFactory = await ethers.getContractFactory('MockAsset');
  const Asset = await upgrades.deployProxy(
    AssetFactory,
    [
      TrustedForwarder.address,
      assetAdmin.address,
      'ipfs://',
      filterOperatorSubscription.address,
      RoyaltyManagerContract.address,
    ],
    {
      initializer: 'initialize',
    }
  );

  const defaultAdminRole = await Asset.DEFAULT_ADMIN_ROLE();

  let MockOperatorFilterSubscriptionFactory = await ethers.getContractFactory(
    'MockOperatorFilterSubscription'
  );

  MockOperatorFilterSubscriptionFactory =
    await MockOperatorFilterSubscriptionFactory.connect(deployer);

  const operatorFilterSubscription =
    await MockOperatorFilterSubscriptionFactory.deploy(
      deployer.address,
      operatorFilterRegistry.address
    );

  const operatorFilterRegistryAsOwner = await operatorFilterRegistry.connect(
    deployer
  );

  const CatalystFactory = await ethers.getContractFactory('MockCatalyst');
  const Catalyst = await upgrades.deployProxy(
    CatalystFactory,
    [
      CATALYST_BASE_URI,
      TrustedForwarder.address,
      operatorFilterSubscription.address,
      catalystAdmin.address, // DEFAULT_ADMIN_ROLE
      catalystMinter.address, // MINTER_ROLE
      CATALYST_IPFS_CID_PER_TIER,
      RoyaltyManagerContract.address,
    ],
    {
      initializer: 'initialize',
    }
  );
  await Catalyst.deployed();

  const tnx2 = await Asset.setRegistryAndSubscribe(
    operatorFilterRegistry.address,
    filterOperatorSubscription.address
  );
  await tnx2.wait();

  const tnx3 = await Catalyst.setRegistryAndSubscribe(
    operatorFilterRegistry.address,
    operatorFilterSubscription.address
  );
  await tnx3.wait();
  const users = await setupUsers(
    [user1.address, user2.address, user3.address, user4.address],
    {
      Asset,
      Catalyst,
    }
  );

  return {
    mockMarketPlace1,
    mockMarketPlace2,
    mockMarketPlace3,
    mockMarketPlace4,
    operatorFilterRegistry,
    operatorFilterRegistryAsSubscription,
    filterOperatorSubscription,
    users,
    deployer,
    upgradeAdmin,
    Asset,
    DEFAULT_SUBSCRIPTION,
    operatorFilterRegistryAsOwner,
    operatorFilterSubscription,
    Catalyst,
    TrustedForwarder,
    assetAdmin,
    commonRoyaltyReceiver,
    DEFAULT_BPS,
    RoyaltyManagerContract,
    catalystAdmin,
    catalystMinter,
    defaultAdminRole,
    user1,
  };
}
