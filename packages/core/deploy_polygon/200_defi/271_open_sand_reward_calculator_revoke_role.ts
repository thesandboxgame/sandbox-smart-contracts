import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, ethers, getNamedAccounts} = hre;
  const {deployer, sandAdmin} = await getNamedAccounts();

  const rewardCalculator = await ethers.getContract('OpenSandRewardCalculator');

  const ADMIN_ROLE = await rewardCalculator.DEFAULT_ADMIN_ROLE();

  if (await rewardCalculator.hasRole(ADMIN_ROLE, deployer)) {
    if (!(await rewardCalculator.hasRole(ADMIN_ROLE, sandAdmin))) {
      await deployments.execute(
        'OpenSandRewardCalculator',
        {from: deployer, log: true},
        'grantRole',
        ADMIN_ROLE,
        sandAdmin
      );
    }
    // we need to ensure that sandAdmin has role before renounce deployer
    if (await rewardCalculator.hasRole(ADMIN_ROLE, sandAdmin)) {
      await deployments.execute(
        'OpenSandRewardCalculator',
        {from: deployer, log: true},
        'renounceRole',
        ADMIN_ROLE,
        deployer
      );
    }
  }
};

export default func;
func.tags = ['OpenSandRewardCalculator', 'OpenSandRewardCalculator_setup'];
func.dependencies = ['OpenSandRewardCalculator_deploy'];
func.runAtTheEnd = true;
