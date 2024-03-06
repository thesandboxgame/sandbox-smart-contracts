import {Signer} from 'ethers';
import {ethers, upgrades} from 'hardhat';

export async function deploy(
  name: string,
  users: Signer[] = [],
  ...args: unknown[]
): Promise<unknown> {
  const factory = await ethers.getContractFactory(name);
  const contract = await factory.deploy(...args);
  await contract.waitForDeployment();
  const ret = [];
  for (const s of users) {
    ret.push(await contract.connect(s));
  }
  ret.push(contract);
  return ret;
}

export function getId(layer: number, x: number, y: number): string {
  const h = BigInt(x + y * 408) + (BigInt(layer - 1) << 248n);
  return '0x' + h.toString(16).padStart(62, '0');
}

export async function setupLandContract() {
  const [
    deployer,
    landOwner,
    seller,
    buyer,
    other,
    other1,
    other2,
    trustedForwarder,
    commonRoyaltyReceiver,
    managerAdmin,
    landAdmin,
    landMinter,
    contractRoyaltySetter,
  ] = await ethers.getSigners();

  const RoyaltySplitterFactory =
    await ethers.getContractFactory('RoyaltySplitter');
  const RoyaltySplitter = await RoyaltySplitterFactory.deploy();

  const RoyaltyManagerFactory =
    await ethers.getContractFactory('RoyaltyManager');
  const RoyaltyManagerContract = await upgrades.deployProxy(
    RoyaltyManagerFactory,
    [
      commonRoyaltyReceiver.address,
      5000,
      await RoyaltySplitter.getAddress(),
      managerAdmin.address,
      contractRoyaltySetter.address,
      trustedForwarder.address,
    ],
    {
      initializer: 'initialize',
    },
  );

  const MetaTransactionContractFactory =
    await ethers.getContractFactory('ContractMock');
  const MetaTransactionContract = await MetaTransactionContractFactory.deploy();

  const LandFactory = await ethers.getContractFactory('Land');
  const LandContract = await LandFactory.deploy();

  await LandContract.initialize(
    await MetaTransactionContract.getAddress(),
    await landAdmin.getAddress(),
    await RoyaltyManagerContract.getAddress(),
    await landOwner.getAddress(),
    4,
  );

  // deploy mocks
  const TestERC721TokenReceiverFactory = await ethers.getContractFactory(
    'ERC721TokenReceiverMock',
  );
  const TestERC721TokenReceiver = await TestERC721TokenReceiverFactory.deploy();

  const MockMarketPlaceFactory =
    await ethers.getContractFactory('MarketPlaceMock');
  const MockMarketPlace = await MockMarketPlaceFactory.deploy();

  const ERC20ContractFactory = await ethers.getContractFactory('ERC20Mock');
  const ERC20Contract = await ERC20ContractFactory.deploy();

  // setup role
  await LandContract.connect(landAdmin).setMinter(
    await landMinter.getAddress(),
    true,
  );
  const LandAsMinter = LandContract.connect(landMinter);
  const LandAsAdmin = LandContract.connect(landAdmin);
  const LandAsOwner = LandContract.connect(landOwner);
  const LandAsOther = LandContract.connect(other);
  const LandAsOther1 = LandContract.connect(other1);
  const LandAsOther2 = LandContract.connect(other2);

  await TestERC721TokenReceiver.setTokenContract(LandAsOther);
  await LandAsAdmin.setMetaTransactionProcessor(MetaTransactionContract, false);
  const managerAsRoyaltySetter = RoyaltyManagerContract.connect(
    contractRoyaltySetter,
  );
  const contractRoyaltySetterRole =
    await RoyaltyManagerContract.CONTRACT_ROYALTY_SETTER_ROLE();
  const ERC20AsBuyer = ERC20Contract.connect(buyer);
  // End set up roles

  return {
    manager: RoyaltyManagerContract,
    MetaTransactionContract,
    RoyaltySplitter,
    LandContract,
    LandAsAdmin,
    LandAsMinter,
    LandAsOwner,
    LandAsOther,
    LandAsOther1,
    LandAsOther2,
    MockMarketPlace,
    ERC20Contract,
    TestERC721TokenReceiver,
    managerAsRoyaltySetter,
    contractRoyaltySetterRole,
    commonRoyaltyReceiver,
    managerAdmin,
    contractRoyaltySetter,
    ERC20AsBuyer,
    deployer,
    landAdmin,
    landOwner,
    landMinter,
    buyer,
    seller,
    other,
    other1,
    other2,
    mintQuad: async (
      to: Signer | string,
      size: number,
      x: number,
      y: number,
    ) => {
      await LandAsMinter.mintQuad(to, size, x, y, '0x');
    },
  };
}

