import {expect} from 'chai';
import {BigNumber, constants} from 'ethers';
import {ethers} from 'hardhat';
import {expectEventWithArgs, mine} from '../../utils';
import {
  replicateEarned,
  replicateRewardPerToken,
  setupPolygonLandWeightedSANDRewardPool,
} from './fixtures';
import {contribution} from './contributionEquation.test';

async function multipleUsersEarnings(
  nfts: number,
  users: number,
  stakes: number,
  smallRewardAmount = false
) {
  const {
    stakeTokenContract,
    rewardPoolContract,
    others,
    REWARD_DURATION,
    ACTUAL_REWARD_AMOUNT,
    STAKE_AMOUNT,
    multiplierNFTokenContract,
    multiplierNFTokenAdmin,
    SMALL_STAKE_AMOUNT,
  } = await setupPolygonLandWeightedSANDRewardPool();

  let stakeAmount: BigNumber;

  if (smallRewardAmount) {
    stakeAmount = SMALL_STAKE_AMOUNT;
  } else {
    stakeAmount = STAKE_AMOUNT;
  }

  for (let i = 0; i < users; i++) {
    for (let j = 0; j < nfts; j++) {
      await multiplierNFTokenContract
        .connect(ethers.provider.getSigner(multiplierNFTokenAdmin))
        .mintQuad(others[i], 1, i, i + j, '0x');
    }

    for (let k = 0; k < stakes; k++) {
      await rewardPoolContract
        .connect(ethers.provider.getSigner(others[i]))
        .stake(stakeAmount);
    }
  }

  const stakedBalance = await stakeTokenContract.balanceOf(
    rewardPoolContract.address
  );

  expect(stakedBalance).to.equal(stakeAmount.mul(users * stakes));

  const latestBlock = await ethers.provider.getBlock('latest');
  const currentTimestamp = latestBlock.timestamp;
  await ethers.provider.send('evm_setNextBlockTimestamp', [
    currentTimestamp + REWARD_DURATION,
  ]);
  await mine();

  let earned: BigNumber = BigNumber.from(0);

  for (let i = 0; i < users; i++) {
    const userEarned = await rewardPoolContract
      .connect(ethers.provider.getSigner(others[i]))
      .earned(others[i]);

    earned = earned.add(userEarned);
  }
  const precisionLost = ACTUAL_REWARD_AMOUNT.sub(earned);

  return {
    earned,
    ACTUAL_REWARD_AMOUNT,
    precisionLost,
  };
}

