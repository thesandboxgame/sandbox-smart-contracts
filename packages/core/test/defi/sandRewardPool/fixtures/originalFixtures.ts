import {BigNumber} from 'ethers';
import {AbiCoder} from 'ethers/lib/utils';
import {getUnnamedAccounts} from 'hardhat';
import {withSnapshot} from '../../../utils';

// TODO: Replace PolygonSand with a mock erc20 like FakeLPSandMatic
export const setupSandRewardPool = withSnapshot(
  ['PolygonSand'],
  async function (hre) {
    const {deployments, getNamedAccounts, ethers} = hre;
    const {
      deployer,
      liquidityRewardAdmin,
      liquidityRewardProvider,
      landAdmin,
      sandBeneficiary,
    } = await getNamedAccounts();

    const others = await getUnnamedAccounts();

    // Taken from 01_deploy_mock_land_with_mint.ts
    await deployments.deploy('MockLandWithMint', {
      from: deployer,
      log: true,
      skipIfAlreadyDeployed: true,
    });

    // Taken from 00_deploy_fake_LP_MATICSAND_tokens_if_needed.ts
    await deployments.deploy('QUICKSWAP_SAND_MATIC', {
      from: deployer,
      contract: 'FakeLPSandMatic',
      log: true,
    });

    // Taken from 00_deploy_land_weighted_sand_reward_pool.ts
    const stakeToken = await deployments.get('QUICKSWAP_SAND_MATIC');
    const land = await deployments.get('MockLandWithMint');
    const sand = await deployments.get('PolygonSand');
    const durationInSeconds = 28 * 24 * 60 * 60;

    const TRUSTED_FORWARDER = await deployments.get('TRUSTED_FORWARDER');
    const trustedForwarder = await ethers.getContractAt(
      'TestMetaTxForwarder',
      TRUSTED_FORWARDER.address
    );
    await deployments.deploy('SandRewardPool', {
      from: deployer,
      log: true,
      args: [stakeToken.address, sand.address, trustedForwarder.address],
      skipIfAlreadyDeployed: true,
    });
    const rewardPoolAsDeployer = await ethers.getContract(
      'SandRewardPool',
      deployer
    );

    // Added
    await deployments.deploy('ContributionCalculator', {
      from: deployer,
      contract: 'LandContributionCalculator',
      args: [land.address],
      log: true,
    });
    const contributionCalculator = await ethers.getContract(
      'ContributionCalculator'
    );
    await rewardPoolAsDeployer.setContributionCalculator(
      contributionCalculator.address
    );
    await deployments.deploy('RewardCalculator', {
      from: deployer,
      contract: 'PeriodicRewardCalculator',
      args: [rewardPoolAsDeployer.address, durationInSeconds],
      log: true,
    });
    const rewardCalculator = await ethers.getContract('RewardCalculator');

    await rewardPoolAsDeployer.setRewardCalculator(
      rewardCalculator.address,
      false
    );
    // Added end

    // Define token admins
    const stakeTokenAdmin = deployer;
    const multiplierNFTokenAdmin = landAdmin;
    const rewardTokenAdmin = sandBeneficiary;

    // Monthly reward 1,500,000 SAND
    const REWARD_AMOUNT = BigNumber.from(1500000).mul('1000000000000000000');
    const NEW_REWARD_AMOUNT = BigNumber.from(2000000).mul(
      '1000000000000000000'
    );
    const WRONG_REWARD_AMOUNT = BigNumber.from(1500000);
    const REWARD_TOKEN = 'PolygonSand';
    const STAKE_TOKEN = 'QUICKSWAP_SAND_MATIC';
    const STAKE_AMOUNT = BigNumber.from(10000).mul('1000000000000000000');
    const SMALL_STAKE_AMOUNT = BigNumber.from(10).mul('1000000000000000000');
    const LESS_PRECISE_STAKE_AMOUNT = BigNumber.from(7).mul(
      '1000000000000000000'
    );
    const POOL = 'SandRewardPool';
    const REWARD_DURATION = 2419200; // 28 days in seconds
    const ACTUAL_REWARD_AMOUNT = REWARD_AMOUNT.div(REWARD_DURATION).mul(
      REWARD_DURATION
    );
    const ONE_DAY = 86400;
    const MULTIPLIER_NFToken = 'MockLandWithMint';

    const rewardPool = await deployments.get(POOL);

    // Contracts
    const rewardPoolContract = await ethers.getContract(POOL);
    const sandContract = await ethers.getContract(
      REWARD_TOKEN,
      liquidityRewardProvider
    );
    const childChainManagerContract = await ethers.getContract(
      'CHILD_CHAIN_MANAGER'
    );
    const rewardTokenContract = await ethers.getContract(REWARD_TOKEN);
    const stakeTokenContract = await ethers.getContract(STAKE_TOKEN);
    const multiplierNFTokenContract = await ethers.getContract(
      MULTIPLIER_NFToken
    );
    const stakeTokenAsAdmin = stakeTokenContract.connect(
      ethers.provider.getSigner(stakeTokenAdmin)
    );
    const rewardTokenAsAdmin = rewardTokenContract.connect(
      ethers.provider.getSigner(rewardTokenAdmin)
    );

    const abiCoder = new AbiCoder();
    const data = abiCoder.encode(['uint256'], [REWARD_AMOUNT]);

    await childChainManagerContract.callSandDeposit(
      sandContract.address,
      rewardTokenAdmin,
      data
    );

    // TODO: This was removed and replaced, we need specific tests for roles!!!
    const REWARD_DISTRIBUTION = await rewardCalculator.REWARD_DISTRIBUTION();
    await rewardCalculator
      .connect(ethers.provider.getSigner(deployer))
      .grantRole(REWARD_DISTRIBUTION, liquidityRewardAdmin);
    // const currentRewardDistribution = await rewardPoolContract
    //   .connect(ethers.provider.getSigner(deployer))
    //   .rewardDistribution();
    //
    // if (
    //   currentRewardDistribution.toLowerCase() !==
    //   liquidityRewardAdmin.toLowerCase()
    // ) {
    // await rewardPoolContract
    //   .connect(ethers.provider.getSigner(deployer))
    //   .setRewardDistribution(liquidityRewardAdmin);
    // }

    // Give user some stakeTokens
    for (let i = 0; i < 3; i++) {
      await stakeTokenAsAdmin.transfer(others[i], STAKE_AMOUNT.mul(10));
      await stakeTokenContract
        .connect(ethers.provider.getSigner(others[i]))
        .approve(rewardPool.address, STAKE_AMOUNT.mul(10));
    }

    return {
      contributionCalculator,
      rewardCalculator,
      rewardPool,
      rewardPoolContract,
      rewardTokenContract,
      stakeTokenContract,
      multiplierNFTokenContract,
      sandContract,
      deployer,
      liquidityRewardProvider,
      liquidityRewardAdmin,
      others,
      REWARD_AMOUNT,
      STAKE_AMOUNT,
      REWARD_DURATION,
      ACTUAL_REWARD_AMOUNT,
      NEW_REWARD_AMOUNT,
      ONE_DAY,
      LESS_PRECISE_STAKE_AMOUNT,
      multiplierNFTokenAdmin,
      SMALL_STAKE_AMOUNT,
      rewardTokenAdmin,
      rewardTokenAsAdmin,
      WRONG_REWARD_AMOUNT,
    };
  }
);

const SOL_PRECISION = BigNumber.from(1).mul('1000000000000000000000000');

export const replicateRewardPerToken = function (
  rewardPerTokenStored: BigNumber,
  lastTimeRewardApplicable: BigNumber,
  lastUpdateTime: BigNumber,
  rewardRate: BigNumber,
  totalContributions: BigNumber
): BigNumber {
  const timeDifference = lastTimeRewardApplicable.sub(lastUpdateTime);
  return rewardPerTokenStored.add(
    timeDifference.mul(rewardRate).mul(SOL_PRECISION).div(totalContributions)
  );
};

export const replicateEarned = function (
  contribution: BigNumber,
  rewardPerToken: BigNumber
): BigNumber {
  return contribution.mul(rewardPerToken).div(SOL_PRECISION);
};
