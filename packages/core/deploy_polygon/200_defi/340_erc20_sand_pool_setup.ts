import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, ethers} = hre;
  const {read, execute, catchUnknownSigner} = deployments;
  const rewardsCalculator = await deployments.get('ERC20RewardCalculatorV2');
  const contributionRules = await deployments.get('ContributionRulesV2');

  const rewardsCalculatorAddress = await deployments.read(
    'ERC20RewardPoolV2',
    'rewardCalculator'
  );

  const contributionRulesAddress = await deployments.read(
    'ERC20RewardPoolV2',
    'contributionRules'
  );

  const sandPool = await ethers.getContract('ERC20RewardPoolV2');

  // get currentAdmin
  const currentAdmin = await sandPool.owner();

  // set rewawardCalculator contract
  if (
    rewardsCalculatorAddress.toLowerCase() !==
    rewardsCalculator.address.toLowerCase()
  ) {
    await deployments.catchUnknownSigner(
      deployments.execute(
        'ERC20RewardPoolV2',
        {from: currentAdmin, log: true},
        'setRewardCalculator',
        rewardsCalculator.address,
        false
      )
    );
  }

  // set contributionRules contract
  if (
    contributionRulesAddress.toLowerCase() !==
    contributionRules.address.toLowerCase()
  ) {
    await deployments.catchUnknownSigner(
      deployments.execute(
        'ERC20RewardPoolV2',
        {from: currentAdmin, log: true},
        'setContributionRules',
        contributionRules.address
      )
    );
  }

  const TRUSTED_FORWARDER_V2 = await deployments.get('TRUSTED_FORWARDER_V2');
  const isTrustedForwarder = await read(
    'ERC20RewardPoolV2',
    'isTrustedForwarder',
    TRUSTED_FORWARDER_V2.address
  );
  if (!isTrustedForwarder) {
    console.log('Setting TRUSTED_FORWARDER_V2 as trusted forwarder');
    await catchUnknownSigner(
      execute(
        'ERC20RewardPoolV2',
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
