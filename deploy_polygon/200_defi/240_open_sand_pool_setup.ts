import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {isInTags} from '../../utils/network';
import hre from 'hardhat';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts} = hre;
  const {deployer} = await getNamedAccounts();
  const rewardsCalculator = await deployments.get('OpenSandRewardCalculator');

  const rewardsCalculatorAddress = await deployments.read(
    'OpenSandRewardPool',
    'rewardCalculator'
  );

  if (
    rewardsCalculatorAddress.toLowerCase() !==
    rewardsCalculator.address.toLowerCase()
  ) {
    await deployments.execute(
      'OpenSandRewardPool',
      {from: deployer, log: true},
      'setRewardCalculator',
      rewardsCalculator.address,
      false
    );
  }
};

export default func;
func.tags = ['OpenSandRewardPool', 'OpenSandRewardPool_setup'];
func.dependencies = [
  'OpenSandRewardCalculator_deploy',
  'OpenSandRewardPool_deploy',
];
func.skip = async () => !isInTags(hre, 'L2');
