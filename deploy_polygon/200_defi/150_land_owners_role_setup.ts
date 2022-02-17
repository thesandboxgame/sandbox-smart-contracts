import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts, ethers} = hre;
  const {deployer, liquidityRewardAdmin} = await getNamedAccounts();
  const rewardCalculator = await ethers.getContract(
    'LandOwnersAloneRewardCalculator',
    deployer
  );
  const REWARD_DISTRIBUTION = await rewardCalculator.REWARD_DISTRIBUTION();
  await deployments.execute(
    'LandOwnersAloneRewardCalculator',
    {from: deployer, log: true},
    'grantRole',
    REWARD_DISTRIBUTION,
    liquidityRewardAdmin
  );
};

export default func;
func.tags = ['LandOwnersSandRewardPoolRole_setup'];
func.dependencies = ['LandOwnersRewardCalculator_deploy'];
func.skip = async () =>
  !process.argv.some((x) => x.includes('OpenSandRewardPoolRole_setup'));
