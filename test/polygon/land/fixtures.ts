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
  ]);
  const PolygonLand = await ethers.getContract('PolygonLand');
  const Land = await ethers.getContract('Land');
  const PolygonLandTunnel = await ethers.getContract('PolygonLandTunnel');
  const LandTunnel = await ethers.getContract('LandTunnel');
  const FxRoot = await ethers.getContract('FXROOT');
  const FxChild = await ethers.getContract('FXCHILD');

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
  });
  const deployer = await setupUser(namedAccounts.deployer, {
    PolygonLand,
    Land,
    PolygonLandTunnel,
    LandTunnel,
    FxRoot,
    FxChild,
  });
  const landAdmin = await setupUser(namedAccounts.landAdmin, {Land});
  const landMinter = await setupUser(minter, {Land});

  await deployer.FxRoot.setFxChild(FxChild.address);
  await deployer.LandTunnel.setFxChildTunnel(PolygonLandTunnel.address);
  await deployer.PolygonLandTunnel.setFxRootTunnel(LandTunnel.address);
  await deployer.PolygonLand.setPolygonLandTunnel(PolygonLandTunnel.address);
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
  };
});
