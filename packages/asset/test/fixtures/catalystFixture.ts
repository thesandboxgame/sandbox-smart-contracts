import {ethers, upgrades} from 'hardhat';
import {
  CATALYST_BASE_URI,
  CATALYST_IPFS_CID_PER_TIER,
  CATALYST_DEFAULT_ROYALTY,
} from '../../data/constants';

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
  ] = await ethers.getSigners();

  const OperatorFilterSubscriptionFactory = await ethers.getContractFactory(
    'OperatorFilterRegistrant'
  );
  const OperatorFilterSubscription =
    await OperatorFilterSubscriptionFactory.deploy();

  const CatalystFactory = await ethers.getContractFactory('Catalyst');
  const catalyst = await upgrades.deployProxy(
    CatalystFactory,
    [
      CATALYST_BASE_URI,
      trustedForwarder.address,
      catalystRoyaltyRecipient.address,
      OperatorFilterSubscription.address,
      catalystAdmin.address, // DEFAULT_ADMIN_ROLE
      catalystMinter.address, // MINTER_ROLE
      CATALYST_DEFAULT_ROYALTY,
      CATALYST_IPFS_CID_PER_TIER,
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
    OperatorFilterSubscription,
  };
}
