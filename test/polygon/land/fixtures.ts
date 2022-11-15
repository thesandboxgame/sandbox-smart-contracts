import {
  ethers,
  deployments,
  getUnnamedAccounts,
  getNamedAccounts,
} from 'hardhat';
import {setupUsers, setupUser} from '../../utils';
import {BigNumber} from 'ethers';

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
    getId,
  };
});
export const setupLandTunnelV2 = deployments.createFixture(async function () {
  await deployments.fixture([
    'PolygonLand',
    'Land',
    'PolygonLandTunnelV2',
    'LandTunnelV2',
    'FXROOT',
    'FXCHILD',
    'CHECKPOINTMANAGER',
    'MockPolygonLandTunnelV2',
    'MockLandTunnelV2',
  ]);
  const PolygonLand = await ethers.getContract('PolygonLand');
  const Land = await ethers.getContract('Land');
  const PolygonLandTunnelV2 = await ethers.getContract('PolygonLandTunnelV2');
  const LandTunnelV2 = await ethers.getContract('LandTunnelV2');
  const FxRoot = await ethers.getContract('FXROOT');
  const FxChild = await ethers.getContract('FXCHILD');
  const CheckpointManager = await ethers.getContract('CHECKPOINTMANAGER');
  const MockLandTunnelV2 = await ethers.getContract('MockLandTunnelV2');
  const MockPolygonLandTunnelV2 = await ethers.getContract(
    'MockPolygonLandTunnelV2'
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
    PolygonLandTunnelV2,
    LandTunnelV2,
    FxRoot,
    FxChild,
    MockLandTunnelV2,
    MockPolygonLandTunnelV2,
  });
  const deployer = await setupUser(namedAccounts.deployer, {
    PolygonLand,
    Land,
    PolygonLandTunnelV2,
    LandTunnelV2,
    FxRoot,
    FxChild,
    CheckpointManager,
    MockLandTunnelV2,
    MockPolygonLandTunnelV2,
  });

  const polygonAdmin = await setupUser(namedAccounts.deployer, {PolygonLand});
  const landAdmin = await setupUser(namedAccounts.landAdmin, {Land});
  const landMinter = await setupUser(minter, {Land, PolygonLand});

  await deployer.FxRoot.setFxChild(FxChild.address);
  await deployer.PolygonLand.setMinter(PolygonLandTunnelV2.address, true);
  await deployer.PolygonLand.setTrustedForwarder(trustedForwarder.address);
  await deployer.LandTunnelV2.setTrustedForwarder(trustedForwarder.address);
  await deployer.MockLandTunnelV2.setTrustedForwarder(trustedForwarder.address);
  await deployer.PolygonLandTunnelV2.setTrustedForwarder(
    trustedForwarder.address
  );
  await deployer.PolygonLand.setMinter(MockPolygonLandTunnelV2.address, true);

  await landAdmin.Land.setMinter(landMinter.address, true);
  await polygonAdmin.PolygonLand.setMinter(landMinter.address, true);

  return {
    users,
    deployer,
    landAdmin,
    landMinter,
    PolygonLand,
    Land,
    PolygonLandTunnelV2,
    LandTunnelV2,
    FxRoot,
    FxChild,
    CheckpointManager,
    MockLandTunnelV2,
    MockPolygonLandTunnelV2,
    trustedForwarder,
    getNamedAccounts,
    ethers,
    getId,
  };
});

