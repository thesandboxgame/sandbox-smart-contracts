import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts} = hre;
  const {deployer} = await getNamedAccounts();
  const Pool = await deployments.get('OpenSandRewardPool');

  await deployments.deploy('OpenSandRewardCalculator', {
    from: deployer,
    contract: 'TwoPeriodsRewardCalculator',
    args: [Pool.address],
    log: true,
    skipIfAlreadyDeployed: true,
  });
};

export default func;
func.tags = ['OpenSandRewardCalculator', 'OpenSandRewardCalculator_deploy'];
func.dependencies = ['OpenSandRewardPool_deploy'];
