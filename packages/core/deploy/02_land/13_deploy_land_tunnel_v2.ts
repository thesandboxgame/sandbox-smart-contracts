import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {constants} from 'ethers';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy, execute, read, catchUnknownSigner} = deployments;
  const {deployer, upgradeAdmin} = await getNamedAccounts();

  const Land = await deployments.get('Land');
  const FXROOT = await deployments.get('FXROOT');
  const CHECKPOINTMANAGER = await deployments.get('CHECKPOINTMANAGER');
  const TRUSTED_FORWARDER = await deployments.get('TRUSTED_FORWARDER');

  const LandTunnelV2 = await deploy('LandTunnelV2', {
    from: deployer,
    contract: 'LandTunnelV2',
    proxy: {
      owner: upgradeAdmin,
      proxyContract: 'OptimizedTransparentProxy',
      execute: {
        methodName: 'initialize',
        args: [
          CHECKPOINTMANAGER.address,
          FXROOT.address,
          Land.address,
          TRUSTED_FORWARDER.address,
        ],
      },
      upgradeIndex: 0,
    },
    log: true,
    skipIfAlreadyDeployed: true,
  });

  const hreL2 = hre.companionNetworks.l2;
  const deploymentsL2 = hreL2.deployments;
  const PolygonLandTunnelV2 = await deploymentsL2.getOrNull(
    'PolygonLandTunnelV2'
  );

  const isMinter = await read('Land', 'isMinter', LandTunnelV2.address);

  if (!isMinter) {
    const admin = await read('Land', 'getAdmin');
    await catchUnknownSigner(
      execute(
        'Land',
        {from: admin, log: true},
        'setMinter',
        LandTunnelV2.address,
        true
      )
    );
  }

  // get deployer on l2
  const {deployer: deployerOnL2} = await hreL2.getNamedAccounts();

  if (PolygonLandTunnelV2) {
    const fxRootTunnel = await deploymentsL2.read(
      'PolygonLandTunnelV2',
      'fxRootTunnel'
    );
    if (
      fxRootTunnel !== LandTunnelV2.address &&
      fxRootTunnel == constants.AddressZero
    ) {
      await deploymentsL2.execute(
        'PolygonLandTunnelV2',
        {from: deployerOnL2},
        'setFxRootTunnel',
        LandTunnelV2.address
      );
    }
    const fxChildTunnel = await deployments.read(
      'LandTunnelV2',
      'fxChildTunnel'
    );
    if (
      fxChildTunnel !== PolygonLandTunnelV2.address &&
      fxChildTunnel == constants.AddressZero
    ) {
      await deployments.execute(
        'LandTunnelV2',
        {from: deployer},
        'setFxChildTunnel',
        PolygonLandTunnelV2.address
      );
    }

    const PolygonLand = await deploymentsL2.getOrNull('PolygonLand');
    if (PolygonLand) {
      const isMinter = await deploymentsL2.read(
        'PolygonLand',
        'isMinter',
        PolygonLandTunnelV2.address
      );

      if (!isMinter) {
        await deploymentsL2.execute(
          'PolygonLand',
          {from: deployerOnL2},
          'setMinter',
          PolygonLandTunnelV2.address,
          true
        );
      }
    }

    const Land = await deployments.getOrNull('Land');
    if (Land) {
      const isMinter = await deployments.read(
        'Land',
        'isMinter',
        LandTunnelV2.address
      );

      const admin = await deployments.read('Land', 'getAdmin');

      if (!isMinter) {
        await deployments.execute(
          'Land',
          {from: admin},
          'setMinter',
          LandTunnelV2.address,
          true
        );
      }
    }
  }
};

export default func;
func.tags = ['LandTunnelV2', 'LandTunnelV2_deploy', 'L1'];
func.dependencies = [
  'Land',
  'FXROOT',
  'CHECKPOINTMANAGER',
  'TRUSTED_FORWARDER',
];
