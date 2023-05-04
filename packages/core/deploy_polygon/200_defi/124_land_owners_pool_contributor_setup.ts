import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {isInTags} from '../../utils/network';
import hre from 'hardhat';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts} = hre;
  const {deployer} = await getNamedAccounts();
  const contributorCalculator = await deployments.get(
    'LandOwnersAloneContributionCalculator'
  );
  await deployments.execute(
    'LandOwnersSandRewardPool',
    {from: deployer, log: true},
    'setContributionCalculator',
    contributorCalculator.address
  );
};

export default func;
func.tags = [
  'LandOwnersSandRewardPool',
  'LandOwnersSandRewardPoolContributor_setup',
];
func.dependencies = [
  'LandOwnersContributionCalculator_deploy',
  'LandOwnersSandRewardPool_deploy',
];
func.skip = async () => !isInTags(hre, 'L2');
