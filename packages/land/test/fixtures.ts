import {ethers, upgrades} from 'hardhat';

export async function deployFixtures() {
  const [deployer, commonRoyaltyReceiver, managerAdmin, contractRoyaltySetter] =
    await ethers.getSigners();

  const TrustedForwarderFactory = await ethers.getContractFactory(
    'MockTrustedForwarder',
  );
  const TrustedForwarder = await TrustedForwarderFactory.deploy();

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
      await TrustedForwarder.getAddress(),
    ],
    {
      initializer: 'initialize',
    },
  );
  // await RoyaltyManagerContract.deployed();

  const PolygonLandFactory = await ethers.getContractFactory('PolygonLandV2');
  const PolygonLandContractAsDeployer = await upgrades.deployProxy(
    PolygonLandFactory,
    [
      await TrustedForwarder.getAddress(),
      await RoyaltyManagerContract.getAddress(),
    ],
    {
      initializer: 'initialize',
    },
  );

  // setup role
  const managerAsRoyaltySetter = RoyaltyManagerContract.connect(
    contractRoyaltySetter,
  );
  const contractRoyaltySetterRole =
    await RoyaltyManagerContract.CONTRACT_ROYALTY_SETTER_ROLE();

  return {
    TrustedForwarder,
    RoyaltySplitter,
    RoyaltyManagerContract,
    PolygonLandContractAsDeployer,
    managerAsRoyaltySetter,
    contractRoyaltySetterRole,
    commonRoyaltyReceiver,
    managerAdmin,
    contractRoyaltySetter,
    deployer,
  };
}
