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
    await deployments.deploy(`${cat.symbol}_ContributionRules`, {
      from: deployer,
      contract: 'ContributionRulesV2',
      log: true,
      // skipIfAlreadyDeployed: true,
    });
  }

  for (const gem of gems) {
    await deployments.deploy(`${gem.symbol}_ContributionRules`, {
      from: deployer,
      contract: 'ContributionRulesV2',
      log: true,
      // skipIfAlreadyDeployed: true,
    });
  }
};

export default func;
func.tags = ['CatsGemsContributionRules', 'CatsGemsContributionRules_deploy'];
func.dependencies = ['CatsGemsRewardPool_deploy'];
