import {ethers, upgrades} from 'hardhat';
const DEFAULT_BPS = 300;

export function generateAssetId(creator: string, assetNumber: number) {
  const hex = assetNumber.toString(16);
  const hexLength = hex.length;
  let zeroAppends = '';
  const zeroAppendsLength = 24 - hexLength;
  for (let i = 0; i < zeroAppendsLength; i++) {
    zeroAppends = zeroAppends + '0';
  }
  return `0x${zeroAppends}${hex}${creator.slice(2)}`;
}

export async function assetRoyaltyDistribution() {
  const [
    deployer,
    assetAdmin,
    assetMinter,
    buyer,
    seller,
    trustedForwarder,
    commonRoyaltyReceiver,
    managerAdmin,
    contractRoyaltySetter,
    user,
    royaltyReceiver,
    commonRoyaltyReceiver2,
    royaltyReceiver2,
    creator,
  ] = await ethers.getSigners();

  // test upgradeable contract using '@openzeppelin/hardhat-upgrades'

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
  const Asset = await upgrades.deployProxy(
    AssetFactory,
    [
      trustedForwarder.address,
      assetAdmin.address,
      'ipfs://',
      commonRoyaltyReceiver.address,
      DEFAULT_BPS,
      RoyaltyManagerContract.address,
    ],
    {
      initializer: 'initialize',
    }
  );

  await Asset.deployed();

  const FallbackRegistryFactory = await ethers.getContractFactory(
    'FallbackRegistry'
  );
  const FallbackRegistry = await FallbackRegistryFactory.deploy(
    deployer.address
  );

  const RoyaltyRegistryFactory = await ethers.getContractFactory(
    'RoyaltyRegistry'
  );
  const RoyaltyRegistry = await RoyaltyRegistryFactory.deploy(
    '0x0000000000000000000000000000000000000000'
  );

  const RoyaltyEngineFactory = await ethers.getContractFactory(
    'RoyaltyEngineV1'
  );
  const RoyaltyEngineV1 = await RoyaltyEngineFactory.deploy(
    FallbackRegistry.address
  );

  await RoyaltyEngineV1.initialize(deployer.address, RoyaltyRegistry.address);

  const MockMarketPlaceFactory = await ethers.getContractFactory(
    'MockMarketplace'
  );
  const mockMarketplace = await MockMarketPlaceFactory.deploy(
    RoyaltyEngineV1.address
  );

  const TestERC20Factory = await ethers.getContractFactory('TestERC20');
  const ERC20 = await TestERC20Factory.deploy('TestERC20', 'T');

  const assetAdminRole = await Asset.DEFAULT_ADMIN_ROLE();
  const assetMinterRole = await Asset.MINTER_ROLE();
  await Asset.connect(assetAdmin).grantRole(
    assetMinterRole,
    assetMinter.address
  );
  const assetAsMinter = Asset.connect(assetMinter);
  const managerAdminRole = await RoyaltyManagerContract.DEFAULT_ADMIN_ROLE();
  const contractRoyaltySetterRole =
    await RoyaltyManagerContract.CONTRACT_ROYALTY_SETTER_ROLE();
  const AssetAsSeller = Asset.connect(seller);
  const ERC20AsBuyer = ERC20.connect(buyer);
  const RoyaltyManagerAsAdmin = RoyaltyManagerContract.connect(managerAdmin);
  const RoyaltyManagerAsRoyaltySetter = RoyaltyManagerContract.connect(
    contractRoyaltySetter
  );

  return {
    Asset,
    ERC20,
    RoyaltyManagerContract,
    mockMarketplace,
    AssetAsSeller,
    ERC20AsBuyer,
    deployer,
    seller,
    buyer,
    user,
    commonRoyaltyReceiver,
    royaltyReceiver,
    RoyaltyRegistry,
    RoyaltyManagerAsAdmin,
    commonRoyaltyReceiver2,
    royaltyReceiver2,
    creator,
    assetAdminRole,
    contractRoyaltySetter,
    assetAdmin,
    managerAdminRole,
    contractRoyaltySetterRole,
    RoyaltyManagerAsRoyaltySetter,
    assetAsMinter,
  };
}
