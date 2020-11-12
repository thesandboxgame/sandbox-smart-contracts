import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();

  const sand = await deployments.get('Sand');

  await deploy('Permit', {
    from: deployer,
    log: true,
    args: [sand.address],
  });
};
export default func;
func.tags = ['Permit', 'Permit_deploy'];
func.dependencies = ['Sand'];
