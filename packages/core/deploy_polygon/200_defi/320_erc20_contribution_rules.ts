import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts} = hre;
  const {deployer} = await getNamedAccounts();

  await deployments.deploy('ContributionRulesV2', {
    from: deployer,
    contract: 'ContributionRulesV2',
    log: true,
    skipIfAlreadyDeployed: true,
  });
};

export default func;
func.tags = ['ContributionRules', 'ContributionRules_deploy'];
func.dependencies = ['ERC20RewardPool_deploy'];
