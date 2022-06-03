import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, ethers} = hre;
  const {read, execute, catchUnknownSigner} = deployments;
  const rewardsCalculator = await deployments.get('ERC20RewardCalculator');

  const rewardsCalculatorAddress = await deployments.read(
    'ERC20RewardPool',
    'rewardCalculator'
  );

  const sandPool = await ethers.getContract('ERC20RewardPool');

  // check who has Admin role: deployer or sandAdmin
  const currentAdmin = await sandPool.owner();
  if (
    rewardsCalculatorAddress.toLowerCase() !==
    rewardsCalculator.address.toLowerCase()
  ) {
    await deployments.catchUnknownSigner(
      deployments.execute(
        'ERC20RewardPool',
        {from: currentAdmin, log: true},
        'setRewardCalculator',
        rewardsCalculator.address,
        false
      )
    );
  }

  const TRUSTED_FORWARDER_V2 = await deployments.get('TRUSTED_FORWARDER_V2');
  const isTrustedForwarder = await read(
    'ERC20RewardPool',
    'isTrustedForwarder',
    TRUSTED_FORWARDER_V2.address
  );
  if (!isTrustedForwarder) {
    console.log('Setting TRUSTED_FORWARDER_V2 as trusted forwarder');
    await catchUnknownSigner(
      execute(
        'ERC20RewardPool',
        {from: currentAdmin, log: true},
        'setTrustedForwarder',
        TRUSTED_FORWARDER_V2.address
      )
    );
  }
};

export default func;
func.tags = ['ERC20RewardPool', 'ERC20RewardPool_setup'];
func.dependencies = [
  'ERC20RewardCalculator_deploy',
  'ERC20RewardPool_deploy',
  'TRUSTED_FORWARDER_V2',
];
