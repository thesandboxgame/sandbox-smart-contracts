import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts} = hre;
  const {deployer, upgradeAdmin} = await getNamedAccounts();
  const {deploy} = deployments;

  const sandContract = await deployments.get('Sand');

  await deploy('Asset', {
    from: deployer,
    contract: 'Asset',
    proxy: {
      owner: upgradeAdmin,
      proxyContract: 'OpenZeppelinTransparentProxy',
      execute: {
        methodName: 'init',
        args: [sandContract.address, deployer, deployer],
      },
      upgradeIndex: 0,
    },
    log: true,
  });
};

export default func;
func.tags = ['Asset', 'Asset_deploy', 'AssetV1'];
func.dependencies = ['Sand', 'Sand_deploy'];
