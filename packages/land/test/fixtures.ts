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
  await landAsDeployer.initialize(
    metaTransactionContract,
    landAdmin,
    '0x388C818CA8B9251b393131C08a736A67ccB19297',
  );
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

export async function setupRoyaltyRegistry() {
  const [
    deployer,
    seller,
    buyer,
    ,
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

  const metaTransactionContractFactory =
    await ethers.getContractFactory('ContractMock');
  const metaTransactionContract = await metaTransactionContractFactory.deploy();

  const LandFactory = await ethers.getContractFactory('LandV3');
  const LandContractAsDeployer = await upgrades.deployProxy(
    LandFactory,
    [
      await metaTransactionContract.getAddress(),
      await landAdmin.getAddress(),
      await RoyaltyManagerContract.getAddress(),
    ],
    {
      initializer: 'initialize',
    },
  );

  const MockMarketPlaceFactory =
    await ethers.getContractFactory('MarketPlaceMock');
  const mockMarketplace = await MockMarketPlaceFactory.deploy();

  const ERC20ContractFactory = await ethers.getContractFactory('ERC20Mock');
  const ERC20Contract = await ERC20ContractFactory.deploy();

  // setup role
  await LandContractAsDeployer.connect(landAdmin).setMinter(
    await landMinter.getAddress(),
    true,
  );
  const LandAsMinter = LandContractAsDeployer.connect(landMinter);
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
    LandContractAsDeployer,
    LandAsMinter,
    mockMarketplace,
    ERC20Contract,
    managerAsRoyaltySetter,
    contractRoyaltySetterRole,
    commonRoyaltyReceiver,
    managerAdmin,
    contractRoyaltySetter,
    ERC20AsBuyer,
    deployer,
    buyer,
    seller,
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
      '0x388C818CA8B9251b393131C08a736A67ccB19297',
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
