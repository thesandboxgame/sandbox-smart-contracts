import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import catalysts from '../../data/catalysts';
import gems from '../../data/gems';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts, ethers} = hre;
  const {sandAdmin, deployer} = await getNamedAccounts();

  const loop = async (
    CatOrGems: typeof catalysts | typeof gems,
    contractName: string
  ) => {
    for (const i of CatOrGems) {
      const contract = `${contractName}_${i.symbol}`;
      const rewardsCalculator = await ethers.getContract(
        `${i.symbol}_RewardCalculator`
      );
      const contributionRules = await ethers.getContract(
        `${i.symbol}_ContributionRules`
      );
      const pool = await ethers.getContract(contract);

      // get currentAdmin - sandpool
      const sandPoolAdmin = await pool.owner();

      // transferOwner from deployer to sandAdmin
      if (sandPoolAdmin.toLowerCase() !== sandAdmin.toLowerCase()) {
        await deployments.catchUnknownSigner(
          deployments.execute(
            contract,
            {from: sandPoolAdmin, log: true},
            'transferOwnership',
            sandAdmin
          )
        );
      }

      // get currentAdmin - contributionRules
      const contribRulesAdmin = await contributionRules.owner();

      // transferOwner from deployer to sandAdmin
      if (contribRulesAdmin.toLowerCase() !== sandAdmin.toLowerCase()) {
        await deployments.catchUnknownSigner(
          deployments.execute(
            `${i.symbol}_ContributionRules`,
            {from: contribRulesAdmin, log: true},
            'transferOwnership',
            sandAdmin
          )
        );
      }

      const ADMIN_ROLE = await rewardsCalculator.DEFAULT_ADMIN_ROLE();

      if (await rewardsCalculator.hasRole(ADMIN_ROLE, deployer)) {
        if (!(await rewardsCalculator.hasRole(ADMIN_ROLE, sandAdmin))) {
          await deployments.execute(
            `${i.symbol}_RewardCalculator`,
            {from: deployer, log: true},
            'grantRole',
            ADMIN_ROLE,
            sandAdmin
          );
        }
        // we need to ensure that sandAdmin has role before renounce deployer
        if (await rewardsCalculator.hasRole(ADMIN_ROLE, sandAdmin)) {
          await deployments.execute(
            `${i.symbol}_RewardCalculator`,
            {from: deployer, log: true},
            'renounceRole',
            ADMIN_ROLE,
            deployer
          );
        }
      }
    }
  };

  await loop(catalysts, 'CatalystRewardPool');

  await loop(gems, 'GemRewardPool');
};

export default func;
func.tags = [
  'CatsGemsRewardPool',
  'CatsGemsTransferOwnserhip',
  'CatsGemsRewardPool_setup',
];
func.dependencies = [
  'CatsGemsRewardCalculator_deploy',
  'CatsGemsRewardPool_deploy',
  'CatsGemsContributionRules_deploy',
];
