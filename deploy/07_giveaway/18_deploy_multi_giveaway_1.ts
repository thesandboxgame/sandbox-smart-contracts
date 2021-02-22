import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const {deployer} = await getNamedAccounts();

  await deploy('Multi_Giveaway_1', {
    contract: 'MultiGiveaway',
    from: deployer,
    log: true,
    skipIfAlreadyDeployed: true,
    args: [deployer],
  });
};
export default func;
func.tags = ['Multi_Giveway_1', 'Multi_Giveaway_1_deploy'];
func.dependencies = [];
func.skip = async (hre) => hre.network.name !== 'hardhat'; // TODO
