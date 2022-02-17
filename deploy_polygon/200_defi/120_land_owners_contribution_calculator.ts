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
  await deployments.deploy('LandOwnersAloneContributionCalculator', {
    from: deployer,
    args: [Land.address],
    log: true,
    skipIfAlreadyDeployed: true,
  });
};

export default func;
func.tags = [
  'LandOwnersSandRewardPool',
  'LandOwnersContributionCalculator_deploy',
];
func.dependencies = ['PolygonLand_deploy'];
func.skip = async () => !isInTags(hre, 'L2');
