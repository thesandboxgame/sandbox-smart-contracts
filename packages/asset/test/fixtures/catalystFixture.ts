import {ethers, upgrades} from 'hardhat';
import {
  CATALYST_BASE_URI,
  CATALYST_IPFS_CID_PER_TIER,
  CATALYST_DEFAULT_ROYALTY,
} from '../../constants';

export const runCatalystSetup = async () => {
  const [
    deployer,
    upgradeAdmin,
    catalystMinter,
    catalystAdmin,
    catalystRoyaltyRecipient,
    trustedForwarder,
  ] = await ethers.getSigners();
  const users = await ethers.getUnnamedSigners();
  const user1 = users[0];
  const user2 = users[1];

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

  const catalystAsAdmin = await catalyst.connect(
    ethers.provider.getSigner(catalystAdmin.address)
  );
  const minterRole = await catalyst.MINTER_ROLE();
  const catalystAdminRole = await catalyst.DEFAULT_ADMIN_ROLE();
  const catalystAsMinter = await catalyst.connect(
    ethers.provider.getSigner(catalystMinter.address)
  );
  return {
    deployer: deployer.address,
    catalyst,
    user1: user1.address,
    user2: user2.address,
    minterRole,
    catalystAsAdmin,
    catalystAsMinter,
    catalystAdminRole,
    upgradeAdmin: upgradeAdmin.address,
    catalystMinter: catalystMinter.address,
    catalystAdmin: catalystAdmin.address,
    catalystRoyaltyRecipient: catalystRoyaltyRecipient.address,
    trustedForwarder: trustedForwarder.address,
    OperatorFilterSubscription,
  };
};
