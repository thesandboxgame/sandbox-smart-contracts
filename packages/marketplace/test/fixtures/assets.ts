import {ethers, upgrades} from 'hardhat';

export async function mockAssetsSetup() {
  const [commonRoyaltyReceiver, landAdmin, metadataRegistryAdmin] =
    await ethers.getSigners();

  const ERC721WithRoyaltyV2981Factory = await ethers.getContractFactory(
    'ERC721WithRoyaltyV2981MultiMock'
  );
  const ERC721WithRoyaltyV2981 = await upgrades.deployProxy(
    ERC721WithRoyaltyV2981Factory,
    [],
    {
      initializer: 'initialize',
    }
  );
  await ERC721WithRoyaltyV2981.waitForDeployment();

  const ERC721WithRoyaltyFactory = await ethers.getContractFactory(
    'ERC721WithRoyaltyV2981Mock'
  );
  const ERC721WithRoyalty = await upgrades.deployProxy(
    ERC721WithRoyaltyFactory,
    [],
    {
      initializer: 'initialize',
    }
  );
  await ERC721WithRoyalty.waitForDeployment();

  const ERC1155WithRoyaltyFactory = await ethers.getContractFactory(
    'ERC1155WithRoyaltyV2981Mock'
  );
  const ERC1155WithRoyalty = await upgrades.deployProxy(
    ERC1155WithRoyaltyFactory,
    [],
    {
      initializer: 'initialize',
    }
  );
  await ERC1155WithRoyalty.waitForDeployment();

  const ERC721WithRoyaltyWithoutIROYALTYUGCFactory =
    await ethers.getContractFactory('ERC721WithRoyaltyWithoutIROYALTYUGCMock');
  const ERC721WithRoyaltyWithoutIROYALTYUGC = await upgrades.deployProxy(
    ERC721WithRoyaltyWithoutIROYALTYUGCFactory,
    [],
    {
      initializer: 'initialize',
    }
  );
  await ERC721WithRoyaltyWithoutIROYALTYUGC.waitForDeployment();

  const RoyaltyInfoFactory = await ethers.getContractFactory('RoyaltyInfoMock');
  const RoyaltyInfo = await RoyaltyInfoFactory.deploy();
  await RoyaltyInfo.waitForDeployment();

  const ERC20ContractFactory = await ethers.getContractFactory('ERC20Mock');
  const ERC20Contract = await ERC20ContractFactory.deploy();
  await ERC20Contract.waitForDeployment();

  const ERC20Contract2 = await ERC20ContractFactory.deploy();
  await ERC20Contract2.waitForDeployment();

  const ERC721ContractFactory = await ethers.getContractFactory('ERC721Mock');
  const ERC721Contract = await ERC721ContractFactory.deploy();
  await ERC721Contract.waitForDeployment();

  const ERC1155ContractFactory = await ethers.getContractFactory('ERC1155Mock');
  const ERC1155Contract = await ERC1155ContractFactory.deploy();
  await ERC1155Contract.waitForDeployment();

  const RoyaltiesProviderFactory = await ethers.getContractFactory(
    'RoyaltiesProviderMock'
  );
  const RoyaltiesProvider = await RoyaltiesProviderFactory.deploy();
  await RoyaltiesProvider.waitForDeployment();

  const ERC1271ContractFactory = await ethers.getContractFactory('ERC1271Mock');
  const ERC1271Contract = await ERC1271ContractFactory.deploy();
  await ERC1271Contract.waitForDeployment();

  // Below fixtures for testing Land quad functionality using fixtures from Land

  const RoyaltyManagerMockContractFactory = await ethers.getContractFactory(
    'RoyaltyManagerExchangeMock'
  );
  const RoyaltyManagerMockContract =
    await RoyaltyManagerMockContractFactory.deploy(commonRoyaltyReceiver);
  await RoyaltyManagerMockContract.waitForDeployment();

  const MetadataRegistryFactory = await ethers.getContractFactory(
    'LandMetadataRegistryMock'
  );
  const MetadataRegistryContract = await upgrades.deployProxy(
    MetadataRegistryFactory,
    [await metadataRegistryAdmin.getAddress()],
    {
      initializer: 'initialize',
    }
  );

  const LandFactory = await ethers.getContractFactory('LandMock');
  const LandContract = await upgrades.deployProxy(
    LandFactory,
    [await landAdmin.getAddress()],
    {
      initializer: 'initialize',
    }
  );

  const TestERC721TokenReceiverFactory = await ethers.getContractFactory(
    'ERC721TokenReceiverMock'
  );
  const TestERC721TokenReceiver = await TestERC721TokenReceiverFactory.deploy();

  const MockMarketPlaceFactory = await ethers.getContractFactory(
    'MarketPlaceExchangeMock'
  );
  const MockMarketPlace = await MockMarketPlaceFactory.deploy();

  // setup admin roles for testing Land quad functionality
  const LandAsAdmin = LandContract.connect(landAdmin);

  const MetadataRegistryAsAdmin = MetadataRegistryContract.connect(
    metadataRegistryAdmin
  );

  // End set up roles

  return {
    ERC20Contract,
    ERC20Contract2,
    ERC721Contract,
    ERC1155Contract,
    ERC721WithRoyaltyV2981,
    ERC721WithRoyalty,
    ERC1155WithRoyalty,
    ERC721WithRoyaltyWithoutIROYALTYUGC,
    RoyaltyInfo,
    RoyaltiesProvider,
    ERC1271Contract,
    RoyaltyManagerMockContract,
    MetadataRegistryContract,
    LandContract,
    TestERC721TokenReceiver,
    MockMarketPlace,
    LandAsAdmin,
    MetadataRegistryAsAdmin,
    landAdmin,
  };
}