export async function setupLandOperatorFilter() {
  const [
    deployer,
    landOwner,
    commonRoyaltyReceiver,
    managerAdmin,
    contractRoyaltySetter,
    trustedForwarder,
    other,
    other1,
    landAdmin,
    landMinter,
    operatorFilterSubscription,
    defaultSubscription,
  ] = await ethers.getSigners();

  const RoyaltySplitterFactory =
    await ethers.getContractFactory('RoyaltySplitter');
  const RoyaltySplitter = await RoyaltySplitterFactory.deploy();

  const RoyaltyManagerFactory =
    await ethers.getContractFactory('RoyaltyManager');
  const RoyaltyManagerContract = await upgrades.deployProxy(
    RoyaltyManagerFactory,
    [
      commonRoyaltyReceiver.address,
      5000,
      await RoyaltySplitter.getAddress(),
      managerAdmin.address,
      contractRoyaltySetter.address,
      trustedForwarder.address,
    ],
    {
      initializer: 'initialize',
    },
  );

  const MetaTransactionContractFactory =
    await ethers.getContractFactory('ContractMock');
  const MetaTransactionContract = await MetaTransactionContractFactory.deploy();

  const LandFactory = await ethers.getContractFactory('LandMock');
  const LandContract = await LandFactory.deploy();

  await LandContract.initialize(
    await MetaTransactionContract.getAddress(),
    await landAdmin.getAddress(),
    await RoyaltyManagerContract.getAddress(),
    await landOwner.getAddress(),
  );

  await LandContract.connect(landAdmin).setMinter(
    await landMinter.getAddress(),
    true,
  );
  const LandAsAdmin = LandContract.connect(landAdmin);
  await LandAsAdmin.setMetaTransactionProcessor(MetaTransactionContract, false);
  const LandAsOther = LandContract.connect(other);
  const LandAsOther1 = LandContract.connect(other1);
  const LandMockContract = await LandFactory.deploy();
  await LandMockContract.initialize(
    await MetaTransactionContract.getAddress(),
    await landAdmin.getAddress(),
    await RoyaltyManagerContract.getAddress(),
    await landOwner.getAddress(),
  );

  const MarketPlaceToFilterMockFactory = await ethers.getContractFactory(
    'MarketPlaceToFilterMock',
  );
  const MockMarketPlace1 = await MarketPlaceToFilterMockFactory.deploy();
  const MockMarketPlace2 = await MarketPlaceToFilterMockFactory.deploy();

  const MockMarketPlace3Factory =
    await ethers.getContractFactory('MarketPlaceMock');
  const MockMarketPlace3 = await MockMarketPlace3Factory.deploy();

  const OperatorFilterRegistryFactory = await ethers.getContractFactory(
    'OperatorFilterRegistryMock',
  );
  const OperatorFilterRegistry = await OperatorFilterRegistryFactory.deploy(
    defaultSubscription,
    [MockMarketPlace1, MockMarketPlace2],
  );

  await OperatorFilterRegistry.registerAndCopyEntries(
    operatorFilterSubscription,
    defaultSubscription,
  );

  await LandAsAdmin.setOperatorRegistry(OperatorFilterRegistry);
  await LandAsAdmin.register(operatorFilterSubscription, true);

  const LandRegistryNotSetAsDeployer = LandMockContract.connect(deployer);
  const LandRegistryNotSetAsAdmin = LandMockContract.connect(landAdmin);
  const LandRegistryNotSetAsOther = LandMockContract.connect(other);
  return {
    LandContract,
    LandAsAdmin,
    LandAsOther,
    LandAsOther1,
    OperatorFilterRegistry,
    LandRegistryNotSetAsDeployer,
    LandRegistryNotSetAsAdmin,
    LandRegistryNotSetAsOther,
    MockMarketPlace1,
    MockMarketPlace2,
    MockMarketPlace3,
    deployer,
    landAdmin,
    operatorFilterSubscription,
    other,
    other1,
  };
}

