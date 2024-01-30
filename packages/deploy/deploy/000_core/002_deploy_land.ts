import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {isL1, unless} from '../../utils/deploymentSkip';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer, upgradeAdmin} = await getNamedAccounts();

  const sandContract = await deployments.get('Sand');

  await deploy('Land', {
    from: deployer,
    contract: '@sandbox-smart-contracts/core/src/solc_0.5/LandV3.sol:LandV3',
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
func.tags = ['Land', 'Land_deploy'];
func.dependencies = ['Sand_deploy'];
func.skip = unless(isL1);
