import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import catalysts from '../../data/catalysts';
import gems from '../../data/gems';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, ethers} = hre;
  const {read, execute, catchUnknownSigner} = deployments;

  const loop = async (
    CatOrGems: typeof catalysts | typeof gems,
    contractName: string
  ) => {
    for (const i of CatOrGems) {
      const contract = `${contractName}_${i.symbol}`;

      const rewardsCalculator = await deployments.get(
        `${i.symbol}_RewardCalculator`
      );
      const contributionRules = await deployments.get(
        `${i.symbol}_ContributionRules`
      );
      const rewardsCalculatorAddress = await deployments.read(
        contract,
        'rewardCalculator'
      );

      const contributionRulesAddress = await deployments.read(
        contract,
        'contributionRules'
      );

      const pool = await ethers.getContract(contract);

      // get currentAdmin
      const currentAdmin = await pool.owner();

      // set rewawardCalculator contract
      if (
        rewardsCalculatorAddress.toLowerCase() !==
        rewardsCalculator.address.toLowerCase()
      ) {
        await deployments.catchUnknownSigner(
          deployments.execute(
            contract,
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
            contract,
            {from: currentAdmin, log: true},
            'setContributionRules',
            contributionRules.address
          )
        );
      }

      const TRUSTED_FORWARDER_V2 = await deployments.get(
        'TRUSTED_FORWARDER_V2'
      );
      const isTrustedForwarder = await read(
        contract,
        'isTrustedForwarder',
        TRUSTED_FORWARDER_V2.address
      );
      if (!isTrustedForwarder) {
        console.log('Setting TRUSTED_FORWARDER_V2 as trusted forwarder');
        await catchUnknownSigner(
          execute(
            contract,
            {from: currentAdmin, log: true},
            'setTrustedForwarder',
            TRUSTED_FORWARDER_V2.address
          )
        );
      }
    }
  };

  await loop(catalysts, 'CatalystRewardPool');

  await loop(gems, 'GemRewardPool');
};

export default func;
func.tags = ['CatsGemsRewardPool', 'CatsGemsRewardPool_setup'];
func.dependencies = [
  'CatsGemsRewardCalculator_deploy',
  'CatsGemsRewardPool_deploy',
  'TRUSTED_FORWARDER_V2',
];
