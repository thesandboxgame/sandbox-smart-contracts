import {ethers, upgrades} from 'hardhat';
const DEFAULT_SUBSCRIPTION = '0x3cc6CddA760b79bAfa08dF41ECFA224f810dCeB6';
import {setupUsers} from '../../util';

export async function setupOperatorFilter() {
  const [
    deployer,
    upgradeAdmin,
    filterOperatorSubscription,
    user1,
    user2,
    user3,
    user4,
  ] = await ethers.getSigners();

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
    filterOperatorSubscription
  );
  const tnx = await operatorFilterRegistryAsSubscription.registerAndCopyEntries(
    filterOperatorSubscription.address,
    DEFAULT_SUBSCRIPTION
  );

  await tnx.wait();
  const ERC1155Factory = await ethers.getContractFactory('TestERC1155');
  const ERC1155 = await upgrades.deployProxy(ERC1155Factory, ['testERC1155'], {
    initializer: 'initialize',
  });

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

  const ERC721Factory = await ethers.getContractFactory('TestERC721');
  const ERC721 = await upgrades.deployProxy(
    ERC721Factory,
    ['test', 'testERC721'],
    {
      initializer: 'initialize',
    }
  );
  await ERC721.deployed();
  const tnx2 = await ERC1155.setRegistryAndSubscribe(
    operatorFilterRegistry.address,
    filterOperatorSubscription.address
  );
  await tnx2.wait();

  const tnx3 = await ERC721.setRegistryAndSubscribe(
    operatorFilterRegistry.address,
    operatorFilterSubscription.address
  );
  await tnx3.wait();

  const UnregisteredTokenFactory = await ethers.getContractFactory(
    'UnregisteredToken'
  );
  const UnregisteredToken = await upgrades.deployProxy(
    UnregisteredTokenFactory,
    ['UnregisteredToken', operatorFilterSubscription.address, true],
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
    operatorFilterRegistryAsSubscription,
    filterOperatorSubscription,
    users,
    deployer,
    upgradeAdmin,
    ERC1155,
    DEFAULT_SUBSCRIPTION,
    operatorFilterRegistryAsOwner,
    operatorFilterSubscription,
    ERC721,
    UnregisteredToken,
  };
}
