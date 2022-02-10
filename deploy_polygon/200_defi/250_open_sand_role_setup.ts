import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts, ethers} = hre;
  const {deployer, sandAdmin, liquidityRewardAdmin} = await getNamedAccounts();

  const sandPool = await ethers.getContract('OpenSandRewardPool');

  const adminRole = await sandPool.DEFAULT_ADMIN_ROLE();

  // check who has Admin role: deployer or sandAdmin
  const currentAdmin = (await sandPool.hasRole(adminRole, deployer))
    ? deployer
    : (await sandPool.hasRole(adminRole, sandAdmin))
    ? sandAdmin
    : deployer;

  const rewardCalculator = await ethers.getContract(
    'OpenSandRewardCalculator',
    currentAdmin
  );
  const REWARD_DISTRIBUTION = await rewardCalculator.REWARD_DISTRIBUTION();
  await deployments.execute(
    'OpenSandRewardCalculator',
    {from: currentAdmin, log: true},
    'grantRole',
    REWARD_DISTRIBUTION,
    liquidityRewardAdmin
  );
};

export default func;
func.tags = ['OpenSandRewardPoolRole_setup'];
func.dependencies = ['OpenSandRewardCalculator_deploy'];
func.skip = async () =>
  !process.argv.some((x) => x.includes('OpenSandRewardPoolRole_setup'));
