import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts, ethers} = hre;
  const {read, execute, catchUnknownSigner} = deployments;
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

  const contributionCalculator = await deployments.get(
    'LandContributionCalculator'
  );

  const contributionCalculatorAddress = await deployments.read(
    'OpenSandRewardPool',
    'contributionCalculator'
  );

  if (
    contributionCalculatorAddress.toLowerCase() !==
    contributionCalculator.address.toLowerCase()
  ) {
    await deployments.catchUnknownSigner(
      deployments.execute(
        'OpenSandRewardPool',
        {from: currentAdmin, log: true},
        'setContributionCalculator',
        contributionCalculator.address
      )
    );
  }

  const TRUSTED_FORWARDER_V2 = await deployments.get('TRUSTED_FORWARDER_V2');
  const isTrustedForwarder = await read(
    'OpenSandRewardPool',
    'isTrustedForwarder',
    TRUSTED_FORWARDER_V2.address
  );
  if (!isTrustedForwarder) {
    console.log('Setting TRUSTED_FORWARDER_V2 as trusted forwarder');
    await catchUnknownSigner(
      execute(
        'OpenSandRewardPool',
        {from: currentAdmin, log: true},
        'setTrustedForwarder',
        TRUSTED_FORWARDER_V2.address
      )
    );
  }
};

export default func;
func.tags = ['OpenSandRewardPool', 'OpenSandRewardPool_setup'];
func.dependencies = [
  'OpenSandRewardCalculator_deploy',
  'LandContributionCalculator_deploy',
  'OpenSandRewardPool_deploy',
  'TRUSTED_FORWARDER_V2',
];
