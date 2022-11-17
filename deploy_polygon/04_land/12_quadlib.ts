import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessL2} from '../../utils/network';

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
func.skip = skipUnlessL2;
