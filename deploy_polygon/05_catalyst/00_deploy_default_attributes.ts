import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessTest} from '../../utils/network';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();
  await deploy(`DefaultAttributes`, {
    from: deployer,
    log: true,
    skipIfAlreadyDeployed: true,
  });
  console.log('L2');
};
export default func;
func.tags = ['DefaultAttributes', 'DefaultAttributes_deploy', 'L2'];
func.skip = skipUnlessTest; // disabled for now
