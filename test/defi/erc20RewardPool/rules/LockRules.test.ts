import {expect} from '../../../chai-setup';
import {setupERC20RewardPoolTest} from '../fixtures/fixtures';
import {increaseTime, toWei} from '../../../utils';
import {doOnNextBlock} from '../../sandRewardPool/utils';

describe('ERC20RewardPool Lock Rules', function () {
  it('admin should be able to call setTimelockClaim', async function () {
    const {contract} = await setupERC20RewardPoolTest();
    expect(await contract.timeLockClaim()).to.be.equal(0);
    await expect(contract.setTimelockClaim(10000)).not.to.be.reverted;
    expect(await contract.timeLockClaim()).to.be.equal(10000);
  });
  it('other should fail to call setTimelockClaim', async function () {
    const {getUser} = await setupERC20RewardPoolTest();

    const user = await getUser();
    await expect(user.pool.setTimelockClaim(1000)).to.be.revertedWith(
      'Ownable: caller is not the owner'
    );
  });
  it('should fail to setTimelockClaim above the limit', async function () {
    const {contract} = await setupERC20RewardPoolTest();
    // 181 days
    await expect(contract.setTimelockClaim(15638400)).to.be.revertedWith(
      'LockRules: invalid lockPeriodInSecs'
    );
  });
  it('user can only get his rewards after lockTimeMS', async function () {
    const {
      contract,
      rewardCalculatorMock,
      balances,
      getUser,
    } = await setupERC20RewardPoolTest();
    await contract.setRewardCalculator(rewardCalculatorMock.address, false);

    const lockTimeMS = 10 * 1000;
    await contract.setTimelockClaim(lockTimeMS);

    await contract.setMaxStakeOverall(999999999);

    const user = await getUser();

    const initialBalance = await balances(user.address);

    await rewardCalculatorMock.setReward(30);
    await user.pool.stake(1000);
    expect(await contract.earned(user.address)).to.be.equal(30);

    await expect(user.pool.getReward()).to.revertedWith(
      'LockRules: Claim must wait'
    );
    await increaseTime(lockTimeMS);
    await doOnNextBlock(async () => {
      await user.pool.getReward();
    });

    const deltas = await balances(user.address, initialBalance);
    expect(deltas.stake).to.be.equal(-1000);
    expect(deltas.reward).to.be.equal(30);

    await rewardCalculatorMock.setReward(50);
    expect(await contract.earned(user.address)).to.be.equal(50);

    await expect(user.pool.getReward()).to.revertedWith(
      'LockRules: Claim must wait'
    );

    await increaseTime(lockTimeMS);
    expect(await contract.earned(user.address)).to.be.equal(50);
    await expect(user.pool.getReward()).not.to.be.reverted;

    const deltas2 = await balances(user.address, initialBalance);
    expect(deltas2.stake).to.be.equal(-1000);
    expect(deltas2.reward).to.be.equal(80);
  });
  it('we can disable lockTimeMS check by setting it to zero', async function () {
    const {
      contract,
      rewardCalculatorMock,
      getUser,
    } = await setupERC20RewardPoolTest();
    await contract.setRewardCalculator(rewardCalculatorMock.address, false);

    const lockTimeMS = 10 * 1000;
    await contract.setTimelockClaim(lockTimeMS);

    await contract.setMaxStakeOverall(999999999);

    const user = await getUser();

    await rewardCalculatorMock.setReward(30);
    await user.pool.stake(1000);

    await expect(user.pool.getReward()).to.revertedWith(
      'LockRules: Claim must wait'
    );

    // Disable the check
    await contract.setTimelockClaim(0);

    await expect(user.pool.getReward()).not.to.be.reverted;
  });
  it('admin should be able to call setTimelockDeposit', async function () {
    const {contract} = await setupERC20RewardPoolTest();
    expect(await contract.lockDeposit()).to.be.equal(0);
    await expect(contract.setTimelockDeposit(10000)).not.to.be.reverted;
    expect(await contract.lockDeposit()).to.be.equal(10000);
  });
  it('other should fail to call setTimelockDeposit', async function () {
    const {getUser} = await setupERC20RewardPoolTest();
    const user = await getUser();
    await expect(user.pool.setTimelockDeposit(1000)).to.be.revertedWith(
      'Ownable: caller is not the owner'
    );
  });
  it('should fail to setTimelockDeposit above the limit', async function () {
    const {contract} = await setupERC20RewardPoolTest();
    // 181 days
    await expect(contract.setTimelockDeposit(15638400)).to.be.revertedWith(
      'LockRules: invalid lockPeriodInSecs'
    );
  });
  it('user should wait to deposit(stake) again', async function () {
    const {contract, getUser} = await setupERC20RewardPoolTest();

    const lockTimeMS = 10 * 1000;
    await contract.setTimelockDeposit(lockTimeMS);

    await contract.setMaxStakeOverall(999999999);

    const user = await getUser();

    await user.pool.stake(1000);

    await expect(user.pool.stake(500)).to.revertedWith(
      'LockRules: Deposit must wait'
    );
  });
  it('admin should be able to call setTimeLockWithdraw', async function () {
    const {contract} = await setupERC20RewardPoolTest();
    expect(await contract.lockWithdraw()).to.be.equal(0);
    await expect(contract.setTimeLockWithdraw(10000)).not.to.be.reverted;
    expect(await contract.lockWithdraw()).to.be.equal(10000);
  });
  it('other should fail to call setTimeLockWithdraw', async function () {
    const {getUser} = await setupERC20RewardPoolTest();
    const user = await getUser();
    await expect(user.pool.setTimeLockWithdraw(1000)).to.be.revertedWith(
      'Ownable: caller is not the owner'
    );
  });
  it('should fail to setTimeLockWithdraw above the limit', async function () {
    const {contract} = await setupERC20RewardPoolTest();
    // 181 days
    await expect(contract.setTimeLockWithdraw(15638400)).to.be.revertedWith(
      'LockRules: invalid lockPeriodInSecs'
    );
  });
  it('user should wait to withdraw again and exit', async function () {
    const {
      contract,
      rewardCalculatorMock,
      getUser,
    } = await setupERC20RewardPoolTest();
    await contract.setRewardCalculator(rewardCalculatorMock.address, false);

    const lockTimeMS = 10 * 1000;
    await contract.setTimeLockWithdraw(lockTimeMS);

    await contract.setMaxStakeOverall(999999999);

    const user = await getUser();

    await rewardCalculatorMock.setReward(30);
    await user.pool.stake(1000);

    await user.pool.withdraw(500);

    await expect(user.pool.withdraw(500)).to.revertedWith(
      'LockRules: Withdraw must wait'
    );

    await expect(user.pool.exit()).to.revertedWith(
      'LockRules: Withdraw must wait'
    );
  });
  it('should fail to setAmountLockClaim above the limit', async function () {
    const {contract} = await setupERC20RewardPoolTest();

    await expect(
      contract.setAmountLockClaim(toWei(1001), true)
    ).to.be.revertedWith('LockRules: invalid newAmountLockClaim');
  });
  it('should be able to claim only amount allowed or if check is disabled', async function () {
    const {
      contract,
      rewardCalculatorMock,
      getUser,
    } = await setupERC20RewardPoolTest();
    await contract.setRewardCalculator(rewardCalculatorMock.address, false);

    await expect(contract.setAmountLockClaim(10, true)).not.to.be.reverted;

    await contract.setMaxStakeOverall(999999999);

    const user = await getUser();

    await rewardCalculatorMock.setReward(5);
    await user.pool.stake(1000);

    await expect(user.pool.getReward()).to.revertedWith(
      'ERC20RewardPool: Cannot withdraw - lockClaim.amount < reward'
    );

    // Disable the check
    await expect(contract.setAmountLockClaim(10, false)).not.to.be.reverted;

    await expect(user.pool.getReward()).not.to.be.reverted;
  });
});
