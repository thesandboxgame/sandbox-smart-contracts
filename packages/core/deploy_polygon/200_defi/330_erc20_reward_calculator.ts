import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts} = hre;
  const {deployer} = await getNamedAccounts();
  const Pool = await deployments.get('ERC20RewardPool');

  await deployments.deploy('ERC20RewardCalculator', {
    from: deployer,
    contract: 'TwoPeriodsRewardCalculator',
    args: [Pool.address],
    log: true,
    skipIfAlreadyDeployed: true,
  });
};

export default func;
func.tags = ['ERC20RewardCalculator', 'ERC20RewardCalculator_deploy'];
func.dependencies = ['ERC20RewardPool_deploy'];
