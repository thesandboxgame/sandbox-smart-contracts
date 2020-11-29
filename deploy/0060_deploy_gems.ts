import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import gems from '../data/gems';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;

  const { gemOwner } = await getNamedAccounts();
  for (const gem of gems) {
    await deploy(`Gem_${gem.name}`, {
      contract: 'Gem',
      from: gemOwner,
      log: true,
      args: [gem.name, gem.name, gemOwner, gem.gemId],
    });
  }
};
export default func;
func.tags = ['Gems'];
