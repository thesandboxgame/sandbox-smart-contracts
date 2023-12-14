import {ethers, upgrades} from 'hardhat';
const DEFAULT_SUBSCRIPTION = '0x3cc6CddA760b79bAfa08dF41ECFA224f810dCeB6';
import {setupUsers} from '../../util';

export async function setupOperatorFilter() {
  const [
    deployer,
    upgradeAdmin,
    assetAdmin,
    catalystAdmin,
    user1,
    user2,
    user3,
    user4,
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

  const operatorFilterSubscriptionFactory = await ethers.getContractFactory(
    'MockOperatorFilterSubscription'
  );

  const assetOperatorFilterSubscription =
    await operatorFilterSubscriptionFactory.deploy(
      assetAdmin.address,
      operatorFilterRegistry.address
    );

  const catalystOperatorFilterSubscription =
    await operatorFilterSubscriptionFactory.deploy(
      catalystAdmin.address,
      operatorFilterRegistry.address
    );

  const basicOperatorFilterSubscription =
    await operatorFilterSubscriptionFactory.deploy(
      user1.address,
      operatorFilterRegistry.address
    );

  const ERC1155Factory = await ethers.getContractFactory('TestERC1155');
  const ERC1155 = await upgrades.deployProxy(
    ERC1155Factory,
    ['testERC1155', TrustedForwarder.address],
    {
      initializer: 'initialize',
    }
  );

  const ERC721Factory = await ethers.getContractFactory('TestERC721');
  const ERC721 = await upgrades.deployProxy(
    ERC721Factory,
    ['test', 'testERC721', TrustedForwarder.address],
    {
      initializer: 'initialize',
    }
  );
  await ERC721.deployed();
  const tnx2 = await ERC1155.setRegistryAndSubscribe(
    operatorFilterRegistry.address,
    assetOperatorFilterSubscription.address
  );
  await tnx2.wait();

  const tnx3 = await ERC721.setRegistryAndSubscribe(
    operatorFilterRegistry.address,
    catalystOperatorFilterSubscription.address
  );
  await tnx3.wait();

  const UnregisteredTokenFactory = await ethers.getContractFactory(
    'UnregisteredToken'
  );
  const UnregisteredToken = await upgrades.deployProxy(
    UnregisteredTokenFactory,
    [
      'UnregisteredToken',
      assetOperatorFilterSubscription.address,
      true,
      TrustedForwarder.address,
    ],
    {
      initializer: 'initialize',
    }
  );

  const users = await setupUsers(
    [user1.address, user2.address, user3.address, user4.address],
    {
      ERC1155,
      ERC721,
      UnregisteredToken,
    }
  );

  return {
    mockMarketPlace1,
    mockMarketPlace2,
    mockMarketPlace3,
    mockMarketPlace4,
    operatorFilterRegistry,
    users,
    deployer,
    upgradeAdmin,
    ERC1155,
    DEFAULT_SUBSCRIPTION,
    ERC721,
    UnregisteredToken,
    assetOperatorFilterSubscription,
    catalystOperatorFilterSubscription,
    basicOperatorFilterSubscription,
  };
}
