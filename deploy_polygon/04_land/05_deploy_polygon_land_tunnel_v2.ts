import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {constants} from 'ethers';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy, execute, read, catchUnknownSigner} = deployments;
  const {deployer, upgradeAdmin} = await getNamedAccounts();

  const TRUSTED_FORWARDER = await deployments.get('TRUSTED_FORWARDER_V2');
  const FXCHILD = await deployments.get('FXCHILD');
  const PolygonLand = await deployments.get('PolygonLand');
  const maxGasLimit = 500;
  const maxAllowedQuads = 144;
  const limits = [5, 10, 20, 90, 340];
  const PolygonLandTunnelV2 = await deploy('PolygonLandTunnelV2', {
    from: deployer,
    contract: 'PolygonLandTunnelV2',
    proxy: {
      owner: upgradeAdmin,
      proxyContract: 'OptimizedTransparentProxy',
      execute: {
        methodName: 'initialize',
        args: [
          FXCHILD.address,
          PolygonLand.address,
          TRUSTED_FORWARDER.address,
          maxGasLimit,
          maxAllowedQuads,
          limits,
        ],
      },
      upgradeIndex: 0,
    },
    log: true,
    skipIfAlreadyDeployed: true,
  });

  const deploymentsL1 = hre.companionNetworks['l1'].deployments;
  const LandTunnelV2 = await deploymentsL1.getOrNull('LandTunnelV2');

  const Land = await deploymentsL1.getOrNull('Land');
  // get deployer on l1
  const {deployer: deployerOnL1} = await hre.companionNetworks[
    'l1'
  ].getNamedAccounts();

  if (LandTunnelV2) {
    const fxChildTunnel = await deploymentsL1.read(
      'LandTunnelV2',
      'fxChildTunnel'
    );
    if (
      fxChildTunnel !== PolygonLandTunnelV2.address &&
      fxChildTunnel == constants.AddressZero
    ) {
      await deploymentsL1.execute(
        'LandTunnelV2',
        {from: deployerOnL1, log: true},
        'setFxChildTunnel',
        PolygonLandTunnelV2.address
      );
    }
    const fxRootTunnel = await read('PolygonLandTunnelV2', 'fxRootTunnel');
    if (
      fxRootTunnel !== LandTunnelV2.address &&
      fxRootTunnel == constants.AddressZero
    ) {
      await execute(
        'PolygonLandTunnelV2',
        {from: deployer, log: true},
        'setFxRootTunnel',
        LandTunnelV2.address
      );
    }
  }

  const isMinter = await read(
    'PolygonLand',
    'isMinter',
    PolygonLandTunnelV2.address
  );

  if (!isMinter) {
    const admin = await read('PolygonLand', 'getAdmin');

    await catchUnknownSigner(
      execute(
        'PolygonLand',
        {from: admin, log: true},
        'setMinter',
        PolygonLandTunnelV2.address,
        true
      )
    );
  }

  if (Land && LandTunnelV2) {
    const isMinter = await deploymentsL1.read(
      'Land',
      'isMinter',
      LandTunnelV2.address
    );

    const admin = await deploymentsL1.read('Land', 'getAdmin');

    if (!isMinter) {
      await deploymentsL1.execute(
        'Land',
        {from: admin},
        'setMinter',
        LandTunnelV2.address,
        true
      );
    }
  }
};

export default func;
func.tags = ['PolygonLandTunnelV2', 'PolygonLandTunnelV2_deploy', 'L2'];
func.dependencies = ['PolygonLand', 'FXCHILD'];
