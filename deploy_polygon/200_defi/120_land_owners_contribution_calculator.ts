import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {isInTags} from '../../utils/network';
import hre from 'hardhat';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts} = hre;
  const {deployer} = await getNamedAccounts();
  const Land = await deployments.get('PolygonLand');

  const contract = await deployments.getOrNull(
    'LandOwnersAloneContributionCalculator'
  );
  if (contract) {
    console.warn(
      'reusing LandOwnersAloneContributionCalculator',
      contract.address
    );
  } else {
    await deployments.deploy('LandOwnersAloneContributionCalculator', {
      from: deployer,
      args: [Land.address],
      log: true,
    });
  }
};

export default func;
func.tags = [
  'LandOwnersSandRewardPool',
  'LandOwnersContributionCalculator_deploy',
];
func.dependencies = ['PolygonLand_deploy'];
func.skip = async () => !isInTags(hre, 'L2');
