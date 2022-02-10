import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, ethers, getNamedAccounts} = hre;
  const {deployer, sandAdmin} = await getNamedAccounts();

  const sandPool = await ethers.getContract('OpenSandRewardPool');
  const rewardCalculator = await ethers.getContract('OpenSandRewardCalculator');

  const ADMIN_ROLE = await sandPool.DEFAULT_ADMIN_ROLE();

  if (await sandPool.hasRole(ADMIN_ROLE, deployer)) {
    await deployments.execute(
      'OpenSandRewardPool',
      {from: deployer, log: true},
      'grantRole',
      ADMIN_ROLE,
      sandAdmin
    );

    await deployments.execute(
      'OpenSandRewardPool',
      {from: deployer, log: true},
      'renounceRole',
      ADMIN_ROLE,
      deployer
    );
  }

  if (await rewardCalculator.hasRole(ADMIN_ROLE, deployer)) {
    await deployments.execute(
      'OpenSandRewardCalculator',
      {from: deployer, log: true},
      'grantRole',
      ADMIN_ROLE,
      sandAdmin
    );

    await deployments.execute(
      'OpenSandRewardCalculator',
      {from: deployer, log: true},
      'renounceRole',
      ADMIN_ROLE,
      deployer
    );
  }
};

export default func;
func.tags = ['OpenSandRewardPoolRole_setup'];
func.dependencies = [
  'OpenSandRewardPool_deploy',
  'OpenSandRewardCalculator_deploy',
];
