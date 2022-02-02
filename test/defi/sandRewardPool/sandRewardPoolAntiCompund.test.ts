import {expect} from '../../chai-setup';
import {setupSandRewardPoolTest} from './fixtures/sandRewardPool.fixture';
import {increaseTime} from '../../utils';
import {doOnNextBlock} from './utils';

describe('new SandRewardPool anti compound tests', function () {
  describe('roles', function () {
    it('admin should be able to call setAntiCompoundLockPeriod', async function () {
      const {contract, rewardCalculatorMock} = await setupSandRewardPoolTest();
      await contract.setRewardCalculator(rewardCalculatorMock.address, false);
      expect(await contract.antiCompound()).to.be.equal(0);
      await expect(contract.setAntiCompoundLockPeriod(10000)).not.to.be
        .reverted;
      expect(await contract.antiCompound()).to.be.equal(10000);
    });
    it('other should fail to call setAntiCompoundLockPeriod', async function () {
      const {
        getUser,
        contract,
        rewardCalculatorMock,
      } = await setupSandRewardPoolTest();
      await contract.setRewardCalculator(rewardCalculatorMock.address, false);
      const user = await getUser();
      await expect(
        user.pool.setAntiCompoundLockPeriod(1000)
      ).to.be.revertedWith('not admin');
    });
  });
  it('user can only get his rewards after lockTimeMS', async function () {
    const {
      contract,
      rewardCalculatorMock,
      balances,
      getUser,
    } = await setupSandRewardPoolTest();
    await contract.setRewardCalculator(rewardCalculatorMock.address, false);

    const lockTimeMS = 10 * 1000;
    await contract.setAntiCompoundLockPeriod(lockTimeMS);

    const user = await getUser();

    const initialBalance = await balances(user.address);

    await rewardCalculatorMock.setReward(30);
    await user.pool.stake(1000);
    expect(await contract.earned(user.address)).to.be.equal(30);

    await expect(user.pool.getReward()).to.revertedWith('must wait');
    await increaseTime(lockTimeMS);
    await doOnNextBlock(async () => {
      await user.pool.getReward();
    });

    const deltas = await balances(user.address, initialBalance);
    expect(deltas.stake).to.be.equal(-1000);
    expect(deltas.reward).to.be.equal(30);

    await rewardCalculatorMock.setReward(50);
    expect(await contract.earned(user.address)).to.be.equal(50);

    await expect(user.pool.getReward()).to.revertedWith('must wait');

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
    } = await setupSandRewardPoolTest();
    await contract.setRewardCalculator(rewardCalculatorMock.address, false);

    const lockTimeMS = 10 * 1000;
    await contract.setAntiCompoundLockPeriod(lockTimeMS);

    const user = await getUser();

    await rewardCalculatorMock.setReward(30);
    await user.pool.stake(1000);

    await expect(user.pool.getReward()).to.revertedWith('must wait');

    // Disable the check
    await contract.setAntiCompoundLockPeriod(0);

    await expect(user.pool.getReward()).not.to.be.reverted;
  });
});
