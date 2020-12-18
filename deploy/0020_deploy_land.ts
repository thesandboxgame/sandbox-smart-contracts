import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();

  const sandContract = await deployments.get('Sand');

  await deploy('Land', {
    from: deployer,
    args: [
      sandContract.address,
      deployer, // set_land_admin set it later to correct address
    ],
    log: true,
    skipIfAlreadyDeployed: true,
  });
};
export default func;
func.tags = ['Land', 'Land_deploy'];
func.dependencies = ['Sand'];
func.skip = async (hre) => hre.network.name !== 'hardhat';
