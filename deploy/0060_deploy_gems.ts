import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import gems from '../data/gems';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {gemMinter, deployer} = await getNamedAccounts();
  for (const gem of gems) {
    await deploy(`Gem_${gem.symbol}`, {
      contract: 'Gem',
      from: deployer,
      log: true,
      args: [`Sandbox's ${gem.symbol} Gems`, gem.symbol, gemMinter, gem.gemId],
    });
  }
};
export default func;
func.tags = ['Gems'];
