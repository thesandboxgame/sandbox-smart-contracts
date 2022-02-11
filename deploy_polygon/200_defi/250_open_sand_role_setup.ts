import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts, ethers} = hre;
  const {deployer, sandAdmin, liquidityRewardAdmin} = await getNamedAccounts();

  const rewardCalculator = await ethers.getContract('OpenSandRewardCalculator');

  const REWARD_DISTRIBUTION = await rewardCalculator.REWARD_DISTRIBUTION();
  if (
    !(await rewardCalculator.hasRole(REWARD_DISTRIBUTION, liquidityRewardAdmin))
  ) {
    const ADMIN_ROLE = await rewardCalculator.DEFAULT_ADMIN_ROLE();

    // check who has Admin role: deployer or sandAdmin
    const currentAdmin = (await rewardCalculator.hasRole(ADMIN_ROLE, deployer))
      ? deployer
      : (await rewardCalculator.hasRole(ADMIN_ROLE, sandAdmin))
      ? sandAdmin
      : deployer;

    await deployments.catchUnknownSigner(
      deployments.execute(
        'OpenSandRewardCalculator',
        {from: currentAdmin, log: true},
        'grantRole',
        REWARD_DISTRIBUTION,
        liquidityRewardAdmin
      )
    );
  }
};

export default func;
func.tags = ['OpenSandRewardCalculator', 'OpenSandRewardCalculator_setup'];
func.dependencies = [
  'OpenSandRewardPool_deploy',
  'OpenSandRewardCalculator_deploy',
];
