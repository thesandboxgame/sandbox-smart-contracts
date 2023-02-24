import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import catalysts from '../../data/catalysts';
import gems from '../../data/gems';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts} = hre;
  const {deployer} = await getNamedAccounts();

  for (const cat of catalysts) {
    const Pool = await deployments.get(`CatalystRewardPool_${cat.symbol}`);

    await deployments.deploy(`${cat.symbol}_RewardCalculator`, {
      from: deployer,
      contract: 'TwoPeriodsRewardCalculatorV2',
      args: [Pool.address],
      log: true,
      // skipIfAlreadyDeployed: true,
    });
  }

  for (const gem of gems) {
    const Pool = await deployments.get(`GemRewardPool_${gem.symbol}`);

    await deployments.deploy(`${gem.symbol}_RewardCalculator`, {
      from: deployer,
      contract: 'TwoPeriodsRewardCalculatorV2',
      args: [Pool.address],
      log: true,
      // skipIfAlreadyDeployed: true,
    });
  }
};

export default func;
func.tags = ['CatsGemsRewardCalculator', 'CatsGemsRewardCalculator_deploy'];
func.dependencies = ['ERC20RewardPool_deploy'];
