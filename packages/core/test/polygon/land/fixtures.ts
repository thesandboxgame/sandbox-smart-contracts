import {
  ethers,
  deployments,
  getUnnamedAccounts,
  getNamedAccounts,
} from 'hardhat';
import {setupUsers, setupUser} from '../../utils';

export const setupLand = deployments.createFixture(async function () {
  await deployments.fixture([
    'PolygonLand',
    'Land',
    'PolygonLandTunnel',
    'LandTunnel',
    'FXROOT',
    'FXCHILD',
    'CHECKPOINTMANAGER',
    'MockPolygonLandTunnel',
    'MockLandTunnel',
  ]);
  const PolygonLand = await ethers.getContract('PolygonLand');
  const Land = await ethers.getContract('Land');
  const PolygonLandTunnel = await ethers.getContract('PolygonLandTunnel');
  const LandTunnel = await ethers.getContract('LandTunnel');
  const FxRoot = await ethers.getContract('FXROOT');
  const FxChild = await ethers.getContract('FXCHILD');
  const CheckpointManager = await ethers.getContract('CHECKPOINTMANAGER');
  const MockLandTunnel = await ethers.getContract('MockLandTunnel');
  const MockPolygonLandTunnel = await ethers.getContract(
    'MockPolygonLandTunnel'
  );
  const TRUSTED_FORWARDER = await deployments.get('TRUSTED_FORWARDER_V2');
  const trustedForwarder = await ethers.getContractAt(
    'TestMetaTxForwarder',
    TRUSTED_FORWARDER.address
  );

  const namedAccounts = await getNamedAccounts();
  const unnamedAccounts = await getUnnamedAccounts();
  const otherAccounts = [...unnamedAccounts];
  const minter = otherAccounts[0];
  otherAccounts.splice(0, 1);

  const users = await setupUsers(otherAccounts, {
    PolygonLand,
    Land,
    PolygonLandTunnel,
    LandTunnel,
    FxRoot,
    FxChild,
    MockLandTunnel,
    MockPolygonLandTunnel,
  });
  const deployer = await setupUser(namedAccounts.deployer, {
    PolygonLand,
    Land,
    PolygonLandTunnel,
    LandTunnel,
    FxRoot,
    FxChild,
    CheckpointManager,
    MockLandTunnel,
    MockPolygonLandTunnel,
  });
  const landAdmin = await setupUser(namedAccounts.landAdmin, {Land});
  const landMinter = await setupUser(minter, {Land});

  await deployer.FxRoot.setFxChild(FxChild.address);
  await deployer.PolygonLand.setMinter(PolygonLandTunnel.address, true);
  await deployer.PolygonLand.setTrustedForwarder(trustedForwarder.address);
  await deployer.LandTunnel.setTrustedForwarder(trustedForwarder.address);
  await deployer.MockLandTunnel.setTrustedForwarder(trustedForwarder.address);
  await landAdmin.Land.setMinter(landMinter.address, true);

  return {
    users,
    deployer,
    landAdmin,
    landMinter,
    PolygonLand,
    Land,
    PolygonLandTunnel,
    LandTunnel,
    FxRoot,
    FxChild,
    CheckpointManager,
    MockLandTunnel,
    MockPolygonLandTunnel,
    trustedForwarder,
    getNamedAccounts,
    ethers,
  };
});
