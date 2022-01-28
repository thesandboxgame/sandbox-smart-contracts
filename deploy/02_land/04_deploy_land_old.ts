import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessTest} from '../../utils/network';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer, upgradeAdmin} = await getNamedAccounts();

  const sandContract = await deployments.get('Sand');

  const LandOld = await deployments.getOrNull('Land_Old');
  if (LandOld) return;
  await deploy('Land_Old', {
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
func.tags = ['Land_Old', 'Land_Old_deploy'];
func.dependencies = ['Sand_deploy'];
func.skip = skipUnlessTest;
