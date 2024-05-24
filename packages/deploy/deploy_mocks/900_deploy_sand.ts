import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {sandBeneficiary, deployer} = await getNamedAccounts();

  await deploy('Sand', {
    from: deployer,
    args: [deployer, deployer, sandBeneficiary],
    log: true,
    skipIfAlreadyDeployed: true,
  });
};
export default func;
func.tags = ['Sand', 'Sand_deploy'];
