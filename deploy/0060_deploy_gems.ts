import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import gems from '../data/gems';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();
  for (const gemName of gems) {
    await deploy(`Gem_${gemName}`, {
      contract: 'ERC20Token',
      from: deployer,
      log: true,
      args: [gemName, gemName, deployer],
      skipIfAlreadyDeployed: true,
    });
  }
};
export default func;
func.tags = ['Gems'];
func.skip = async (hre) => hre.network.name !== 'hardhat'; // TODO
