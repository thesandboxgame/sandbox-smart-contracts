import {ethers, upgrades} from 'hardhat';
import {setupUsers} from '../../util';
import {
  DEFAULT_SUBSCRIPTION,
  CATALYST_BASE_URI,
  CATALYST_IPFS_CID_PER_TIER,
  CATALYST_DEFAULT_ROYALTY,
} from '../../data/constants';

export async function setupOperatorFilter() {
  const [
    deployer,
    upgradeAdmin,
    filterOperatorSubscription,
    trustedForwarder,
    catalystAdmin,
    catalystMinter,
    catalystRoyaltyRecipient,
    assetAdmin,
    user1,
    user2,
    user3,
    user4,
  ] = await ethers.getSigners();

  // const OperatorFilterSubscriptionFactory = await ethers.getContractFactory(
  //   'OperatorFilterRegistrant'
  // );
  // const OperatorFilterSubscription =
  //   await OperatorFilterSubscriptionFactory.deploy();

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
  const operatorFilterRegistryAsSubscription = operatorFilterRegistry.connect(
    await ethers.getSigner(filterOperatorSubscription.address)
  );
  const tnx = await operatorFilterRegistryAsSubscription.registerAndCopyEntries(
    filterOperatorSubscription.address,
    DEFAULT_SUBSCRIPTION
  );
  await tnx.wait();
  const AssetFactory = await ethers.getContractFactory('MockAsset');
  const Asset = await upgrades.deployProxy(
    AssetFactory,
    [
      trustedForwarder.address,
      assetAdmin.address,
      [1, 2, 3, 4, 5, 6],
      [2, 4, 6, 8, 10, 12],
      'ipfs://',
      filterOperatorSubscription.address,
    ],
    {
      initializer: 'initialize',
    }
  );

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

  const operatorFilterRegistryAsDeployer = await operatorFilterRegistry.connect(
    deployer
  );

  const CatalystFactory = await ethers.getContractFactory('MockCatalyst');
  const Catalyst = await upgrades.deployProxy(
    CatalystFactory,
    [
      CATALYST_BASE_URI,
      trustedForwarder.address,
      catalystRoyaltyRecipient.address,
      operatorFilterSubscription.address,
      catalystAdmin.address, // DEFAULT_ADMIN_ROLE
      catalystMinter.address, // MINTER_ROLE
      CATALYST_DEFAULT_ROYALTY,
      CATALYST_IPFS_CID_PER_TIER,
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
    operatorFilterRegistryAsDeployer,
    operatorFilterSubscription,
    Catalyst,
  };
}
