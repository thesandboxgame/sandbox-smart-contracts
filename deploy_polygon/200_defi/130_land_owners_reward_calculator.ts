import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {isInTags} from '../../utils/network';
import hre from 'hardhat';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts} = hre;
  const {deployer} = await getNamedAccounts();
  const Pool = await deployments.get('LandOwnersSandRewardPool');

  await deployments.deploy('LandOwnersAloneRewardCalculator', {
    from: deployer,
    // TODO: Review which one we want.
    contract: 'TwoPeriodsRewardCalculator',
    args: [Pool.address],
    log: true,
    skipIfAlreadyDeployed: true,
  });
};

export default func;
func.tags = ['LandOwnersSandRewardPool', 'LandOwnersRewardCalculator_deploy'];
func.dependencies = ['LandOwnersSandRewardPool_deploy'];
func.skip = async () => !isInTags(hre, 'L2');
