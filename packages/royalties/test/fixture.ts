import {ethers, upgrades} from 'hardhat';

export async function royaltyDistribution() {
  const [
    deployer,
    seller,
    buyer,
    commonRoyaltyReceiver,
    royaltyReceiver,
    user,
    commonRoyaltyReceiver2,
    royaltyReceiver2,
    managerAdmin,
    contractRoyaltySetter,
  ] = await ethers.getSigners();

  const TestERC20Factory = await ethers.getContractFactory('TestERC20');
  const ERC20 = await TestERC20Factory.deploy('TestERC20', 'T');

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

  const TestERC1155Factory = await ethers.getContractFactory('TestERC1155');
  const ERC1155 = await upgrades.deployProxy(
    TestERC1155Factory,
    [300, royaltyReceiver.address, RoyaltyManagerContract.address],
    {
      initializer: 'initialize',
    }
  );

  await ERC1155.deployed();

  const TestERC721Factory = await ethers.getContractFactory('TestERC721');
  const ERC721 = await upgrades.deployProxy(
    TestERC721Factory,
    [300, royaltyReceiver.address, RoyaltyManagerContract.address],
    {
      initializer: 'initialize',
    }
  );

  const SingleReceiverFactory = await ethers.getContractFactory(
    'SingleReceiver'
  );
  const SingleReceiver = await upgrades.deployProxy(
    SingleReceiverFactory,
    [RoyaltyManagerContract.address],
    {
      initializer: 'initialize',
    }
  );

  await ERC721.deployed();

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

  const managerAdminRole = await RoyaltyManagerContract.DEFAULT_ADMIN_ROLE();
  const contractRoyaltySetterRole =
    await RoyaltyManagerContract.CONTRACT_ROYALTY_SETTER_ROLE();
  const RoyaltyManagerAsAdmin = RoyaltyManagerContract.connect(managerAdmin);
  const RoyaltyManagerAsRoyaltySetter = RoyaltyManagerContract.connect(
    contractRoyaltySetter
  );

  const ERC1155AsSeller = ERC1155.connect(seller);
  const ERC20AsBuyer = ERC20.connect(buyer);
  const ERC721AsSeller = ERC721.connect(seller);

  return {
    ERC1155,
    ERC20,
    RoyaltyManagerContract,
    mockMarketplace,
    ERC1155AsSeller,
    ERC20AsBuyer,
    deployer,
    seller,
    buyer,
    user,
    commonRoyaltyReceiver,
    royaltyReceiver,
    RoyaltyRegistry,
    commonRoyaltyReceiver2,
    royaltyReceiver2,
    ERC721,
    ERC721AsSeller,
    managerAdmin,
    managerAdminRole,
    contractRoyaltySetter,
    RoyaltyManagerAsAdmin,
    contractRoyaltySetterRole,
    RoyaltyManagerAsRoyaltySetter,
    SingleReceiver,
  };
}
