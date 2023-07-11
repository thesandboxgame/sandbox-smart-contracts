import {ethers, upgrades} from 'hardhat';
import {
  CATALYST_BASE_URI,
  CATALYST_IPFS_CID_PER_TIER,
} from '../../../data/constants';
import royaltyManagerCompiled from '@ensdomains/ens-contracts/artifacts/contracts/registry/ENSRegistry.sol/ENSRegistry.json';

export async function catalystRoyaltyDistribution() {
  const [
    deployer,
    catalystMinter,
    catalystAdmin,
    trustedForwarder,
    seller,
    buyer,
    royaltyReceiver,
    user,
    commonRoyaltyReceiver2,
    royaltyReceiver2,
    creator,
    commonRoyaltyReceiver,
    managerAdmin,
    contractRoyaltySetter,
  ] = await ethers.getSigners();

  const OperatorFilterSubscriptionFactory = await ethers.getContractFactory(
    'OperatorFilterRegistrant'
  );
  const OperatorFilterSubscription =
    await OperatorFilterSubscriptionFactory.deploy();

  const RoyaltyCustomSplitterFactory = await ethers.getContractFactory(
    'RoyaltyCustomSplitter'
  );
  const RoyaltyCustomSplitter = await RoyaltyCustomSplitterFactory.deploy();

  const RoyaltyManagerFactory = await ethers.getContractFactory(
    'RoyaltyManager'
  );
  const RoyaltyManagerContract = await upgrades.deployProxy(
    RoyaltyManagerFactory,
    [
      commonRoyaltyReceiver.address,
      5000,
      RoyaltyCustomSplitter.address,
      managerAdmin.address,
      contractRoyaltySetter.address,
    ],
    {
      initializer: 'initialize',
    }
  );
  await RoyaltyManagerContract.deployed();

  const CatalystFactory = await ethers.getContractFactory('Catalyst');
  const catalystContract = await upgrades.deployProxy(
    CatalystFactory,
    [
      CATALYST_BASE_URI,
      trustedForwarder.address,
      OperatorFilterSubscription.address,
      catalystAdmin.address, // DEFAULT_ADMIN_ROLE
      catalystMinter.address, // MINTER_ROLE
      CATALYST_IPFS_CID_PER_TIER,
      RoyaltyManagerContract.address,
    ],
    {
      initializer: 'initialize',
    }
  );
  await catalystContract.deployed();

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

  // Set up roles
  const catalystAsMinter = catalystContract.connect(catalystMinter);
  const managerAdminRole = await RoyaltyManagerContract.DEFAULT_ADMIN_ROLE();
  const contractRoyaltySetterRole =
    await RoyaltyManagerContract.CONTRACT_ROYALTY_SETTER_ROLE();
  const ERC20AsBuyer = ERC20.connect(buyer);
  const managerAsAdmin = RoyaltyManagerContract.connect(managerAdmin);
  const managerAsRoyaltySetter = RoyaltyManagerContract.connect(
    contractRoyaltySetter
  );
  // End set up roles

  // TODO: fix signers vs addresses
  return {
    ERC20,
    manager: RoyaltyManagerContract,
    mockMarketplace,
    ERC20AsBuyer,
    deployer: deployer.address,
    seller: seller.address,
    buyer: buyer.address,
    user: user.address,
    commonRoyaltyReceiver: commonRoyaltyReceiver.address,
    royaltyReceiver: royaltyReceiver.address,
    RoyaltyRegistry: RoyaltyRegistry.address,
    managerAsAdmin,
    commonRoyaltyReceiver2: commonRoyaltyReceiver2.address,
    royaltyReceiver2: royaltyReceiver2.address,
    creator: creator.address,
    catalyst: catalystAsMinter,
    contractRoyaltySetter,
    managerAdminRole,
    contractRoyaltySetterRole,
    managerAsRoyaltySetter,
  };
}
