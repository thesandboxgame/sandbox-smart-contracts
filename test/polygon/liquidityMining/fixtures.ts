import {BigNumber} from 'ethers';
import {AbiCoder} from 'ethers/lib/utils';
import {getUnnamedAccounts} from 'hardhat';
import {withSnapshot} from '../../utils';

export const setupPolygonSandRewardPool = withSnapshot(
  ['PolygonSANDRewardPool', 'QUICKSWAP_SAND_MATIC', 'PolygonSand'],
  async function (hre) {
    const {deployments, getNamedAccounts, ethers} = hre;

    const {
      deployer,
      liquidityRewardAdmin,
      liquidityRewardProvider,
      sandBeneficiary,
    } = await getNamedAccounts();

    const others = await getUnnamedAccounts();

    // Define token admins
    const stakeTokenAdmin = deployer;
    const rewardTokenAdmin = sandBeneficiary;

    // Monthly reward 1,500,000 SAND
    const REWARD_AMOUNT = BigNumber.from(1500000).mul('1000000000000000000');
    const REWARD_TOKEN = 'PolygonSand';
    const STAKE_TOKEN = 'QUICKSWAP_SAND_MATIC';
    const STAKE_AMOUNT = BigNumber.from(10000).mul('1000000000000000000');
    const POOL = 'PolygonSANDRewardPool';

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
    const stakeTokenAsAdmin = stakeTokenContract.connect(
      ethers.provider.getSigner(stakeTokenAdmin)
    );
    const stakeTokenAsUser = stakeTokenContract.connect(
      ethers.provider.getSigner(others[0])
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

    const currentRewardDistribution = await rewardPoolContract
      .connect(ethers.provider.getSigner(deployer))
      .rewardDistribution();

    if (
      currentRewardDistribution.toLowerCase() !==
      liquidityRewardAdmin.toLowerCase()
    ) {
      await rewardPoolContract
        .connect(ethers.provider.getSigner(deployer))
        .setRewardDistribution(liquidityRewardAdmin);
    }

    const receipt = await rewardPoolContract
      .connect(ethers.provider.getSigner(liquidityRewardAdmin))
      .notifyRewardAmount(REWARD_AMOUNT);

    // Pass the timestamp of notifyRewardAmount to linkedData for accurate testing
    const latestBlock = await ethers.provider.getBlock(receipt.blockNumber);
    rewardPool.linkedData = JSON.stringify(latestBlock.timestamp);
    await deployments.save('REWARD_NAME', rewardPool);

    await rewardTokenAsAdmin.transfer(rewardPool.address, REWARD_AMOUNT);
    // Give user some stakeTokens
    await stakeTokenAsAdmin.transfer(others[0], STAKE_AMOUNT);
    await stakeTokenAsUser.approve(rewardPool.address, STAKE_AMOUNT);

    return {
      rewardPool,
      rewardPoolContract,
      rewardTokenContract,
      stakeTokenContract,
      sandContract,
      deployer,
      liquidityRewardProvider,
      others,
    };
  }
);

export const setupPolygonLandWeightedSANDRewardPool = withSnapshot(
  [
    'PolygonLandWeightedSANDRewardPool',
    'QUICKSWAP_SAND_MATIC',
    'PolygonSand',
    'Land',
  ],
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
    const POOL = 'PolygonLandWeightedSANDRewardPool';
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

    const currentRewardDistribution = await rewardPoolContract
      .connect(ethers.provider.getSigner(deployer))
      .rewardDistribution();

    if (
      currentRewardDistribution.toLowerCase() !==
      liquidityRewardAdmin.toLowerCase()
    ) {
      await rewardPoolContract
        .connect(ethers.provider.getSigner(deployer))
        .setRewardDistribution(liquidityRewardAdmin);
    }

    // Give user some stakeTokens
    for (let i = 0; i < 3; i++) {
      await stakeTokenAsAdmin.transfer(others[i], STAKE_AMOUNT.mul(10));
      await stakeTokenContract
        .connect(ethers.provider.getSigner(others[i]))
        .approve(rewardPool.address, STAKE_AMOUNT.mul(10));
    }

    return {
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
