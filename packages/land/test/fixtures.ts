import {AbiCoder, Contract, keccak256, Signer, toUtf8Bytes} from 'ethers';
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

export async function deployWithProxy(
  name: string,
  users: Signer[] = [],
): Promise<Contract[]> {
  const contract = await deploy(name, users);
  const Proxy = await ethers.getContractFactory('ProxyMock');
  // This uses signers[0]
  const proxy = await Proxy.deploy(contract[0]);
  await proxy.waitForDeployment();
  const ret = [];
  for (let i = 0; i < contract.length; i++) {
    ret[i] = await contract[i].attach(await proxy.getAddress());
  }
  // add implementation contract
  ret.push(contract[0]);
  return ret;
}

export function getId(layer: number, x: number, y: number): string {
  const h = BigInt(x + y * 408) + (BigInt(layer - 1) << 248n);
  return '0x' + h.toString(16).padStart(62, '0');
}

export function getStorageSlotJS(key: string): bigint {
  return (
    BigInt(
      keccak256(
        AbiCoder.defaultAbiCoder().encode(
          ['uint256'],
          [BigInt(keccak256(toUtf8Bytes(key))) - 1n],
        ),
      ),
    ) & ~0xffn
  );
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

  const RoyaltySplitterFactory = await ethers.getContractFactory(
    'RoyaltySplitterMock',
  );
  const RoyaltySplitter = await RoyaltySplitterFactory.deploy();

  const RoyaltyManagerFactory =
    await ethers.getContractFactory('RoyaltyManagerMock');
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

  await LandContract.setAdmin(landAdmin);

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
  await LandAsAdmin.transferOwnership(await landOwner.getAddress());
  await LandAsAdmin.setRoyaltyManager(
    await RoyaltyManagerContract.getAddress(),
  );
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

  const RoyaltySplitterFactory = await ethers.getContractFactory(
    'RoyaltySplitterMock',
  );
  const RoyaltySplitter = await RoyaltySplitterFactory.deploy();

  const RoyaltyManagerFactory =
    await ethers.getContractFactory('RoyaltyManagerMock');
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

  const LandFactory = await ethers.getContractFactory('LandMockWithoutCheck');
  const LandContract = await LandFactory.deploy();

  await LandContract.setAdmin(landAdmin);

  const LandAsAdmin = LandContract.connect(landAdmin);
  await LandAsAdmin.setMinter(await landMinter.getAddress(), true);
  const LandAsMinter = LandContract.connect(landMinter);
  await LandAsAdmin.setMetaTransactionProcessor(MetaTransactionContract, false);
  const LandAsOther = LandContract.connect(other);
  const LandAsOther1 = LandContract.connect(other1);
  const LandMockContract = await LandFactory.deploy();
  await LandMockContract.setAdmin(landAdmin);

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

  await LandAsAdmin.transferOwnership(await landOwner.getAddress());
  await LandAsAdmin.setRoyaltyManager(
    await RoyaltyManagerContract.getAddress(),
  );
  await LandAsAdmin.setOperatorRegistry(OperatorFilterRegistry);
  await LandAsAdmin.register(operatorFilterSubscription, true);

  const LandRegistryNotSetAsDeployer = LandMockContract.connect(deployer);
  const LandRegistryNotSetAsAdmin = LandMockContract.connect(landAdmin);
  await LandRegistryNotSetAsAdmin.setMinter(
    await landMinter.getAddress(),
    true,
  );
  const LandRegistryNotSetAsMinter = LandMockContract.connect(landMinter);
  const LandRegistryNotSetAsOther = LandMockContract.connect(other);
  return {
    LandContract,
    LandAsAdmin,
    LandAsOther,
    LandAsOther1,
    LandAsMinter,
    OperatorFilterRegistry,
    LandRegistryNotSetAsDeployer,
    LandRegistryNotSetAsAdmin,
    LandRegistryNotSetAsMinter,
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

  const RoyaltySplitterFactory = await ethers.getContractFactory(
    'RoyaltySplitterMock',
  );
  const RoyaltySplitter = await RoyaltySplitterFactory.deploy();

  const RoyaltyManagerFactory =
    await ethers.getContractFactory('RoyaltyManagerMock');
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
  const PolygonLandContract = await PolygonLandFactory.deploy();

  await PolygonLandContract.setAdmin(landAdmin);

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

  await LandAsAdmin.setTrustedForwarder(
    await TrustedForwarderContract.getAddress(),
  );

  await LandAsAdmin.transferOwnership(await landOwner.getAddress());
  await LandAsAdmin.setRoyaltyManager(
    await RoyaltyManagerContract.getAddress(),
  );
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

  const RoyaltySplitterFactory = await ethers.getContractFactory(
    'RoyaltySplitterMock',
  );
  const RoyaltySplitter = await RoyaltySplitterFactory.deploy();

  const RoyaltyManagerFactory =
    await ethers.getContractFactory('RoyaltyManagerMock');
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

  const PolygonLandFactory = await ethers.getContractFactory(
    'PolygonLandMockWithoutCheck',
  );
  const PolygonLandContract = await PolygonLandFactory.deploy();

  await PolygonLandContract.setAdmin(landAdmin);

  const LandAsAdmin = PolygonLandContract.connect(landAdmin);
  await LandAsAdmin.setTrustedForwarder(
    await TrustedForwarderContract.getAddress(),
  );

  await LandAsAdmin.transferOwnership(await landOwner.getAddress());
  await LandAsAdmin.setRoyaltyManager(
    await RoyaltyManagerContract.getAddress(),
  );

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

  const PolygonLandMockContract = await PolygonLandFactory.deploy();
  await PolygonLandMockContract.setAdmin(landAdmin);
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
