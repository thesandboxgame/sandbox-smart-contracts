import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts, ethers} = hre;
  const {deployer, sandAdmin} = await getNamedAccounts();
  const rewardsCalculator = await deployments.get('OpenSandRewardCalculator');

  const rewardsCalculatorAddress = await deployments.read(
    'OpenSandRewardPool',
    'rewardCalculator'
  );

  const sandPool = await ethers.getContract('OpenSandRewardPool');
  const ADMIN_ROLE = await sandPool.DEFAULT_ADMIN_ROLE();

  // check who has Admin role: deployer or sandAdmin
  const currentAdmin = (await sandPool.hasRole(ADMIN_ROLE, deployer))
    ? deployer
    : (await sandPool.hasRole(ADMIN_ROLE, sandAdmin))
    ? sandAdmin
    : deployer;

  if (
    rewardsCalculatorAddress.toLowerCase() !==
    rewardsCalculator.address.toLowerCase()
  ) {
    await deployments.catchUnknownSigner(
      deployments.execute(
        'OpenSandRewardPool',
        {from: currentAdmin, log: true},
        'setRewardCalculator',
        rewardsCalculator.address,
        false
      )
    );
  }
};

export default func;
func.tags = ['OpenSandRewardPool', 'OpenSandRewardPool_setup'];
func.dependencies = [
  'OpenSandRewardCalculator_deploy',
  'OpenSandRewardPool_deploy',
];
