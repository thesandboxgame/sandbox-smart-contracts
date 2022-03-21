import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts} = hre;
  const {deployer} = await getNamedAccounts();
  const Land = await deployments.get('PolygonLand');

  await deployments.deploy('ContributionRules', {
    from: deployer,
    contract: 'ContributionRules',
    args: [Land.address],
    log: true,
    skipIfAlreadyDeployed: true,
  });
};

export default func;
func.tags = ['ContributionRules', 'ContributionRules_deploy'];
func.dependencies = ['ERC20RewardPool_deploy'];
