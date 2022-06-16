import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer, upgradeAdmin} = await getNamedAccounts();

  const sandContract = await deployments.get('Sand');

  await deploy('Land', {
    from: deployer,
    contract: 'Land',
    proxy: {
      owner: upgradeAdmin,
      proxyContract: 'OpenZeppelinTransparentProxy',
      execute: {
        methodName: 'initialize',
        args: [sandContract.address, deployer],
      },
      upgradeIndex: 0,
    },
    log: true,
  });
};
export default func;
func.tags = ['Land', 'LandV1', 'Land_deploy'];
func.dependencies = ['Sand_deploy'];
