import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const {deployer, upgradeAdmin} = await getNamedAccounts();

  await deploy('PolygonLandV1', {
    from: deployer,
    contract: 'PolygonLandV1',
    proxy: {
      owner: upgradeAdmin,
      proxyContract: 'OpenZeppelinTransparentProxy',
      execute: {
        methodName: 'initialize',
        args: [],
      },
      upgradeIndex: 0,
    },
    log: true,
  });
};
export default func;
func.tags = ['PolygonLandV1', 'PolygonLandV1_deploy', 'L2'];
