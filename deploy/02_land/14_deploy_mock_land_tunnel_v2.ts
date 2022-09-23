import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {constants} from 'ethers';
import {skipUnlessTest} from '../../utils/network';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const {deployer, upgradeAdmin} = await getNamedAccounts();

  const Land = await deployments.get('Land');
  const FXROOT = await deployments.get('FXROOT');
  const CHECKPOINTMANAGER = await deployments.get('CHECKPOINTMANAGER');
  const TRUSTED_FORWARDER = await deployments.get('TRUSTED_FORWARDER');

  const MockLandTunnelV2 = await deploy('MockLandTunnelV2', {
    from: deployer,
    contract: 'MockLandTunnelV2',
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
  const {deployer: deployerOnL2} = await hre.companionNetworks[
    'l2'
  ].getNamedAccounts();

  const MockPolygonLandTunnelV2 = await hre.companionNetworks[
    'l2'
  ].deployments.getOrNull('MockPolygonLandTunnelV2');

  if (MockPolygonLandTunnelV2) {
    await hre.companionNetworks['l2'].deployments.execute(
      'MockPolygonLandTunnelV2',
      {from: deployerOnL2},
      'setFxRootTunnel',
      MockLandTunnelV2.address
    );

    await deployments.execute(
      'MockLandTunnelV2',
      {from: deployer},
      'setFxChildTunnel',
      MockPolygonLandTunnelV2.address
    );
  }
};

export default func;
func.tags = ['MockLandTunnelV2', 'MockLandTunnelV2_deploy', 'L1'];
func.dependencies = [
  'Land',
  'FXROOT',
  'CHECKPOINTMANAGER',
  'TRUSTED_FORWARDER',
];
func.skip = skipUnlessTest;
