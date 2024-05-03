import {AbiCoder, keccak256, Signer, toUtf8Bytes} from 'ethers';
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

export function getStorageSlotJS(key: string): string {
  return (
    '0x' +
    (
      BigInt(
        keccak256(
          AbiCoder.defaultAbiCoder().encode(
            ['uint256'],
            [BigInt(keccak256(toUtf8Bytes(key))) - 1n],
          ),
        ),
      ) & ~0xffn
    ).toString(16)
  );
}

export async function setupERC721Test(ret) {
  let x = 0;

  async function mint(to) {
    const bytes = '0x3333';
    const GRID_SIZE = 408;
    x = ++x;
    const y = 0;
    const size = 1;
    const tokenId = x + y * GRID_SIZE;
    const receipt = await ret.LandAsMinter.mintQuad(to, size, x, y, bytes);
    return {receipt, tokenId};
  }

  const tokenIds = [];
  for (let i = 0; i < 3; i++) {
    const {tokenId} = await mint(ret.landOwner);
    tokenIds.push(tokenId);
  }
  const [nonReceivingContract] = await deploy('ContractMock', [ret.deployer]);
  return {nonReceivingContract, tokenIds, mint, ...ret};
}

export async function setupContract(contractName: string, withProxy = false) {
  const [
    deployer,
    landOwner,
    seller,
    buyer,
    other,
    other1,
    other2,
    commonRoyaltyReceiver,
    landAdmin,
    MetadataRegistryAdmin,
    landMinter,
    operatorFilterSubscription,
    defaultSubscription,
  ] = await ethers.getSigners();

  const RoyaltyManagerFactory =
    await ethers.getContractFactory('RoyaltyManagerMock');
  const RoyaltyManagerContract = await RoyaltyManagerFactory.deploy(
    commonRoyaltyReceiver,
  );

  const MetadataRegistryFactory = await ethers.getContractFactory(
    'LandMetadataRegistryMock',
  );
  const MetadataRegistryContract = await upgrades.deployProxy(
    MetadataRegistryFactory,
    [await MetadataRegistryAdmin.getAddress()],
    {
      initializer: 'initialize',
    },
  );
  const MetadataRegistryContract2 = await MetadataRegistryFactory.deploy();

  const LandFactory = await ethers.getContractFactory(contractName);
  let LandContract;
  if (withProxy) {
    LandContract = await upgrades.deployProxy(
      LandFactory,
      [await landAdmin.getAddress()],
      {
        initializer: 'initialize',
      },
    );
  } else {
    LandContract = await LandFactory.deploy();
    await LandContract.initialize(landAdmin);
  }
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
  const LandAsAdmin = LandContract.connect(landAdmin);

  await LandAsAdmin.setMetadataRegistry(MetadataRegistryContract);
  await LandAsAdmin.transferOwnership(landOwner);
  await LandAsAdmin.setRoyaltyManager(RoyaltyManagerContract);
  await LandAsAdmin.setMinter(landMinter, true);

  const LandAsMinter = LandContract.connect(landMinter);
  const LandAsOwner = LandContract.connect(landOwner);
  const LandAsOther = LandContract.connect(other);
  const LandAsOther1 = LandContract.connect(other1);
  const LandAsOther2 = LandContract.connect(other2);

  const MetadataRegistryAsAdmin = MetadataRegistryContract.connect(
    MetadataRegistryAdmin,
  );

  await TestERC721TokenReceiver.setTokenContract(LandAsOther);

  const ERC20AsBuyer = ERC20Contract.connect(buyer);
  // End set up roles

  const LandContractWithoutMetadataRegistry = await LandFactory.deploy();
  await LandContractWithoutMetadataRegistry.initialize(landAdmin);

  return {
    PolygonLandFactory: LandFactory,
    RoyaltyManagerContract,
    LandContract,
    LandAsAdmin,
    LandAsMinter,
    LandAsOwner,
    LandAsOther,
    LandAsOther1,
    LandAsOther2,
    LandContractWithoutMetadataRegistry,
    MetadataRegistryContract,
    MetadataRegistryContract2,
    MetadataRegistryAsAdmin,
    TestERC721TokenReceiver,
    MockMarketPlace,
    ERC20Contract,
    MockMarketPlace1,
    MockMarketPlace2,
    MockMarketPlace3,
    commonRoyaltyReceiver,
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
    operatorFilterSubscription,
    defaultSubscription,
  };
}

export async function setupOperatorFilter(ret) {
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
    ret.defaultSubscription,
    [MockMarketPlace1, MockMarketPlace2],
  );

  await OperatorFilterRegistry.registerAndCopyEntries(
    ret.operatorFilterSubscription,
    ret.defaultSubscription,
  );

  await ret.LandAsAdmin.setOperatorRegistry(OperatorFilterRegistry);
  await ret.LandAsAdmin.register(ret.operatorFilterSubscription, true);

  const PolygonLandMockContract = await upgrades.deployProxy(
    ret.PolygonLandFactory,
    [await ret.landAdmin.getAddress()],
    {
      initializer: 'initialize',
    },
  );

  const LandRegistryNotSetAsDeployer = PolygonLandMockContract.connect(
    ret.deployer,
  );
  const LandRegistryNotSetAsAdmin = PolygonLandMockContract.connect(
    ret.landAdmin,
  );
  await LandRegistryNotSetAsAdmin.setMinter(ret.landMinter, true);
  const LandRegistryNotSetAsMinter = PolygonLandMockContract.connect(
    ret.landMinter,
  );
  const LandRegistryNotSetAsOther = PolygonLandMockContract.connect(ret.other);
  return {
    ...ret,
    OperatorFilterRegistry,
    LandRegistryNotSetAsDeployer,
    LandRegistryNotSetAsAdmin,
    LandRegistryNotSetAsMinter,
    LandRegistryNotSetAsOther,
    MockMarketPlace1,
    MockMarketPlace2,
    MockMarketPlace3,
  };
}
