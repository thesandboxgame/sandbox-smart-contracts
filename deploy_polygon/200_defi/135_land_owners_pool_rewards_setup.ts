import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {isInTags} from '../../utils/network';
import hre from 'hardhat';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts} = hre;
  const {deployer} = await getNamedAccounts();
  const rewardCalculator = await deployments.get(
    'LandOwnersAloneRewardCalculator'
  );
  await deployments.execute(
    'LandOwnersSandRewardPool',
    {from: deployer, log: true},
    'setRewardCalculator',
    rewardCalculator.address,
    false
  );
};

export default func;
func.tags = [
  'LandOwnersSandRewardPool',
  'LandOwnersSandRewardPoolReward_setup',
];
func.dependencies = [
  'LandOwnersRewardCalculator_deploy',
  'LandOwnersSandRewardPool_deploy',
];
func.skip = async () => !isInTags(hre, 'L2');