describe('PolygonLandWeightedSANDRewardPool', function () {
  it('last time reward application should match the duration', async function () {
    const {rewardPoolContract} = await setupPolygonLandWeightedSANDRewardPool();

    const lastTimeRewardApplicable = await rewardPoolContract.lastTimeRewardApplicable();
    const duration = await rewardPoolContract.duration();

    const latestBlock = await ethers.provider.getBlock('latest');
    const periodFinish = latestBlock.timestamp + duration;

    expect(lastTimeRewardApplicable.toNumber()).equal(
      Math.min(latestBlock.timestamp, periodFinish)
    );
  });

  it('total supply is at first empty', async function () {
    const {rewardPoolContract} = await setupPolygonLandWeightedSANDRewardPool();

    const totalSupply = await rewardPoolContract.totalSupply();

    expect(totalSupply.toNumber()).to.be.equal(0);
  });

  it('staking should update the reward balance, supply and staking token balance', async function () {
    const {
      rewardPoolContract,
      stakeTokenContract,
      others,
    } = await setupPolygonLandWeightedSANDRewardPool();
    const stakeAmount = BigNumber.from(10000).mul('1000000000000000000');

    const initialRewardBalance = await rewardPoolContract.balanceOf(others[0]);
    const initialTotalSupply = await rewardPoolContract.totalSupply();
    const initialStakeTokenBalance = await stakeTokenContract.balanceOf(
      others[0]
    );

    const receipt = await rewardPoolContract
      .connect(ethers.provider.getSigner(others[0]))
      .stake(stakeAmount);

    const rewardBalance = await rewardPoolContract.balanceOf(others[0]);
    const totalSupply = await rewardPoolContract.totalSupply();
    const stakeTokenBalance = await stakeTokenContract.balanceOf(others[0]);

    const stakedEvent = await expectEventWithArgs(
      rewardPoolContract,
      receipt,
      'Staked'
    );

    expect(rewardBalance).to.be.equal(
      BigNumber.from(initialRewardBalance).add(stakeAmount)
    );
    expect(totalSupply).to.be.equal(
      BigNumber.from(initialTotalSupply).add(stakeAmount)
    );
    expect(stakeTokenBalance).to.be.equal(
      BigNumber.from(initialStakeTokenBalance).sub(stakeAmount)
    );

    expect(stakedEvent.args[0]).to.be.equal(others[0]);
    expect(stakedEvent.args[1]).to.be.equal(stakeAmount);
  });

  it('withdraw should update the reward balance, supply and staking token', async function () {
    const {
      rewardPoolContract,
      stakeTokenContract,
      others,
    } = await setupPolygonLandWeightedSANDRewardPool();
    const stakeAmount = BigNumber.from(10000).mul('1000000000000000000');

    await rewardPoolContract
      .connect(ethers.provider.getSigner(others[0]))
      .stake(stakeAmount);

    const initialRewardBalance = await rewardPoolContract.balanceOf(others[0]);
    const initialTotalSupply = await rewardPoolContract.totalSupply();
    const initialStakeTokenBalance = await stakeTokenContract.balanceOf(
      others[0]
    );

    await rewardPoolContract
      .connect(ethers.provider.getSigner(others[0]))
      .withdraw(stakeAmount);

    const rewardBalance = await rewardPoolContract.balanceOf(others[0]);
    const totalSupply = await rewardPoolContract.totalSupply();
    const stakeTokenBalance = await stakeTokenContract.balanceOf(others[0]);

    expect(rewardBalance).to.be.equal(
      BigNumber.from(initialRewardBalance).sub(stakeAmount)
    );
    expect(totalSupply).to.be.equal(
      BigNumber.from(initialTotalSupply).sub(stakeAmount)
    );
    expect(stakeTokenBalance).to.be.equal(
      BigNumber.from(initialStakeTokenBalance).add(stakeAmount)
    );
  });

  it('reward per token should be 0 if total supply is 0', async function () {
    const {rewardPoolContract} = await setupPolygonLandWeightedSANDRewardPool();

    const initialTotalSupply = await rewardPoolContract.totalSupply();
    const rewardPerToken = await rewardPoolContract.rewardPerToken();

    expect(initialTotalSupply).to.be.equal(0);
    expect(rewardPerToken).to.be.equal(0);
  });

  it('reward per token calculation', async function () {
    const {
      rewardPoolContract,
      others,
    } = await setupPolygonLandWeightedSANDRewardPool();
    const stakeAmount = BigNumber.from(10000).mul('1000000000000000000');

    await rewardPoolContract
      .connect(ethers.provider.getSigner(others[0]))
      .stake(BigNumber.from(stakeAmount));

    const totalSupply = await rewardPoolContract.totalSupply();
    const lastTimeRewardApplicable = await rewardPoolContract.lastTimeRewardApplicable();
    const rewardPerTokenStored = await rewardPoolContract.rewardPerTokenStored();
    const lastUpdateTime = await rewardPoolContract.lastUpdateTime();

    const rewardRate = await rewardPoolContract.rewardRate();

    const rewardPerToken = await rewardPoolContract.rewardPerToken();

    expect(rewardPerToken).to.be.equal(
      rewardPerTokenStored.add(
        lastTimeRewardApplicable
          .sub(lastUpdateTime)
          .mul(rewardRate)
          .mul('1000000000000000000000000')
          .div(totalSupply)
      )
    );
  });

  it('earned calculation', async function () {
    const {
      rewardPoolContract,
      others,
    } = await setupPolygonLandWeightedSANDRewardPool();
    const stakeAmount = BigNumber.from(10000).mul('1000000000000000000');

    await rewardPoolContract
      .connect(ethers.provider.getSigner(others[0]))
      .stake(BigNumber.from(stakeAmount));

    await rewardPoolContract
      .connect(ethers.provider.getSigner(others[0]))
      .withdraw(BigNumber.from(stakeAmount));

    const earned = await rewardPoolContract.earned(others[0]);
    const rewardBalance = await rewardPoolContract.balanceOf(others[0]);
    const rewardPerToken = await rewardPoolContract.rewardPerToken();
    const userRewardPerTokenPaid = await rewardPoolContract.userRewardPerTokenPaid(
      others[0]
    );
    const rewards = await rewardPoolContract.rewards(others[0]);

    expect(earned).to.be.equal(
      rewardBalance
        .mul(rewardPerToken.sub(userRewardPerTokenPaid))
        .div(stakeAmount)
        .add(rewards)
    );
  });

  it('get reward should transfer the reward and emit an event', async function () {
    const {
      rewardPoolContract,
      rewardTokenContract,
      others,
    } = await setupPolygonLandWeightedSANDRewardPool();
    const stakeAmount = BigNumber.from(10000).mul('1000000000000000000');

    await rewardPoolContract
      .connect(ethers.provider.getSigner(others[0]))
      .stake(BigNumber.from(stakeAmount));

    await rewardPoolContract
      .connect(ethers.provider.getSigner(others[0]))
      .withdraw(BigNumber.from(stakeAmount));

    const earned = await rewardPoolContract.earned(others[0]);

    const receipt = await rewardPoolContract
      .connect(ethers.provider.getSigner(others[0]))
      .getReward();

    const rewardBalance = await rewardTokenContract.balanceOf(others[0]);
    const rewards = await rewardPoolContract.rewards(others[0]);

    const rewardPaidEvent = await expectEventWithArgs(
      rewardPoolContract,
      receipt,
      'RewardPaid'
    );

    expect(rewards).to.be.equal(0);
    expect(rewardBalance).to.be.equal(earned);
    expect(rewardPaidEvent.args[0]).to.be.equal(others[0]);
    expect(rewardPaidEvent.args[1]).to.be.equal(earned);
  });

  it('exiting should withdraw and transfer the reward', async function () {
    const {
      rewardPoolContract,
      rewardTokenContract,
      others,
    } = await setupPolygonLandWeightedSANDRewardPool();
    const stakeAmount = BigNumber.from(10000).mul('1000000000000000000');

    await rewardPoolContract
      .connect(ethers.provider.getSigner(others[0]))
      .stake(BigNumber.from(stakeAmount));

    const receipt = await rewardPoolContract
      .connect(ethers.provider.getSigner(others[0]))
      .exit();

    const rewardBalance = await rewardTokenContract.balanceOf(others[0]);
    const rewardPoolBalance = await rewardPoolContract.balanceOf(others[0]);

    const rewardPaidEvent = await expectEventWithArgs(
      rewardPoolContract,
      receipt,
      'RewardPaid'
    );

    expect(rewardPoolBalance).to.be.equal(0);
    expect(rewardBalance).to.be.equal(rewardPaidEvent.args[1]);
  });

  it('pool contains reward tokens', async function () {
    const {
      rewardPool,
      rewardTokenContract,
      REWARD_AMOUNT,
    } = await setupPolygonLandWeightedSANDRewardPool();

    const balance = await rewardTokenContract.balanceOf(rewardPool.address);

    expect(balance).to.equal(REWARD_AMOUNT);
  });

  it('user can earn reward tokens if pool has been notified of reward', async function () {
    const {
      rewardPool,
      rewardPoolContract,
      stakeTokenContract,
      STAKE_AMOUNT,
      REWARD_DURATION,
      ACTUAL_REWARD_AMOUNT,
      others,
    } = await setupPolygonLandWeightedSANDRewardPool();

    await rewardPoolContract
      .connect(ethers.provider.getSigner(others[0]))
      .stake(STAKE_AMOUNT);

    const stakedBalance = await stakeTokenContract.balanceOf(
      rewardPool.address
    );

    const userContribution = await rewardPoolContract.contributionOf(others[0]);

    const latestBlock = await ethers.provider.getBlock('latest');
    const currentTimestamp = latestBlock.timestamp;

    await ethers.provider.send('evm_setNextBlockTimestamp', [
      currentTimestamp + REWARD_DURATION,
    ]);
    await mine();

    const earned = await rewardPoolContract
      .connect(ethers.provider.getSigner(others[0]))
      .earned(others[0]);

    expect(stakedBalance).to.equal(STAKE_AMOUNT);
    expect(earned).to.equal(ACTUAL_REWARD_AMOUNT);
    expect(userContribution).to.equal(
      contribution(STAKE_AMOUNT, BigNumber.from(0))
    );
  });

  it('admin can notify to start a new reward process (without sending more reward tokens)', async function () {
    const {
      rewardPoolContract,
      liquidityRewardAdmin,
      NEW_REWARD_AMOUNT,
    } = await setupPolygonLandWeightedSANDRewardPool();

    const periodFinish = await rewardPoolContract.periodFinish();
    const initialRewardRate = await rewardPoolContract.rewardRate();
    const duration = await rewardPoolContract.duration();

    const receipt = await rewardPoolContract
      .connect(ethers.provider.getSigner(liquidityRewardAdmin))
      .notifyRewardAmount(NEW_REWARD_AMOUNT);

    const rewardAddedEvent = await expectEventWithArgs(
      rewardPoolContract,
      receipt,
      'RewardAdded'
    );

    const block = await ethers.provider.getBlock(receipt.blockHash);
    const remaining = periodFinish.sub(block.timestamp);
    const leftover = remaining.mul(initialRewardRate);
    const rewardRate = await rewardPoolContract.rewardRate();

    expect(rewardAddedEvent.args[0]).to.equal(NEW_REWARD_AMOUNT);
    expect(rewardRate).to.equal(NEW_REWARD_AMOUNT.add(leftover).div(duration));
  });

  it('user cannot earn rewardTokens if they stake after the end time', async function () {
    const {
      rewardPoolContract,
      STAKE_AMOUNT,
      REWARD_DURATION,
      others,
    } = await setupPolygonLandWeightedSANDRewardPool();

    const latestBlock = await ethers.provider.getBlock('latest');
    const currentTimestamp = latestBlock.timestamp;
    await ethers.provider.send('evm_setNextBlockTimestamp', [
      currentTimestamp + REWARD_DURATION,
    ]); // fast forward to after the end of current reward period

    await rewardPoolContract
      .connect(ethers.provider.getSigner(others[0]))
      .stake(STAKE_AMOUNT);

    await mine();

    const rewardPerToken = await rewardPoolContract.rewardPerToken();
    const earned = await rewardPoolContract
      .connect(ethers.provider.getSigner(others[0]))
      .earned(others[0]);

    expect(rewardPerToken).to.equal(0);
    expect(earned).to.equal(0);
  });

  // eslint-disable-next-line mocha/no-setup-in-describe
  [1, 29].forEach((days) => {
    it(`user earns full reward amount if there is only one staker after ${days} day(s)`, async function () {
      const {
        rewardPoolContract,
        stakeTokenContract,
        STAKE_AMOUNT,
        REWARD_DURATION,
        ACTUAL_REWARD_AMOUNT,
        ONE_DAY,
        others,
      } = await setupPolygonLandWeightedSANDRewardPool();

      await ethers.provider.send('evm_increaseTime', [ONE_DAY * days]);
      await mine();

      await rewardPoolContract.stake(STAKE_AMOUNT);

      const stakedBalance = await stakeTokenContract.balanceOf(
        rewardPoolContract.address
      );

      const latestBlock = await ethers.provider.getBlock('latest');
      const currentTimestamp = latestBlock.timestamp;
      await ethers.provider.send('evm_setNextBlockTimestamp', [
        currentTimestamp + REWARD_DURATION - ONE_DAY * days,
      ]);
      await mine();

      const earned = await rewardPoolContract.earned(others[0]);

      expect(stakedBalance).to.equal(STAKE_AMOUNT);
      expect(earned).to.equal(ACTUAL_REWARD_AMOUNT);
    });
  });

  it('User with 0 LAND earns correct reward amount', async function () {
    const numNfts = BigNumber.from(0);
    const {
      rewardPoolContract,
      STAKE_AMOUNT,
      REWARD_DURATION,
      REWARD_AMOUNT,
      ACTUAL_REWARD_AMOUNT,
      others,
      notifyRewardTimestamp,
    } = await setupPolygonLandWeightedSANDRewardPool();

    const receipt = await rewardPoolContract
      .connect(ethers.provider.getSigner(others[0]))
      .stake(STAKE_AMOUNT);

    const stakeBlock = await ethers.provider.getBlock(receipt.blockNumber);
    const stakeTimestamp = stakeBlock.timestamp;
    const timeDiff = stakeTimestamp - notifyRewardTimestamp;

    // user earnings immediately after staking
    const earnedAfterStake = await rewardPoolContract
      .connect(ethers.provider.getSigner(others[0]))
      .earned(others[0]);
    const userContribution = await rewardPoolContract.contributionOf(others[0]);

    expect(userContribution).to.equal(contribution(STAKE_AMOUNT, numNfts));

    const rewardRate = REWARD_AMOUNT.div(REWARD_DURATION);

    const expectedInitialRewardPerToken = replicateRewardPerToken(
      BigNumber.from(0),
      BigNumber.from(stakeTimestamp),
      BigNumber.from(stakeTimestamp - timeDiff),
      rewardRate,
      contribution(STAKE_AMOUNT, numNfts)
    );
    const expectedInitialReward = replicateEarned(
      contribution(STAKE_AMOUNT, numNfts),
      expectedInitialRewardPerToken
    );
    expect(expectedInitialReward).to.equal(earnedAfterStake);

    // fast forward to end of reward period
    await ethers.provider.send('evm_setNextBlockTimestamp', [
      stakeTimestamp + REWARD_DURATION,
    ]);
    await mine();

    const earned = await rewardPoolContract
      .connect(ethers.provider.getSigner(others[0]))
      .earned(others[0]);

    // total earned over entire reward period
    const finishTimestamp = stakeTimestamp - timeDiff + REWARD_DURATION;
    const expectedRewardPerToken = replicateRewardPerToken(
      BigNumber.from(0),
      BigNumber.from(finishTimestamp),
      BigNumber.from(stakeTimestamp - timeDiff),
      rewardRate,
      contribution(STAKE_AMOUNT, numNfts)
    );
    const expectedReward = replicateEarned(
      contribution(STAKE_AMOUNT, numNfts),
      expectedRewardPerToken
    );

    expect(ACTUAL_REWARD_AMOUNT).to.equal(expectedReward);
    expect(earned).to.equal(expectedReward);
  });

  it('User with 0 LAND earns correct reward amount - smaller stake', async function () {
    const numNfts = BigNumber.from(0);
    const {
      rewardPoolContract,
      REWARD_DURATION,
      REWARD_AMOUNT,
      ACTUAL_REWARD_AMOUNT,
      others,
      notifyRewardTimestamp,
      LESS_PRECISE_STAKE_AMOUNT,
    } = await setupPolygonLandWeightedSANDRewardPool();

    const receipt = await rewardPoolContract
      .connect(ethers.provider.getSigner(others[0]))
      .stake(LESS_PRECISE_STAKE_AMOUNT);

    const stakeBlock = await ethers.provider.getBlock(receipt.blockNumber);
    const stakeTimestamp = stakeBlock.timestamp;
    const timeDiff = stakeTimestamp - notifyRewardTimestamp;

    // user earnings immediately after staking
    const earnedAfterStake = await rewardPoolContract
      .connect(ethers.provider.getSigner(others[0]))
      .earned(others[0]);
    const userContribution = await rewardPoolContract.contributionOf(others[0]);
    expect(userContribution).to.equal(
      contribution(LESS_PRECISE_STAKE_AMOUNT, numNfts)
    );
    const rewardRate = REWARD_AMOUNT.div(REWARD_DURATION);

    const expectedInitialRewardPerToken = replicateRewardPerToken(
      BigNumber.from(0),
      BigNumber.from(stakeTimestamp),
      BigNumber.from(stakeTimestamp - timeDiff),
      rewardRate,
      contribution(LESS_PRECISE_STAKE_AMOUNT, numNfts)
    );
    const expectedInitialReward = replicateEarned(
      contribution(LESS_PRECISE_STAKE_AMOUNT, numNfts),
      expectedInitialRewardPerToken
    );
    expect(expectedInitialReward).to.equal(earnedAfterStake);

    // fast forward to end of reward period
    await ethers.provider.send('evm_setNextBlockTimestamp', [
      stakeTimestamp + REWARD_DURATION,
    ]);
    await mine();
    const earned = await rewardPoolContract
      .connect(ethers.provider.getSigner(others[0]))
      .earned(others[0]);

    // total earned over entire reward period
    const finishTimestamp = stakeTimestamp - timeDiff + REWARD_DURATION;
    const expectedRewardPerToken = replicateRewardPerToken(
      BigNumber.from(0),
      BigNumber.from(finishTimestamp),
      BigNumber.from(stakeTimestamp - timeDiff),
      rewardRate,
      contribution(LESS_PRECISE_STAKE_AMOUNT, numNfts)
    );
    const expectedReward = replicateEarned(
      contribution(LESS_PRECISE_STAKE_AMOUNT, numNfts),
      expectedRewardPerToken
    );
    expect(earned).to.equal(expectedReward);

    const precisionLost = ACTUAL_REWARD_AMOUNT.sub(expectedReward);
    expect(ACTUAL_REWARD_AMOUNT).not.to.equal(expectedReward);
    expect(precisionLost).to.be.at.least(1);
    expect(precisionLost).to.be.at.most(1);
  });

  // eslint-disable-next-line mocha/no-setup-in-describe
  [1, 3, 10].forEach((lands) => {
    it(`User with ${lands} LAND(s) earns correct reward amount`, async function () {
      const numNfts = BigNumber.from(lands);
      const {
        rewardPoolContract,
        STAKE_AMOUNT,
        REWARD_DURATION,
        REWARD_AMOUNT,
        ACTUAL_REWARD_AMOUNT,
        others,
        notifyRewardTimestamp,
        multiplierNFTokenContract,
        multiplierNFTokenAdmin,
      } = await setupPolygonLandWeightedSANDRewardPool();

      for (let i = 0; i < lands; i++) {
        await multiplierNFTokenContract
          .connect(ethers.provider.getSigner(multiplierNFTokenAdmin))
          .mintQuad(others[0], 1, i, i, '0x');
      }
      const landCount = await multiplierNFTokenContract.balanceOf(others[0]);

      expect(landCount).to.equal(numNfts);

      const receipt = await rewardPoolContract
        .connect(ethers.provider.getSigner(others[0]))
        .stake(STAKE_AMOUNT);

      const stakeBlock = await ethers.provider.getBlock(receipt.blockNumber);
      const stakeTimestamp = stakeBlock.timestamp;
      const timeDiff = stakeTimestamp - notifyRewardTimestamp;

      // user earnings immediately after staking
      const earnedAfterStake = await rewardPoolContract
        .connect(ethers.provider.getSigner(others[0]))
        .earned(others[0]);

      const userContribution = await rewardPoolContract.contributionOf(
        others[0]
      );

      expect(userContribution).to.equal(contribution(STAKE_AMOUNT, numNfts));

      const rewardRate = REWARD_AMOUNT.div(REWARD_DURATION);

      const expectedInitialRewardPerToken = replicateRewardPerToken(
        BigNumber.from(0),
        BigNumber.from(stakeTimestamp),
        BigNumber.from(stakeTimestamp - timeDiff),
        rewardRate,
        contribution(STAKE_AMOUNT, numNfts)
      );
      const expectedInitialReward = replicateEarned(
        contribution(STAKE_AMOUNT, numNfts),
        expectedInitialRewardPerToken
      );

      expect(expectedInitialReward).to.equal(earnedAfterStake);

      // fast forward to end of reward period
      await ethers.provider.send('evm_setNextBlockTimestamp', [
        stakeTimestamp + REWARD_DURATION,
      ]);
      await mine();
      const earned = await rewardPoolContract
        .connect(ethers.provider.getSigner(others[0]))
        .earned(others[0]);

      // total earned over entire reward period
      const finishTimestamp = stakeTimestamp - timeDiff + REWARD_DURATION;
      const expectedRewardPerToken = replicateRewardPerToken(
        BigNumber.from(0),
        BigNumber.from(finishTimestamp),
        BigNumber.from(stakeTimestamp - timeDiff),
        rewardRate,
        contribution(STAKE_AMOUNT, numNfts)
      );
      const expectedReward = replicateEarned(
        contribution(STAKE_AMOUNT, numNfts),
        expectedRewardPerToken
      );
      expect(earned).to.equal(expectedReward);

      const precisionLost = ACTUAL_REWARD_AMOUNT.sub(expectedReward);
      expect(ACTUAL_REWARD_AMOUNT).not.to.equal(expectedReward);
      expect(precisionLost).to.be.at.least(1);
      expect(precisionLost).to.be.at.most(1);
    });
  });

  it('User can withdraw some stakeTokens after several amounts have been staked', async function () {
    const {
      stakeTokenContract,
      rewardPoolContract,
      STAKE_AMOUNT,
      others,
      LESS_PRECISE_STAKE_AMOUNT,
    } = await setupPolygonLandWeightedSANDRewardPool();

    await rewardPoolContract
      .connect(ethers.provider.getSigner(others[0]))
      .stake(LESS_PRECISE_STAKE_AMOUNT);

    await rewardPoolContract
      .connect(ethers.provider.getSigner(others[0]))
      .stake(LESS_PRECISE_STAKE_AMOUNT);

    const receipt = await rewardPoolContract
      .connect(ethers.provider.getSigner(others[0]))
      .withdraw(LESS_PRECISE_STAKE_AMOUNT);

    const balance = await stakeTokenContract.balanceOf(others[0]);

    expect(balance).to.equal(
      STAKE_AMOUNT.mul(10).sub(LESS_PRECISE_STAKE_AMOUNT)
    );

    const withdrawnEvent = await expectEventWithArgs(
      rewardPoolContract,
      receipt,
      'Withdrawn'
    );

    expect(withdrawnEvent.args[0]).to.be.equal(others[0]);
    expect(withdrawnEvent.args[1]).to.be.equal(LESS_PRECISE_STAKE_AMOUNT);
  });

  it('First user can claim their reward - no NFTs', async function () {
    const {
      rewardTokenContract,
      rewardPoolContract,
      others,
      LESS_PRECISE_STAKE_AMOUNT,
      REWARD_DURATION,
      REWARD_AMOUNT,
    } = await setupPolygonLandWeightedSANDRewardPool();

    await rewardPoolContract
      .connect(ethers.provider.getSigner(others[0]))
      .stake(LESS_PRECISE_STAKE_AMOUNT);

    const latestBlock = await ethers.provider.getBlock('latest');
    const currentTimestamp = latestBlock.timestamp;
    await ethers.provider.send('evm_setNextBlockTimestamp', [
      currentTimestamp + REWARD_DURATION,
    ]);
    await mine();

    const expectedReward = await rewardPoolContract
      .connect(ethers.provider.getSigner(others[0]))
      .earned(others[0]);
    const rewardReceipt = await rewardPoolContract
      .connect(ethers.provider.getSigner(others[0]))
      .getReward();

    const balance = await rewardTokenContract.balanceOf(others[0]);

    expect(balance).to.equal(expectedReward);

    const rewardPaidEvent = await expectEventWithArgs(
      rewardPoolContract,
      rewardReceipt,
      'RewardPaid'
    );

    const balanceRewardPool = await rewardTokenContract.balanceOf(
      rewardPoolContract.address
    );

    expect(rewardPaidEvent.args[0]).to.be.equal(others[0]);
    expect(rewardPaidEvent.args[1]).to.be.equal(expectedReward);
    expect(balanceRewardPool).to.equal(REWARD_AMOUNT.sub(expectedReward));
  });

  it('First user can claim their reward - has NFTs', async function () {
    const {
      rewardTokenContract,
      rewardPoolContract,
      others,
      LESS_PRECISE_STAKE_AMOUNT,
      REWARD_DURATION,
      REWARD_AMOUNT,
      multiplierNFTokenContract,
      multiplierNFTokenAdmin,
    } = await setupPolygonLandWeightedSANDRewardPool();

    for (let i = 0; i < 10; i++) {
      await multiplierNFTokenContract
        .connect(ethers.provider.getSigner(multiplierNFTokenAdmin))
        .mintQuad(others[0], 1, i, i, '0x');
    }
    await rewardPoolContract
      .connect(ethers.provider.getSigner(others[0]))
      .stake(LESS_PRECISE_STAKE_AMOUNT);

    const latestBlock = await ethers.provider.getBlock('latest');
    const currentTimestamp = latestBlock.timestamp;
    await ethers.provider.send('evm_setNextBlockTimestamp', [
      currentTimestamp + REWARD_DURATION,
    ]);
    await mine();

    const expectedReward = await rewardPoolContract.earned(others[0]);
    const rewardReceipt = await rewardPoolContract.getReward();

    const balance = await rewardTokenContract.balanceOf(others[0]);

    expect(balance).to.equal(expectedReward);

    const rewardPaidEvent = await expectEventWithArgs(
      rewardPoolContract,
      rewardReceipt,
      'RewardPaid'
    );

    const balanceRewardPool = await rewardTokenContract.balanceOf(
      rewardPoolContract.address
    );

    expect(rewardPaidEvent.args[0]).to.be.equal(others[0]);
    expect(rewardPaidEvent.args[1]).to.be.equal(expectedReward);
    expect(balanceRewardPool).to.equal(REWARD_AMOUNT.sub(expectedReward));
  });

  it('A user can claim their reward after multiple stakes', async function () {
    const {
      rewardTokenContract,
      rewardPoolContract,
      others,
      LESS_PRECISE_STAKE_AMOUNT,
      REWARD_DURATION,
      REWARD_AMOUNT,
      multiplierNFTokenContract,
      multiplierNFTokenAdmin,
    } = await setupPolygonLandWeightedSANDRewardPool();

    for (let i = 0; i < 10; i++) {
      await multiplierNFTokenContract
        .connect(ethers.provider.getSigner(multiplierNFTokenAdmin))
        .mintQuad(others[0], 1, i, i, '0x');
    }
    await rewardPoolContract
      .connect(ethers.provider.getSigner(others[0]))
      .stake(LESS_PRECISE_STAKE_AMOUNT);
    await rewardPoolContract
      .connect(ethers.provider.getSigner(others[0]))
      .stake(LESS_PRECISE_STAKE_AMOUNT);
    await rewardPoolContract
      .connect(ethers.provider.getSigner(others[0]))
      .stake(LESS_PRECISE_STAKE_AMOUNT);

    const latestBlock = await ethers.provider.getBlock('latest');
    const currentTimestamp = latestBlock.timestamp;
    await ethers.provider.send('evm_setNextBlockTimestamp', [
      currentTimestamp + REWARD_DURATION,
    ]);
    await mine();

    const expectedReward = await rewardPoolContract.earned(others[0]);
    const rewardReceipt = await rewardPoolContract.getReward();

    const balance = await rewardTokenContract.balanceOf(others[0]);

    expect(balance).to.equal(expectedReward);

    const rewardPaidEvent = await expectEventWithArgs(
      rewardPoolContract,
      rewardReceipt,
      'RewardPaid'
    );

    const balanceRewardPool = await rewardTokenContract.balanceOf(
      rewardPoolContract.address
    );

    expect(rewardPaidEvent.args[0]).to.be.equal(others[0]);
    expect(rewardPaidEvent.args[1]).to.be.equal(expectedReward);
    expect(balanceRewardPool).to.equal(REWARD_AMOUNT.sub(expectedReward));
  });

  it('First user can exit the pool', async function () {
    const {
      stakeTokenContract,
      rewardPoolContract,
      others,
      STAKE_AMOUNT,
      LESS_PRECISE_STAKE_AMOUNT,
    } = await setupPolygonLandWeightedSANDRewardPool();

    await rewardPoolContract
      .connect(ethers.provider.getSigner(others[0]))
      .stake(LESS_PRECISE_STAKE_AMOUNT);

    const receipt = await rewardPoolContract
      .connect(ethers.provider.getSigner(others[0]))
      .exit();

    // No user stakeTokens remaining in pool
    const balanceUser = await stakeTokenContract.balanceOf(others[0]);
    expect(balanceUser).to.equal(STAKE_AMOUNT.mul(10));
    const balancePool = await stakeTokenContract.balanceOf(
      rewardPoolContract.address
    );
    expect(balancePool).to.equal(0);

    const withdrawnEvent = await expectEventWithArgs(
      rewardPoolContract,
      receipt,
      'Withdrawn'
    );

    const rewardPaidEvent = await expectEventWithArgs(
      rewardPoolContract,
      receipt,
      'RewardPaid'
    );

    expect(withdrawnEvent.args[0]).to.be.equal(others[0]);
    expect(rewardPaidEvent.args[0]).to.be.equal(others[0]);
  });

  it('A user can exit the pool after multiple stakes', async function () {
    const {
      stakeTokenContract,
      rewardPoolContract,
      others,
      STAKE_AMOUNT,
      LESS_PRECISE_STAKE_AMOUNT,
    } = await setupPolygonLandWeightedSANDRewardPool();

    await rewardPoolContract
      .connect(ethers.provider.getSigner(others[0]))
      .stake(LESS_PRECISE_STAKE_AMOUNT);

    await rewardPoolContract
      .connect(ethers.provider.getSigner(others[0]))
      .stake(LESS_PRECISE_STAKE_AMOUNT);

    await rewardPoolContract
      .connect(ethers.provider.getSigner(others[0]))
      .stake(LESS_PRECISE_STAKE_AMOUNT);

    const receipt = await rewardPoolContract
      .connect(ethers.provider.getSigner(others[0]))
      .exit();

    // No user stakeTokens remaining in pool
    const balanceUser = await stakeTokenContract.balanceOf(others[0]);
    expect(balanceUser).to.equal(STAKE_AMOUNT.mul(10));
    const balancePool = await stakeTokenContract.balanceOf(
      rewardPoolContract.address
    );
    expect(balancePool).to.equal(0);

    const withdrawnEvent = await expectEventWithArgs(
      rewardPoolContract,
      receipt,
      'Withdrawn'
    );

    const rewardPaidEvent = await expectEventWithArgs(
      rewardPoolContract,
      receipt,
      'RewardPaid'
    );

    expect(withdrawnEvent.args[0]).to.be.equal(others[0]);
    expect(rewardPaidEvent.args[0]).to.be.equal(others[0]);
  });

  it('A user with NFTs can exit the pool after multiple stakes', async function () {
    const {
      stakeTokenContract,
      rewardPoolContract,
      others,
      STAKE_AMOUNT,
      LESS_PRECISE_STAKE_AMOUNT,
      multiplierNFTokenContract,
      multiplierNFTokenAdmin,
    } = await setupPolygonLandWeightedSANDRewardPool();

    for (let i = 0; i < 10; i++) {
      await multiplierNFTokenContract
        .connect(ethers.provider.getSigner(multiplierNFTokenAdmin))
        .mintQuad(others[0], 1, i, i, '0x');
    }
    await rewardPoolContract
      .connect(ethers.provider.getSigner(others[0]))
      .stake(LESS_PRECISE_STAKE_AMOUNT);

    await rewardPoolContract
      .connect(ethers.provider.getSigner(others[0]))
      .stake(LESS_PRECISE_STAKE_AMOUNT);

    await rewardPoolContract
      .connect(ethers.provider.getSigner(others[0]))
      .stake(LESS_PRECISE_STAKE_AMOUNT);

    const receipt = await rewardPoolContract
      .connect(ethers.provider.getSigner(others[0]))
      .exit();

    // No user stakeTokens remaining in pool
    const balanceUser = await stakeTokenContract.balanceOf(others[0]);
    expect(balanceUser).to.equal(STAKE_AMOUNT.mul(10));
    const balancePool = await stakeTokenContract.balanceOf(
      rewardPoolContract.address
    );
    expect(balancePool).to.equal(0);

    const withdrawnEvent = await expectEventWithArgs(
      rewardPoolContract,
      receipt,
      'Withdrawn'
    );

    const rewardPaidEvent = await expectEventWithArgs(
      rewardPoolContract,
      receipt,
      'RewardPaid'
    );

    expect(withdrawnEvent.args[0]).to.be.equal(others[0]);
    expect(rewardPaidEvent.args[0]).to.be.equal(others[0]);
  });

  it('Change externals contracts', async function () {
    const {
      rewardTokenContract,
      rewardPoolContract,
      deployer,
      liquidityRewardAdmin,
    } = await setupPolygonLandWeightedSANDRewardPool();

    // owner can change LPtoken contract
    await expect(
      rewardPoolContract
        .connect(ethers.provider.getSigner(deployer))
        .SetRewardToken(constants.AddressZero)
    ).to.be.revertedWith('Bad RewardToken address');

    // use deployer address as not contract address
    await expect(
      rewardPoolContract
        .connect(ethers.provider.getSigner(deployer))
        .SetRewardToken(deployer)
    ).to.be.revertedWith('Bad RewardToken address');

    await expect(
      rewardPoolContract
        .connect(ethers.provider.getSigner(liquidityRewardAdmin))
        .SetNFTMultiplierToken(rewardTokenContract.address)
    ).to.be.reverted;

    // Change address with another contract in order to see if not reverted
    await expect(
      rewardPoolContract
        .connect(ethers.provider.getSigner(deployer))
        .SetNFTMultiplierToken(rewardTokenContract.address)
    ).not.to.be.reverted;
  });

  it(`user earnings for 0 NFT(s) match expected reward with 1 stake(s)`, async function () {
    const {earned, ACTUAL_REWARD_AMOUNT} = await multipleUsersEarnings(
      0,
      1,
      1,
      true
    );

    expect(earned).to.equal(ACTUAL_REWARD_AMOUNT);
  });

  it(`user earnings for 0 NFT(s) match expected reward with 2 stake(s)`, async function () {
    const {earned, ACTUAL_REWARD_AMOUNT} = await multipleUsersEarnings(
      0,
      1,
      2,
      true
    );

    expect(earned).to.equal(ACTUAL_REWARD_AMOUNT);
  });

  it(`user earnings for 0 NFT(s) match expected reward with 4 stake(s)`, async function () {
    const {
      earned,
      ACTUAL_REWARD_AMOUNT,
      precisionLost,
    } = await multipleUsersEarnings(0, 1, 4, true);

    expect(earned).not.to.equal(ACTUAL_REWARD_AMOUNT);
    expect(precisionLost).to.be.at.least(1);
    expect(precisionLost).to.be.at.most(1);
  });

  it(`user earnings for 0 NFT(s) match expected reward with 10 stake(s)`, async function () {
    const {
      earned,
      ACTUAL_REWARD_AMOUNT,
      precisionLost,
    } = await multipleUsersEarnings(0, 1, 10, true);

    expect(earned).not.to.equal(ACTUAL_REWARD_AMOUNT);
    expect(precisionLost).to.be.at.least(1);
    expect(precisionLost).to.be.at.most(4);
  });

  it(`user earnings for 1 NFT(s) match expected reward with 1 stake(s)`, async function () {
    const {
      earned,
      ACTUAL_REWARD_AMOUNT,
      precisionLost,
    } = await multipleUsersEarnings(1, 1, 1);

    expect(earned).not.to.equal(ACTUAL_REWARD_AMOUNT);
    expect(precisionLost).to.be.at.least(1);
    expect(precisionLost).to.be.at.most(1);
  });

  it(`user earnings for 1 NFT(s) match expected reward with 10 stake(s)`, async function () {
    const {
      earned,
      ACTUAL_REWARD_AMOUNT,
      precisionLost,
    } = await multipleUsersEarnings(1, 1, 10, true);

    expect(earned).not.to.equal(ACTUAL_REWARD_AMOUNT);
    expect(precisionLost).to.be.at.least(1);
    expect(precisionLost).to.be.at.most(10);
  });

  it(`user earnings for 2 NFT(s) match expected reward with 1 stake(s)`, async function () {
    const {
      earned,
      ACTUAL_REWARD_AMOUNT,
      precisionLost,
    } = await multipleUsersEarnings(2, 1, 1);

    expect(earned).not.to.equal(ACTUAL_REWARD_AMOUNT);
    expect(precisionLost).to.be.at.least(1);
    expect(precisionLost).to.be.at.most(1);
  });

  it(`user earnings for 3 NFT(s) match expected reward with 1 stake(s)`, async function () {
    const {
      earned,
      ACTUAL_REWARD_AMOUNT,
      precisionLost,
    } = await multipleUsersEarnings(3, 1, 1);

    expect(earned).not.to.equal(ACTUAL_REWARD_AMOUNT);
    expect(precisionLost).to.be.at.least(1);
    expect(precisionLost).to.be.at.most(1);
  });

  it(`user earnings for 3 NFT(s) match expected reward with 10 stake(s)`, async function () {
    const {
      earned,
      ACTUAL_REWARD_AMOUNT,
      precisionLost,
    } = await multipleUsersEarnings(3, 1, 10, true);

    expect(earned).not.to.equal(ACTUAL_REWARD_AMOUNT);
    expect(precisionLost).to.be.at.least(1);
    expect(precisionLost).to.be.at.most(10);
  });

  it(`user earnings for 89 NFT(s) match expected reward with 1 stake(s)`, async function () {
    const {
      earned,
      ACTUAL_REWARD_AMOUNT,
      precisionLost,
    } = await multipleUsersEarnings(89, 1, 1);

    expect(earned).not.to.equal(ACTUAL_REWARD_AMOUNT);
    expect(precisionLost).to.be.at.least(1);
    expect(precisionLost).to.be.at.most(1);
  });

  it(`user earnings for 89 NFT(s) match expected reward with 10 stake(s)`, async function () {
    const {
      earned,
      ACTUAL_REWARD_AMOUNT,
      precisionLost,
    } = await multipleUsersEarnings(89, 1, 10, true);

    expect(earned).not.to.equal(ACTUAL_REWARD_AMOUNT);
    expect(precisionLost).to.be.at.least(1);
    expect(precisionLost).to.be.at.most(10);
  });

  it(`Multiple Users' earnings for 0 NFTs match expected reward: 2 users, 10 stake each`, async function () {
    const {
      earned,
      ACTUAL_REWARD_AMOUNT,
      precisionLost,
    } = await multipleUsersEarnings(0, 2, 10, true);

    expect(earned).not.to.equal(ACTUAL_REWARD_AMOUNT);
    expect(precisionLost).to.be.at.least(1);
    expect(precisionLost).to.be.at.most(10);
  });

  it(`Multiple Users' earnings for 0 NFTs match expected reward: 3 users, 1 stake each`, async function () {
    const {
      earned,
      ACTUAL_REWARD_AMOUNT,
      precisionLost,
    } = await multipleUsersEarnings(0, 3, 1);

    expect(earned).not.to.equal(ACTUAL_REWARD_AMOUNT);
    expect(precisionLost).to.be.at.least(1);
    expect(precisionLost).to.be.at.most(2);
  });

  it(`Multiple Users' earnings for 1 NFTs match expected reward: 2 users, 1 stake each`, async function () {
    const {
      earned,
      ACTUAL_REWARD_AMOUNT,
      precisionLost,
    } = await multipleUsersEarnings(1, 2, 1);

    expect(earned).not.to.equal(ACTUAL_REWARD_AMOUNT);
    expect(precisionLost).to.be.at.least(1);
    expect(precisionLost).to.be.at.most(2);
  });

  it(`Multiple Users' earnings for 1 NFTs match expected reward: 2 users, 10 stake each`, async function () {
    const {
      earned,
      ACTUAL_REWARD_AMOUNT,
      precisionLost,
    } = await multipleUsersEarnings(1, 2, 1, true);

    expect(earned).not.to.equal(ACTUAL_REWARD_AMOUNT);
    expect(precisionLost).to.be.at.least(1);
    expect(precisionLost).to.be.at.most(11);
  });

  it(`Multiple Users' earnings for 3 NFTs match expected reward: 2 users, 1 stake each`, async function () {
    const {
      earned,
      ACTUAL_REWARD_AMOUNT,
      precisionLost,
    } = await multipleUsersEarnings(3, 2, 1);

    expect(earned).not.to.equal(ACTUAL_REWARD_AMOUNT);
    expect(precisionLost).to.be.at.least(1);
    expect(precisionLost).to.be.at.most(2);
  });

  it(`Multiple Users' earnings for 100 NFTs match expected reward: 2 users, 1 stake each`, async function () {
    const {
      earned,
      ACTUAL_REWARD_AMOUNT,
      precisionLost,
    } = await multipleUsersEarnings(100, 2, 1);

    expect(earned).not.to.equal(ACTUAL_REWARD_AMOUNT);
    expect(precisionLost).to.be.at.least(1);
    expect(precisionLost).to.be.at.most(2);
  });
});
