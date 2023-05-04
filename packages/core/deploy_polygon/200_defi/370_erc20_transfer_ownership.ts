import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts, ethers} = hre;
  const {operationsAdmin, deployer} = await getNamedAccounts();

  const rewardsCalculator = await ethers.getContract('ERC20RewardCalculatorV2');
  const contributionRules = await ethers.getContract('ContributionRulesV2');
  const sandPool = await ethers.getContract('ERC20RewardPoolV2');

  // get currentAdmin - sandpool
  const sandPoolAdmin = await sandPool.owner();

  // transferOwner from deployer to sandAdmin
  if (sandPoolAdmin.toLowerCase() !== operationsAdmin.toLowerCase()) {
    await deployments.catchUnknownSigner(
      deployments.execute(
        'ERC20RewardPoolV2',
        {from: sandPoolAdmin, log: true},
        'transferOwnership',
        operationsAdmin
      )
    );
  }

  // get currentAdmin - contributionRules
  const contribRulesAdmin = await contributionRules.owner();

  // transferOwner from deployer to sandAdmin
  if (contribRulesAdmin.toLowerCase() !== operationsAdmin.toLowerCase()) {
    await deployments.catchUnknownSigner(
      deployments.execute(
        'ContributionRulesV2',
        {from: contribRulesAdmin, log: true},
        'transferOwnership',
        operationsAdmin
      )
    );
  }

  const ADMIN_ROLE = await rewardsCalculator.DEFAULT_ADMIN_ROLE();

  if (await rewardsCalculator.hasRole(ADMIN_ROLE, deployer)) {
    if (!(await rewardsCalculator.hasRole(ADMIN_ROLE, operationsAdmin))) {
      await deployments.execute(
        'ERC20RewardCalculatorV2',
        {from: deployer, log: true},
        'grantRole',
        ADMIN_ROLE,
        operationsAdmin
      );
    }
    // we need to ensure that sandAdmin has role before renounce deployer
    if (await rewardsCalculator.hasRole(ADMIN_ROLE, operationsAdmin)) {
      await deployments.execute(
        'ERC20RewardCalculatorV2',
        {from: deployer, log: true},
        'renounceRole',
        ADMIN_ROLE,
        deployer
      );
    }
  }
};

export default func;
func.tags = ['ERC20RewardPool', 'ERC20TransferOwnserhip'];
func.dependencies = [
  'ERC20RewardCalculator_deploy',
  'ERC20RewardPool_deploy',
  'ContributionRules_deploy',
  'ERC20RewardPool_setup',
];
