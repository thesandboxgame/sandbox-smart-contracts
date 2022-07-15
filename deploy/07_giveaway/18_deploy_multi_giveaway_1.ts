import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const {deployer, multiGiveawayAdmin} = await getNamedAccounts();

  await deploy('Multi_Giveaway_1', {
    contract: 'MultiGiveaway',
    from: deployer,
    log: true,
    skipIfAlreadyDeployed: true,
    args: [multiGiveawayAdmin, '0x0000000000000000000000000000000000000000'], // admin, trustedForwarder
  });
};
export default func;
func.tags = ['Multi_Giveaway_1', 'Multi_Giveaway_1_deploy'];
func.dependencies = [];
func.skip = async () => true;
