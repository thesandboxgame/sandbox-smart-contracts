import {ethers} from 'hardhat';
import {
  CATALYST_BASE_URI,
  CATALYST_IPFS_CID_PER_TIER,
  DEFAULT_SUBSCRIPTION,
} from '../../../data/constants';
import {deployProxy} from '../../utils/upgrades';

export async function runCatalystSetup() {
  const [
    deployer,
    upgradeAdmin,
    catalystMinter,
    catalystAdmin,
    catalystRoyaltyRecipient,
    trustedForwarder,
    user1,
    user2,
    mockMarketplace1,
    mockMarketplace2,
    commonRoyaltyReceiver,
    managerAdmin,
    contractRoyaltySetter,
  ] = await ethers.getSigners();

  const MockOperatorFilterRegistryFactory = await ethers.getContractFactory(
    'MockOperatorFilterRegistry'
  );

  const operatorFilterRegistry = await MockOperatorFilterRegistryFactory.deploy(
    DEFAULT_SUBSCRIPTION,
    [mockMarketplace1.address, mockMarketplace2.address]
  );

  // Operator Filter Registrant
  const OperatorFilterSubscriptionFactory = await ethers.getContractFactory(
    'MockOperatorFilterSubscription'
  );

  // Provide: address _owner, address _localRegistry
  const OperatorFilterSubscriptionContract =
    await OperatorFilterSubscriptionFactory.deploy(
      catalystAdmin.address,
      operatorFilterRegistry.address
    );

  const RoyaltySplitterFactory = await ethers.getContractFactory(
    'RoyaltySplitter'
  );
  const RoyaltySplitter = await RoyaltySplitterFactory.deploy();

  const RoyaltyManagerFactory = await ethers.getContractFactory(
    'RoyaltyManager'
  );
  const RoyaltyManagerContract = await deployProxy(
    RoyaltyManagerFactory,
    [
      commonRoyaltyReceiver.address,
      5000,
      RoyaltySplitter.address,
      managerAdmin.address,
      contractRoyaltySetter.address,
      trustedForwarder.address,
    ],
    {
      initializer: 'initialize',
    }
  );
  await RoyaltyManagerContract.deployed();

  const CatalystFactory = await ethers.getContractFactory('Catalyst');
  const catalyst = await deployProxy(
    CatalystFactory,
    [
      CATALYST_BASE_URI,
      trustedForwarder.address,
      OperatorFilterSubscriptionContract.address,
      catalystAdmin.address, // DEFAULT_ADMIN_ROLE
      catalystMinter.address, // MINTER_ROLE
      CATALYST_IPFS_CID_PER_TIER,
      RoyaltyManagerContract.address,
    ],
    {
      initializer: 'initialize',
    }
  );
  await catalyst.deployed();

  // grant burner role to catalystMinter
  const catMinterRole = await catalyst.BURNER_ROLE();
  await catalyst
    .connect(catalystAdmin)
    .grantRole(catMinterRole, catalystMinter.address);

  const catalystAsAdmin = await catalyst.connect(catalystAdmin);
  const minterRole = await catalyst.MINTER_ROLE();
  const catalystAdminRole = await catalyst.DEFAULT_ADMIN_ROLE();
  const catalystAsMinter = await catalyst.connect(catalystMinter);
  const catalystAsBurner = await catalyst.connect(catalystMinter);
  return {
    deployer,
    catalyst,
    user1,
    user2,
    minterRole,
    catalystAsAdmin,
    catalystAsMinter,
    catalystAdminRole,
    upgradeAdmin,
    catalystMinter,
    catalystAsBurner,
    catalystAdmin,
    catalystRoyaltyRecipient,
    trustedForwarder,
    OperatorFilterSubscriptionContract,
    RoyaltyManagerContract,
  };
}
