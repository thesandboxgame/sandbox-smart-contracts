import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {skipUnlessTest} from '../../utils/network';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const {deployer, upgradeAdmin} = await getNamedAccounts();

  const TRUSTED_FORWARDER = await deployments.get('TRUSTED_FORWARDER_V2');
  const FXCHILD = await deployments.get('FXCHILD');
  const PolygonLand = await deployments.get('PolygonLand');
  const maxGasLimit = 500;
  const maxAllowedQuads = 144;
  const limits = [5, 10, 20, 90, 340];
  const MockPolygonLandTunnelV2 = await deploy('MockPolygonLandTunnelV2', {
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

  const {deployer: deployerOnL1} = await hre.companionNetworks[
    'l1'
  ].getNamedAccounts();

  const MockLandTunnelV2 = await hre.companionNetworks[
    'l1'
  ].deployments.getOrNull('MockLandTunnelV2');

  if (MockLandTunnelV2) {
    await hre.companionNetworks['l1'].deployments.execute(
      'MockLandTunnelV2',
      {from: deployerOnL1},
      'setFxChildTunnel',
      MockPolygonLandTunnelV2.address
    );
    await deployments.execute(
      'MockPolygonLandTunnelV2',
      {from: deployer},
      'setFxRootTunnel',
      MockLandTunnelV2.address
    );
  }
};

export default func;
func.tags = ['MockPolygonLandTunnelV2', 'MockPolygonLandTunnelV2_deploy', 'L2'];
func.dependencies = ['PolygonLand', 'FXCHILD'];
func.skip = skipUnlessTest;