export async function setupPolygonLandContract() {
  const [
    deployer,
    landOwner,
    seller,
    buyer,
    other,
    other1,
    other2,
    trustedForwarder,
    commonRoyaltyReceiver,
    managerAdmin,
    landAdmin,
    landMinter,
    contractRoyaltySetter,
  ] = await ethers.getSigners();

  const RoyaltySplitterFactory =
    await ethers.getContractFactory('RoyaltySplitter');
  const RoyaltySplitter = await RoyaltySplitterFactory.deploy();

  const RoyaltyManagerFactory =
    await ethers.getContractFactory('RoyaltyManager');
  const RoyaltyManagerContract = await upgrades.deployProxy(
    RoyaltyManagerFactory,
    [
      commonRoyaltyReceiver.address,
      5000,
      await RoyaltySplitter.getAddress(),
      managerAdmin.address,
      contractRoyaltySetter.address,
      trustedForwarder.address,
    ],
    {
      initializer: 'initialize',
    },
  );

  const TrustedForwarderContractFactory = await ethers.getContractFactory(
    'MetaTxForwarderMock',
  );
  const TrustedForwarderContract =
    await TrustedForwarderContractFactory.deploy();

  const PolygonLandFactory = await ethers.getContractFactory('PolygonLand');
  const PolygonLandContract = await upgrades.deployProxy(
    PolygonLandFactory,
    [
      await TrustedForwarderContract.getAddress(),
      await landAdmin.getAddress(),
      await RoyaltyManagerContract.getAddress(),
      await landOwner.getAddress(),
      3,
    ],
    {
      initializer: 'initialize',
    },
  );

  // mock contract deploy
  const TestERC721TokenReceiverFactory = await ethers.getContractFactory(
    'ERC721TokenReceiverMock',
  );
  const TestERC721TokenReceiver = await TestERC721TokenReceiverFactory.deploy();

  const MockMarketPlaceFactory =
    await ethers.getContractFactory('MarketPlaceMock');
  const MockMarketPlace = await MockMarketPlaceFactory.deploy();

  const ERC20ContractFactory = await ethers.getContractFactory('ERC20Mock');
  const ERC20Contract = await ERC20ContractFactory.deploy();

  const MarketPlaceToFilterMockFactory = await ethers.getContractFactory(
    'MarketPlaceToFilterMock',
  );
  const MockMarketPlace1 = await MarketPlaceToFilterMockFactory.deploy();
  const MockMarketPlace2 = await MarketPlaceToFilterMockFactory.deploy();
  const MockMarketPlace3 = await MarketPlaceToFilterMockFactory.deploy();

  // setup role
  const LandAsAdmin = PolygonLandContract.connect(landAdmin);
  await PolygonLandContract.connect(landAdmin).setMinter(
    await landMinter.getAddress(),
    true,
  );
  const LandAsMinter = PolygonLandContract.connect(landMinter);
  const LandAsOwner = PolygonLandContract.connect(landOwner);
  const LandAsOther = PolygonLandContract.connect(other);
  const LandAsOther1 = PolygonLandContract.connect(other1);
  const LandAsOther2 = PolygonLandContract.connect(other2);

  await TestERC721TokenReceiver.setTokenContract(LandAsOther);
  const managerAsRoyaltySetter = RoyaltyManagerContract.connect(
    contractRoyaltySetter,
  );
  const contractRoyaltySetterRole =
    await RoyaltyManagerContract.CONTRACT_ROYALTY_SETTER_ROLE();
  const ERC20AsBuyer = ERC20Contract.connect(buyer);
  // End set up roles

  return {
    manager: RoyaltyManagerContract,
    RoyaltySplitter,
    TrustedForwarderContract,
    PolygonLandContract,
    LandAsAdmin,
    LandAsMinter,
    LandAsOwner,
    LandAsOther,
    LandAsOther1,
    LandAsOther2,
    TestERC721TokenReceiver,
    MockMarketPlace,
    ERC20Contract,
    MockMarketPlace1,
    MockMarketPlace2,
    MockMarketPlace3,
    managerAsRoyaltySetter,
    contractRoyaltySetterRole,
    commonRoyaltyReceiver,
    managerAdmin,
    contractRoyaltySetter,
    ERC20AsBuyer,
    deployer,
    landAdmin,
    landOwner,
    landMinter,
    buyer,
    seller,
    other,
    other1,
    other2,
  };
}

