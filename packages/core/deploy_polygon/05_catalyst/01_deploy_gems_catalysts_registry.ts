import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const TRUSTED_FORWARDER_V2 = await deployments.get('TRUSTED_FORWARDER_V2');

  const {deployer, upgradeAdmin} = await getNamedAccounts();
  await deploy(`PolygonGemsCatalystsRegistry`, {
    from: deployer,
    log: true,
    contract: `GemsCatalystsRegistry`,
    proxy: {
      owner: upgradeAdmin,
      proxyContract: 'OptimizedTransparentProxy',
      execute: {
        methodName: 'initV1',
        args: [TRUSTED_FORWARDER_V2.address, deployer],
      },
      upgradeIndex: 0,
    },
    skipIfAlreadyDeployed: true,
  });
};
export default func;
func.tags = [
  'PolygonGemsCatalystsRegistry',
  'PolygonGemsCatalystsRegistry_deploy',
  'L2',
];
func.dependencies = ['TRUSTED_FORWARDER'];
