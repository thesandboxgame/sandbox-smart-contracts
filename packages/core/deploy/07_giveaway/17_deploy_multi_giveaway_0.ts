import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const {deployer, multiGiveawayAdmin} = await getNamedAccounts();

  await deploy('Multi_Giveaway_0', {
    contract: 'MultiGiveawayV0',
    from: deployer,
    log: true,
    skipIfAlreadyDeployed: true,
    args: [multiGiveawayAdmin],
  });
};
export default func;
func.tags = ['Multi_Giveaway_0', 'Multi_Giveaway_0_deploy'];
func.dependencies = [];
func.skip = async (hre) => hre.network.name === 'mainnet';
