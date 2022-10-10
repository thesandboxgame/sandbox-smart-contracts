import {expect} from '../../chai-setup';
import {BigNumber} from 'ethers';
import {ethers} from 'hardhat';
import {expectEventWithArgs} from '../../utils';
import {setupPolygonSandRewardPool} from './fixtures';

describe('PolygonSANDRewardPool', function () {
  it('last time reward application should match 30 days', async function () {
    const {rewardPoolContract} = await setupPolygonSandRewardPool();

    const lastTimeRewardApplicable = await rewardPoolContract.lastTimeRewardApplicable();
    const duration = 30 * 24 * 60 * 60;

    const latestBlock = await ethers.provider.getBlock('latest');
    const periodFinish = latestBlock.timestamp + duration;

    expect(lastTimeRewardApplicable.toNumber()).equal(
      Math.min(latestBlock.timestamp, periodFinish)
    );
  });

  it('total supply is at first empty', async function () {
    const {rewardPoolContract} = await setupPolygonSandRewardPool();

    const totalSupply = await rewardPoolContract.totalSupply();

    expect(totalSupply.toNumber()).to.be.equal(0);
  });

  it('staking should update the reward balance, supply and staking token balance', async function () {
    const {
      rewardPoolContract,
      stakeTokenContract,
      others,
    } = await setupPolygonSandRewardPool();
    const stakeAmount = BigNumber.from(10000).mul('1000000000000000000');

    const initialRewardBalance = await rewardPoolContract.balanceOf(others[0]);
    const initialTotalSupply = await rewardPoolContract.totalSupply();
    const initialStakeTokenBalance = await stakeTokenContract.balanceOf(
      others[0]
    );

    await rewardPoolContract
      .connect(ethers.provider.getSigner(others[0]))
      .stake(stakeAmount);

    const rewardBalance = await rewardPoolContract.balanceOf(others[0]);
    const totalSupply = await rewardPoolContract.totalSupply();
    const stakeTokenBalance = await stakeTokenContract.balanceOf(others[0]);

    expect(rewardBalance).to.be.equal(
      BigNumber.from(initialRewardBalance).add(stakeAmount)
    );
    expect(totalSupply).to.be.equal(
      BigNumber.from(initialTotalSupply).add(stakeAmount)
    );
    expect(stakeTokenBalance).to.be.equal(
      BigNumber.from(initialStakeTokenBalance).sub(stakeAmount)
    );
  });

  it('withdraw should update the reward balance, supply and staking token', async function () {
    const {
      rewardPoolContract,
      stakeTokenContract,
      others,
    } = await setupPolygonSandRewardPool();
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
    const {rewardPoolContract} = await setupPolygonSandRewardPool();

    const initialTotalSupply = await rewardPoolContract.totalSupply();
    const rewardPerToken = await rewardPoolContract.rewardPerToken();

    expect(initialTotalSupply).to.be.equal(0);
    expect(rewardPerToken).to.be.equal(0);
  });

  it('reward per token calculation', async function () {
    const {rewardPoolContract, others} = await setupPolygonSandRewardPool();
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
          .mul('1000000000000000000')
          .div(totalSupply)
      )
    );
  });

  it('earned calculation', async function () {
    const {rewardPoolContract, others} = await setupPolygonSandRewardPool();
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
    } = await setupPolygonSandRewardPool();
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
    } = await setupPolygonSandRewardPool();
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
});
