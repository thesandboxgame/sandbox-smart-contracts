import {Signer} from 'ethers';
import {ethers, upgrades} from 'hardhat';

export type TesteableContracts = 'LandV3' | 'PolygonLandV2';

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

async function initLand(
  landAsAdmin,
  landAsDeployer,
  deployer,
  landAdmin,
  minter,
) {
  const [metaTransactionContract] = await deploy('ContractMock', [deployer]);
  await landAsDeployer.initialize(metaTransactionContract, landAdmin);
  await landAsAdmin.setMinter(minter, true);
  // from: 05_remove_land_sand_meta_tx
  await landAsAdmin.setMetaTransactionProcessor(metaTransactionContract, false);
  return {metaTransactionContract};
}

async function initPolygonLand(
  landAsAdmin,
  landAsDeployer,
  deployer,
  landAdmin,
  minter,
) {
  const [trustedForwarder] = await deploy('MetaTxForwarderMock', [deployer]);
  await landAsDeployer.initialize(trustedForwarder);
  // TODO: this must be fixed in the contract, admin must be an initializing argument.
  await landAsDeployer.changeAdmin(landAdmin);
  await landAsAdmin.setMinter(minter, true);
  return {trustedForwarder};
}

export async function setupMainContract(mainContract: TesteableContracts) {
  const [deployer, landAdmin, minter, owner, other, other1, other2] =
    await ethers.getSigners();
  const [
    landAsDeployer,
    landAsAdmin,
    landAsMinter,
    landAsOwner,
    landAsOther,
    landAsOther1,
    landAsOther2,
  ] = await deploy(mainContract, [
    deployer,
    landAdmin,
    minter,
    owner,
    other,
    other1,
    other2,
  ]);
  const [testERC721TokenReceiver] = await deploy('ERC721TokenReceiverMock', [
    deployer,
  ]);
  await testERC721TokenReceiver.setTokenContract(landAsOther);

  const initData =
    mainContract === 'LandV3'
      ? await initLand(landAsAdmin, landAsDeployer, deployer, landAdmin, minter)
      : await initPolygonLand(
          landAsAdmin,
          landAsDeployer,
          deployer,
          landAdmin,
          minter,
        );
  return {
    ...initData,
    deployer,
    landAdmin,
    minter,
    owner,
    other,
    other1,
    other2,
    landAsDeployer,
    landAsAdmin,
    landAsMinter,
    landAsOwner,
    landAsOther,
    landAsOther1,
    landAsOther2,
    mintQuad: async (
      to: Signer | string,
      size: number,
      x: number,
      y: number,
    ) => {
      await landAsMinter.mintQuad(to, size, x, y, '0x');
    },
    testERC721TokenReceiver,
  };
}

export async function setupOperatorFilter(mainContract: TesteableContracts) {
  const [
    deployer,
    operatorFilterSubscription,
    defaultSubscription,
    landAdmin,
    minter,
    other,
    other1,
  ] = await ethers.getSigners();
  const [mockMarketPlace1] = await deploy('MarketPlaceToFilterMock', [
    deployer,
  ]);
  const [mockMarketPlace2] = await deploy('MarketPlaceToFilterMock', [
    deployer,
  ]);
  // Any contract will to, but must be !-MockMarketPlace
  const [mockMarketPlace3] = await deploy('MarketPlaceMock', [deployer]);
  const [landAsDeployer, landAsAdmin, landAsOther, landAsOther1] = await deploy(
    mainContract + 'Mock',
    [deployer, landAdmin, other, other1],
  );
  const [operatorFilterRegistry] = await deploy(
    'OperatorFilterRegistryMock',
    [deployer],
    defaultSubscription,
    [mockMarketPlace1, mockMarketPlace2],
  );
  const [
    landRegistryNotSetAsDeployer,
    landRegistryNotSetAsAdmin,
    landRegistryNotSetAsOther,
  ] = await deploy(mainContract + 'Mock', [deployer, landAdmin, other]);

  let initData;
  if (mainContract === 'LandV3') {
    initData = await initLand(
      landAsAdmin,
      landAsDeployer,
      deployer,
      landAdmin,
      minter,
    );
    await landRegistryNotSetAsDeployer.initialize(
      initData.metaTransactionContract,
      landAdmin,
    );
  } else {
    initData = await initPolygonLand(
      landAsAdmin,
      landAsDeployer,
      deployer,
      landAdmin,
      minter,
    );
  }
  await operatorFilterRegistry.registerAndCopyEntries(
    operatorFilterSubscription,
    defaultSubscription,
  );
  await landAsAdmin.setOperatorRegistry(operatorFilterRegistry);
  await landAsAdmin.register(operatorFilterSubscription, true);

  return {
    ...initData,
    landAsAdmin,
    landAsDeployer,
    landAsOther,
    landAsOther1,
    landRegistryNotSetAsDeployer,
    landRegistryNotSetAsAdmin,
    landRegistryNotSetAsOther,
    operatorFilterRegistry,
    defaultSubscription,
    mockMarketPlace1,
    mockMarketPlace2,
    mockMarketPlace3,
    deployer,
    operatorFilterSubscription,
    other,
    other1,
  };
}

export async function setupLandContract() {
  const [
    deployer,
    seller,
    buyer,
    other,
    other1,
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
  const LandAsOther = LandContract.connect(other);

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
    LandAsOther,
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
    landMinter,
    buyer,
    seller,
    other,
    other1,
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
    4,
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
    4,
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
  const LandAsOther = PolygonLandContract.connect(other);
  const LandAsOther1 = PolygonLandContract.connect(other1);

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
    LandAsOther,
    LandAsOther1,
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
      3,
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
      3,
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
