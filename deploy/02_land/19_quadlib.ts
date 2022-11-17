import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {skipUnlessL1} from '../../utils/network';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deployer} = await getNamedAccounts();
  await deployments.deploy('QuadLib', {
    from: deployer,
    log: true,
    skipIfAlreadyDeployed: true,
  });
};

export default func;
func.tags = ['QuadLib', 'QuadLib_deploy'];
func.dependencies = [];
func.skip = skipUnlessL1;
