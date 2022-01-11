import {expect} from '../../chai-setup';
import {ethers} from 'hardhat';
import {Contract} from 'ethers';
import {setupSandRewardPoolTest} from './sandRewardPool.fixture';

function defaultAdminRoleTest(
  funcName: string,
  method: (contract: Contract, rewardToken: string) => Promise<void>
) {
  it('admin should be able to call ' + funcName, async function () {
    const {contract, rewardToken} = await setupSandRewardPoolTest();
    await expect(method(contract, rewardToken.address)).not.to.be.reverted;
  });
  it('other should fail to call ' + funcName, async function () {
    const {rewardToken, contract, getUser} = await setupSandRewardPoolTest();
    const user = await getUser();
    const poolAsOther = await contract.connect(
      await ethers.getSigner(user.address)
    );
    await expect(method(poolAsOther, rewardToken.address)).to.be.revertedWith(
      'not admin'
    );
  });
}

describe('new SandRewardPool main contract tests', function () {
  describe('roles', function () {
    // eslint-disable-next-line mocha/no-setup-in-describe
    defaultAdminRoleTest('setContributionCalculator', (c, rewardToken) =>
      c.setContributionCalculator(rewardToken)
    );
    // eslint-disable-next-line mocha/no-setup-in-describe
    defaultAdminRoleTest('setRewardToken', (c, rewardToken) =>
      c.setRewardToken(rewardToken)
    );
    // eslint-disable-next-line mocha/no-setup-in-describe
    defaultAdminRoleTest('setStakeToken', (c, rewardToken) =>
      c.setStakeToken(rewardToken)
    );
    // eslint-disable-next-line mocha/no-setup-in-describe
    defaultAdminRoleTest('setRewardCalculator', (c, rewardToken) =>
      c.setRewardCalculator(rewardToken, false)
    );
    it('admin should be able to call recoverFunds', async function () {
      const {
        contract,
        rewardToken,
        totalRewardMinted,
        getUser,
      } = await setupSandRewardPoolTest();
      const user = await getUser();
      expect(await rewardToken.balanceOf(contract.address)).to.be.equal(
        totalRewardMinted
      );
      expect(await rewardToken.balanceOf(user.address)).to.be.equal(0);
      await expect(contract.recoverFunds(user.address)).not.to.be.reverted;
      expect(await rewardToken.balanceOf(contract.address)).to.be.equal(0);
      expect(await rewardToken.balanceOf(user.address)).to.be.equal(
        totalRewardMinted
      );
    });
    it('other should fail to call recoverFunds', async function () {
      const {getUser} = await setupSandRewardPoolTest();
      const user = await getUser();
      await expect(user.pool.recoverFunds(user.address)).to.be.revertedWith(
        'not admin'
      );
    });
  });
  describe('reward distribution', function () {
    describe('only one user', function () {
      it('reward before stake', async function () {
        const {
          contract,
          setRewardAndStake,
          balances,
          getUser,
        } = await setupSandRewardPoolTest();
        const user = await getUser();

        const initialBalance = await balances(user.address);

        // TODO: initial 30 goes ???
        await setRewardAndStake(30, user.pool, 1000);
        expect(await contract.earned(user.address)).to.be.equal(30);

        await setRewardAndStake(50, user.pool, 1000);
        expect(await contract.earned(user.address)).to.be.equal(50);

        await setRewardAndStake(70, user.pool, 1000);
        expect(await contract.earned(user.address)).to.be.equal(120);

        await setRewardAndStake(20, user.pool, 1000);
        // TODO: Rounding.... earned = 140
        expect(await contract.earned(user.address)).to.be.equal(139);

        await user.pool.exit();
        expect(await contract.earned(user.address)).to.be.equal(0);
        const deltas = await balances(user.address, initialBalance);
        expect(deltas.stake).to.be.equal(0);
        expect(deltas.reward).to.be.equal(139);
      });
      it('stake before rewards', async function () {
        const {
          contract,
          setRewardAndStake,
          balances,
          getUser,
        } = await setupSandRewardPoolTest();
        const user = await getUser();

        const initialBalance = await balances(user.address);

        await user.pool.stake(1000);
        expect(await contract.earned(user.address)).to.be.equal(0);

        const rewards = [30, 50, 70];
        let earned = 0;
        for (const r of rewards) {
          expect(await contract.earned(user.address)).to.be.equal(earned);
          await setRewardAndStake(r, user.pool, 1000);
          earned += r;
        }
        // TODO: Rounding.... earned = 150
        expect(await contract.earned(user.address)).to.be.equal(149);

        await user.pool.exit();
        expect(await contract.earned(user.address)).to.be.equal(0);
        const deltas = await balances(user.address, initialBalance);
        expect(deltas.stake).to.be.equal(0);
        expect(deltas.reward).to.be.equal(149);
      });
      it('stake->withdraw so total contribution == 0, stake again', async function () {
        const {
          contract,
          setRewardAndStake,
          balances,
          getUser,
        } = await setupSandRewardPoolTest();
        const user = await getUser();

        const initialBalance = await balances(user.address);

        await setRewardAndStake(30, user.pool, 1000);
        expect(await contract.earned(user.address)).to.be.equal(30);

        // We need the check totalContributions != 0 in the reward calculator so the initial user gets his rewards.
        await user.pool.exit();
        const deltas = await balances(user.address, initialBalance);
        expect(deltas.stake).to.be.equal(0);
        expect(deltas.reward).to.be.equal(30);

        await setRewardAndStake(50, user.pool, 1000);
        expect(await contract.earned(user.address)).to.be.equal(50);

        await user.pool.exit();
        const deltas2 = await balances(user.address, initialBalance);
        expect(deltas2.stake).to.be.equal(0);
        expect(deltas2.reward).to.be.equal(80);
      });
    });
    describe('two users', function () {
      it('reward before stake', async function () {
        const {
          setRewardAndStake,
          getEarnings,
          getUsers,
        } = await setupSandRewardPoolTest();
        const users = await getUsers(2);
        const [user1, user2] = users;

        await setRewardAndStake(30, user1.pool, 1000);
        expect(await getEarnings(users)).to.eql([30, 0]);

        // TODO: initial 30 goes ???
        await setRewardAndStake(50, user2.pool, 1000);
        expect(await getEarnings(users)).to.eql([50, 0]);

        await setRewardAndStake(70, user1.pool, 1000);
        // [ 70 + 60 * (1000/2000), 70 * (1000/2000) ]
        expect(await getEarnings(users)).to.eql([85, 35]);
        expect(85 + 35).to.be.equal(50 + 70);

        await setRewardAndStake(21, user2.pool, 1000);
        // [ 85 + 21 * (2000/3000), 35 + 21 * (1000/3000) ]
        expect(await getEarnings(users)).to.eql([99, 42]);
        expect(99 + 42).to.be.equal(50 + 70 + 21);
      });
      it('user1 stake before rewards', async function () {
        const {
          setRewardAndStake,
          getUsers,
          getEarnings,
        } = await setupSandRewardPoolTest();
        const users = await getUsers(2);
        const user1 = users[0];
        const user2 = users[1];

        await user1.pool.stake(1000);
        expect(await getEarnings(users)).to.eql([0, 0]);

        await setRewardAndStake(30, user1.pool, 1000);
        expect(await getEarnings(users)).to.eql([30, 0]);

        await setRewardAndStake(50, user2.pool, 1000);
        expect(await getEarnings(users)).to.eql([80, 0]);
        expect(80).to.be.equal(30 + 50);

        await setRewardAndStake(60, user1.pool, 1000);
        // [ 80 + 60 * (2000/3000), 60 * (1000/3000) ]
        expect(await getEarnings(users)).to.eql([120, 20]);
        expect(120 + 20).to.be.equal(30 + 50 + 60);

        await setRewardAndStake(20, user2.pool, 1000);
        // [ 120 + 20 * (3000/4000), 20 + 20 * (1000/4000) ]
        expect(await getEarnings(users)).to.eql([135, 25]);
        expect(135 + 25).to.be.equal(30 + 50 + 60 + 20);
      });
      it('user2 stake before rewards', async function () {
        const {
          setRewardAndStake,
          getUsers,
          getEarnings,
        } = await setupSandRewardPoolTest();
        const users = await getUsers(2);
        const user1 = users[0];
        const user2 = users[1];

        await user2.pool.stake(1000);
        expect(await getEarnings(users)).to.eql([0, 0]);

        await setRewardAndStake(30, user1.pool, 1000);
        expect(await getEarnings(users)).to.eql([0, 30]);

        await setRewardAndStake(50, user2.pool, 1000);
        // [ 50 * (1000/2000), 30 + 50 * (1000/2000) ]
        expect(await getEarnings(users)).to.eql([25, 55]);
        expect(25 + 55).to.be.equal(30 + 50);

        await setRewardAndStake(60, user1.pool, 1000);
        // [ 25 + 60 * (1000/3000), 55 + 60 * (2000/3000) ]
        expect(await getEarnings(users)).to.eql([45, 95]);
        expect(45 + 95).to.be.equal(30 + 50 + 60);

        await setRewardAndStake(20, user2.pool, 1000);
        // [ 45 + 20 * (2000/4000), 95 + 20 * (2000/4000) ]
        expect(await getEarnings(users)).to.eql([55, 105]);
        expect(55 + 105).to.be.equal(30 + 50 + 60 + 20);
      });
    });
    describe('10 users', function () {
      it('reward before stake', async function () {
        const {
          setRewardAndStake,
          getEarnings,
          getUsers,
        } = await setupSandRewardPoolTest();
        const users = await getUsers(10);

        type Data = {
          rewardSum: number;
          stakes: number[];
          earnings: number[];
        };

        const sum = (arr: number[]) => arr.reduce((acc, val) => acc + val, 0);

        async function setRewardAndStakeUser(
          data: Data,
          reward: number,
          userIdx: number,
          stake: number
        ) {
          await setRewardAndStake(reward, users[userIdx].pool, stake);
          const totalStakes = sum(data.stakes);
          const ret = {
            ...data,
            stakes: [...data.stakes],
            earnings: data.earnings.map((x, i) =>
              totalStakes == 0
                ? 0
                : Math.floor(x + (reward * data.stakes[i]) / totalStakes)
            ),
          };
          ret.rewardSum = data.rewardSum + reward;
          ret.stakes[userIdx] += stake;
          return ret;
        }

        const empty = users.map(() => 0);
        await setRewardAndStake(30, users[0].pool, 1000);
        expect(await getEarnings(users)).to.eql([30, ...empty.slice(1)]);

        // TODO: initial 30 goes ???
        let data = {
          rewardSum: 0,
          stakes: [1000, ...empty.slice(1)],
          earnings: empty,
        };
        const userAndReward = [
          [50, 1],
          [70, 2],
          [90, 0],
          [110, 2],
          [30, 1],
          [40, 2],
          [40, 2],
        ];
        for (const uar of userAndReward) {
          data = await setRewardAndStakeUser(data, uar[0], uar[1], 1000);
          expect(await getEarnings(users)).to.eql(data.earnings);
          expect(sum(data.earnings)).to.be.closeTo(data.rewardSum, 3);
        }
      });
    });
  });
});