export const setupLandMigration = deployments.createFixture(async function () {
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
    'MockPolygonLandTunnelV2',
    'MockLandTunnelV2',
    'MockLandTunnelMigration',
    'MockPolygonLandTunnelMigration',
  ]);

  const PolygonLand = await ethers.getContract('PolygonLand');
  const Land = await ethers.getContract('Land');
  const FxRoot = await ethers.getContract('FXROOT');
  const FxChild = await ethers.getContract('FXCHILD');
  const CheckpointManager = await ethers.getContract('CHECKPOINTMANAGER');
  const MockLandTunnelV2 = await ethers.getContract('MockLandTunnelV2');
  const MockPolygonLandTunnelV2 = await ethers.getContract(
    'MockPolygonLandTunnelV2'
  );
  const TRUSTED_FORWARDER = await deployments.get('TRUSTED_FORWARDER_V2');
  const trustedForwarder = await ethers.getContractAt(
    'TestMetaTxForwarder',
    TRUSTED_FORWARDER.address
  );
  const MockLandTunnel = await ethers.getContract('MockLandTunnel');
  const MockPolygonLandTunnel = await ethers.getContract(
    'MockPolygonLandTunnel'
  );
  const MockLandTunnelMigration = await ethers.getContract(
    'MockLandTunnelMigration'
  );
  const MockPolygonLandTunnelMigration = await ethers.getContract(
    'MockPolygonLandTunnelMigration'
  );
  const namedAccounts = await getNamedAccounts();
  const unnamedAccounts = await getUnnamedAccounts();
  const otherAccounts = [...unnamedAccounts];
  const minter = otherAccounts[0];
  otherAccounts.splice(0, 1);
  const users = await setupUsers(otherAccounts, {
    PolygonLand,
    Land,
    FxRoot,
    FxChild,
    MockLandTunnel,
    MockPolygonLandTunnel,
    MockLandTunnelV2,
    MockPolygonLandTunnelV2,
    MockLandTunnelMigration,
    MockPolygonLandTunnelMigration,
  });
  const deployer = await setupUser(namedAccounts.deployer, {
    PolygonLand,
    Land,
    FxRoot,
    FxChild,
    CheckpointManager,
    MockLandTunnel,
    MockPolygonLandTunnel,
    MockLandTunnelV2,
    MockPolygonLandTunnelV2,
    MockLandTunnelMigration,
    MockPolygonLandTunnelMigration,
  });

  await deployer.FxRoot.setFxChild(FxChild.address);
  const landAdmin = await setupUser(namedAccounts.landAdmin, {
    Land,
    PolygonLand,
  });
  const landMinter = await setupUser(minter, {Land, PolygonLand});
  await landAdmin.Land.setMinter(landMinter.address, true);
  await deployer.PolygonLand.setMinter(MockPolygonLandTunnel.address, true);
  await deployer.PolygonLand.setMinter(MockPolygonLandTunnelV2.address, true);
  await deployer.PolygonLand.setMinter(minter, true);
  await deployer.PolygonLand.setTrustedForwarder(trustedForwarder.address);
  await deployer.MockLandTunnelV2.setTrustedForwarder(trustedForwarder.address);
  await deployer.MockLandTunnel.setTrustedForwarder(trustedForwarder.address);

  function getId(x: number, y: number) {
    return x + y * 408;
  }

  return {
    users,
    deployer,
    landAdmin,
    landMinter,
    PolygonLand,
    Land,
    MockLandTunnel,
    MockPolygonLandTunnel,
    FxRoot,
    FxChild,
    CheckpointManager,
    MockLandTunnelV2,
    MockPolygonLandTunnelV2,
    MockLandTunnelMigration,
    MockPolygonLandTunnelMigration,
    trustedForwarder,
    getNamedAccounts,
    ethers,
    getId,
  };
});

export function getId(layer: number, x: number, y: number): string {
  const lengthOfId = 64;
  const lengthOfBasicId = BigNumber.from(x + y * 408)._hex.length - 2;
  const lengthOfLayerAppendment = lengthOfId - lengthOfBasicId - 2;
  let layerAppendment = '';
  for (let i = 0; i < lengthOfLayerAppendment; i++) {
    layerAppendment = layerAppendment + '0';
  }
  return (
    `0x0${layer - 1}` +
    layerAppendment +
    BigNumber.from(x + y * 408)._hex.slice(2)
  );
}