export async function setupPolygonLandOperatorFilter() {
  const [
    deployer,
    landOwner,
    commonRoyaltyReceiver,
    managerAdmin,
    contractRoyaltySetter,
    trustedForwarder,
    other,
    other1,
    landAdmin,
    operatorFilterSubscription,
    defaultSubscription,
  ] = await ethers.getSigners();

  const RoyaltySplitterFactory =
    await ethers.getContractFactory('RoyaltySplitter');
  const RoyaltySplitter = await RoyaltySplitterFactory.deploy();

  const RoyaltyManagerFactory =
    await ethers.getContractFactory('RoyaltyManager');
  const RoyaltyManagerContract = await upgrades.deployProxy(
    RoyaltyManagerFactory,
    [
      commonRoyaltyReceiver.address,
      5000,
      await RoyaltySplitter.getAddress(),
      managerAdmin.address,
      contractRoyaltySetter.address,
      trustedForwarder.address,
    ],
    {
      initializer: 'initialize',
    },
  );

  const TrustedForwarderContractFactory = await ethers.getContractFactory(
    'MetaTxForwarderMock',
  );
  const TrustedForwarderContract =
    await TrustedForwarderContractFactory.deploy();

  const PolygonLandFactory = await ethers.getContractFactory('PolygonLandMock');
  const PolygonLandContract = await upgrades.deployProxy(
    PolygonLandFactory,
    [
      await TrustedForwarderContract.getAddress(),
      await landAdmin.getAddress(),
      await RoyaltyManagerContract.getAddress(),
      await landOwner.getAddress(),
    ],
    {
      initializer: 'initialize',
    },
  );

  const LandAsAdmin = PolygonLandContract.connect(landAdmin);
  const LandAsOther = PolygonLandContract.connect(other);
  const LandAsOther1 = PolygonLandContract.connect(other1);
  const MarketPlaceToFilterMockFactory = await ethers.getContractFactory(
    'MarketPlaceToFilterMock',
  );
  const MockMarketPlace1 = await MarketPlaceToFilterMockFactory.deploy();
  const MockMarketPlace2 = await MarketPlaceToFilterMockFactory.deploy();

  const MockMarketPlace3Factory =
    await ethers.getContractFactory('MarketPlaceMock');
  const MockMarketPlace3 = await MockMarketPlace3Factory.deploy();

  const OperatorFilterRegistryFactory = await ethers.getContractFactory(
    'OperatorFilterRegistryMock',
  );
  const OperatorFilterRegistry = await OperatorFilterRegistryFactory.deploy(
    defaultSubscription,
    [MockMarketPlace1, MockMarketPlace2],
  );

  await OperatorFilterRegistry.registerAndCopyEntries(
    operatorFilterSubscription,
    defaultSubscription,
  );

  await LandAsAdmin.setOperatorRegistry(OperatorFilterRegistry);
  await LandAsAdmin.register(operatorFilterSubscription, true);

  const PolygonLandMockContract = await upgrades.deployProxy(
    PolygonLandFactory,
    [
      await TrustedForwarderContract.getAddress(),
      await landAdmin.getAddress(),
      await RoyaltyManagerContract.getAddress(),
      await landOwner.getAddress(),
    ],
    {
      initializer: 'initialize',
    },
  );
  const LandRegistryNotSetAsDeployer =
    PolygonLandMockContract.connect(deployer);
  const LandRegistryNotSetAsAdmin = PolygonLandMockContract.connect(landAdmin);
  const LandRegistryNotSetAsOther = PolygonLandMockContract.connect(other);
  return {
    PolygonLandContract,
    LandAsAdmin,
    LandAsOther,
    LandAsOther1,
    OperatorFilterRegistry,
    LandRegistryNotSetAsDeployer,
    LandRegistryNotSetAsAdmin,
    LandRegistryNotSetAsOther,
    MockMarketPlace1,
    MockMarketPlace2,
    MockMarketPlace3,
    deployer,
    landAdmin,
    operatorFilterSubscription,
    other,
    other1,
  };
}
