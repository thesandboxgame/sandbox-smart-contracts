/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/no-floating-promises */
import {expect} from '../../chai-setup';
import {ethers} from 'hardhat';
import {Contract} from 'ethers';
import {setupERC20RewardPoolTest, sum} from './fixtures/fixtures';
import {toWei} from '../../utils';
import {randomBigNumber} from '../sandRewardPool/utils';
import {sendMetaTx} from '../../sendMetaTx';
import {AddressZero} from '@ethersproject/constants';

describe('ERC20RewardPool main contract tests', function () {
  describe('roles', function () {
    function defaultAdminRoleTest(
      funcName: string,
      method: (contract: Contract, rewardToken: string) => Promise<void>
    ) {
      it('admin should be able to call ' + funcName, async function () {
        const {contract, rewardToken} = await setupERC20RewardPoolTest();
        await expect(method(contract, rewardToken.address)).not.to.be.reverted;
      });
      it('other should fail to call ' + funcName, async function () {
        const {
          rewardToken,
          contract,
          getUser,
        } = await setupERC20RewardPoolTest();
        const user = await getUser();
        const poolAsOther = contract.connect(
          await ethers.getSigner(user.address)
        );
        await expect(
          method(poolAsOther, rewardToken.address)
        ).to.be.revertedWith('Ownable: caller is not the owner');
        await expect(method(poolAsOther, AddressZero)).to.be.revertedWith(
          'RequirementsRules: is not a contract'
        );
      });
    }
    // eslint-disable-next-line mocha/no-setup-in-describe
    defaultAdminRoleTest('setContributionRules', (c, rewardToken) =>
      c.setContributionRules(rewardToken)
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
    it('admin should be able to call pause & unpause', async function () {
      const {contract, deployer} = await setupERC20RewardPoolTest();
      const admin = contract.connect(await ethers.getSigner(deployer));
      await expect(admin.pause()).not.to.be.reverted;
      await expect(admin.unpause()).not.to.be.reverted;
    });
    it('other should fail to call pause & unpause', async function () {
      const {contract, getUser, deployer} = await setupERC20RewardPoolTest();
      const user = await getUser();
      const admin = contract.connect(await ethers.getSigner(deployer));

      const poolAsOther = contract.connect(
        await ethers.getSigner(user.address)
      );
      await expect(poolAsOther.pause()).to.be.revertedWith(
        'Ownable: caller is not the owner'
      );

      await expect(admin.pause()).not.to.be.reverted;

      await expect(poolAsOther.unpause()).to.be.revertedWith(
        'Ownable: caller is not the owner'
      );
    });
    it('admin cant renounce ownership', async function () {
      const {contract, deployer} = await setupERC20RewardPoolTest();
      const admin = contract.connect(await ethers.getSigner(deployer));
      await expect(admin.renounceOwnership()).to.be.revertedWith(
        "ERC20RewardPool: can't renounceOwnership"
      );
    });

    it('recoverFunds should fail if contract is not paused', async function () {
      const {
        contract,
        rewardToken,
        totalRewardMinted,
        getUser,
      } = await setupERC20RewardPoolTest();
      const user = await getUser();
      expect(await rewardToken.balanceOf(contract.address)).to.be.equal(
        totalRewardMinted
      );
      await expect(contract.recoverFunds(user.address)).to.be.revertedWith(
        'Pausable: not paused'
      );
    });
    it('admin should be able to call recoverFunds if contract is paused', async function () {
      const {
        contract,
        rewardToken,
        totalRewardMinted,
        getUser,
      } = await setupERC20RewardPoolTest();
      const user = await getUser();
      await contract.pause();
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
      const {getUser} = await setupERC20RewardPoolTest();
      const user = await getUser();
      await expect(user.pool.recoverFunds(user.address)).to.be.revertedWith(
        'caller is not the owner'
      );
    });
    it('recoverFunds must fail with address zero', async function () {
      const {contract} = await setupERC20RewardPoolTest();
      await contract.pause();
      await expect(contract.recoverFunds(AddressZero)).to.be.revertedWith(
        'ERC20RewardPool: zero address'
      );
    });
    it('contract should have enough funds to replace the stakeToken', async function () {
      const {
        contract,
        replaceToken,
        rewardToken,
        getUser,
      } = await setupERC20RewardPoolTest();

      await contract.setMaxStakeOverall(999999999);

      const user = await getUser();

      await user.pool.stake(1000);

      await expect(
        contract.setStakeToken(replaceToken.address)
      ).to.be.revertedWith('ERC20RewardPool: insufficient balance');

      await expect(contract.setStakeToken(rewardToken.address)).not.to.be
        .reverted;
    });
    it('contract should have enough funds to replace the rewardToken', async function () {
      const {contract, stakeToken} = await setupERC20RewardPoolTest();

      await expect(
        contract.setRewardToken(stakeToken.address)
      ).to.be.revertedWith('ERC20RewardPool: insufficient balance');

      await stakeToken.mint(contract.address, '10000000000000000000000');

      await expect(contract.setRewardToken(stakeToken.address)).not.to.be
        .reverted;
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
          rewardCalculatorMock,
        } = await setupERC20RewardPoolTest();
        await contract.setRewardCalculator(rewardCalculatorMock.address, false);

        await contract.setMaxStakeOverall(999999999);

        const user = await getUser();

        const initialBalance = await balances(user.address);

        await setRewardAndStake(30, user.pool, 1000);
        expect(await contract.earned(user.address)).to.be.equal(30);

        await setRewardAndStake(50, user.pool, 1000);
        expect(await contract.earned(user.address)).to.be.equal(80);

        await setRewardAndStake(70, user.pool, 1000);
        expect(await contract.earned(user.address)).to.be.equal(150);

        await setRewardAndStake(20, user.pool, 1000);
        // Rounding.... earned = 140
        expect(await contract.earned(user.address)).to.be.equal(169);

        await user.pool.exit();
        expect(await contract.earned(user.address)).to.be.equal(0);
        const deltas = await balances(user.address, initialBalance);
        expect(deltas.stake).to.be.equal(0);
        expect(deltas.reward).to.be.equal(169);
      });
      it('stake before rewards', async function () {
        const {
          contract,
          setRewardAndStake,
          balances,
          getUser,
          rewardCalculatorMock,
        } = await setupERC20RewardPoolTest();
        await contract.setRewardCalculator(rewardCalculatorMock.address, false);

        await contract.setMaxStakeOverall(999999999);

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
        // Rounding.... earned = 150
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
          rewardCalculatorMock,
        } = await setupERC20RewardPoolTest();
        await contract.setRewardCalculator(rewardCalculatorMock.address, false);

        await contract.setMaxStakeOverall(999999999);

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
      it('stake->withdraw so total contribution == 0, stake again with some rewards', async function () {
        const {
          contract,
          setRewardAndStake,
          balances,
          getUser,
          rewardCalculatorMock,
        } = await setupERC20RewardPoolTest();
        await contract.setRewardCalculator(rewardCalculatorMock.address, false);

        await contract.setMaxStakeOverall(999999999);

        const user = await getUser();

        const initialBalance = await balances(user.address);

        await setRewardAndStake(30, user.pool, 1000);
        expect(await contract.earned(user.address)).to.be.equal(30);

        await setRewardAndStake(50, user.pool, 1000);
        expect(await contract.earned(user.address)).to.be.equal(80);

        // We need the check totalContributions != 0 in the reward calculator so the initial user gets his rewards.
        await user.pool.exit();
        const deltas = await balances(user.address, initialBalance);
        expect(deltas.stake).to.be.equal(0);
        expect(deltas.reward).to.be.equal(80);

        await setRewardAndStake(50, user.pool, 1000);
        expect(await contract.earned(user.address)).to.be.equal(50);

        await setRewardAndStake(70, user.pool, 1000);
        expect(await contract.earned(user.address)).to.be.equal(120);

        await user.pool.exit();
        const deltas2 = await balances(user.address, initialBalance);
        expect(deltas2.stake).to.be.equal(0);
        expect(deltas2.reward).to.be.equal(200);
      });
    });
    describe('two users', function () {
      it('reward before stake', async function () {
        const {
          setRewardAndStake,
          getEarnings,
          getUsers,
          rewardCalculatorMock,
          contract,
        } = await setupERC20RewardPoolTest();
        await contract.setRewardCalculator(rewardCalculatorMock.address, false);

        await contract.setMaxStakeOverall(999999999);

        const users = await getUsers(2);
        const [user1, user2] = users;

        await setRewardAndStake(30, user1.pool, 1000);
        expect(await getEarnings(users)).to.eql([30, 0]);

        await setRewardAndStake(50, user2.pool, 1000);
        expect(await getEarnings(users)).to.eql([80, 0]);

        await setRewardAndStake(70, user1.pool, 1000);
        // [ 70 + 60 * (1000/2000), 70 * (1000/2000) ]
        expect(await getEarnings(users)).to.eql([115, 35]);
        expect(115 + 35).to.be.equal(30 + 50 + 70);

        await setRewardAndStake(21, user2.pool, 1000);
        // [ 85 + 21 * (2000/3000), 35 + 21 * (1000/3000) ]
        expect(await getEarnings(users)).to.eql([129, 42]);
        expect(129 + 42).to.be.equal(30 + 50 + 70 + 21);
      });
      it('user1 stake before rewards', async function () {
        const {
          setRewardAndStake,
          getUsers,
          getEarnings,
          rewardCalculatorMock,
          contract,
        } = await setupERC20RewardPoolTest();
        await contract.setRewardCalculator(rewardCalculatorMock.address, false);

        await contract.setMaxStakeOverall(999999999);

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
          rewardCalculatorMock,
          contract,
        } = await setupERC20RewardPoolTest();
        await contract.setRewardCalculator(rewardCalculatorMock.address, false);

        await contract.setMaxStakeOverall(999999999);

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
          rewardCalculatorMock,
          contract,
        } = await setupERC20RewardPoolTest();
        await contract.setRewardCalculator(rewardCalculatorMock.address, false);

        await contract.setMaxStakeOverall(999999999);

        const users = await getUsers(10);

        type Data = {
          rewardSum: number;
          stakes: number[];
          earnings: number[];
        };

        async function setRewardAndStakeUser(
          data: Data,
          reward: number,
          userIdx: number,
          stake: number
        ) {
          await setRewardAndStake(reward, users[userIdx].pool, stake);
          const totalStakes = sum(data.stakes).toNumber();
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

        let data = {
          rewardSum: 30,
          stakes: [1000, ...empty.slice(1)],
          earnings: [30, ...empty.slice(1)],
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
  describe('contribution calculation', function () {
    it('initial', async function () {
      const {
        getUsers,
        contributionRulesMock,
        contract,
      } = await setupERC20RewardPoolTest();
      await contract.setContributionRules(contributionRulesMock.address);
      const users = await getUsers(4);
      for (const u of users) {
        expect(await contract.contributionOf(u.address)).to.be.equal(0);
        await u.pool.stake(u.staked);
        expect(await contract.balanceOf(u.address)).to.be.equal(u.staked);
        expect(await contract.contributionOf(u.address)).to.be.equal(
          u.contributed
        );
      }
    });
    it('computeContribution after the user change his contribution', async function () {
      const {
        getUsers,
        contributionRulesMock,
        contract,
      } = await setupERC20RewardPoolTest();
      await contract.setContributionRules(contributionRulesMock.address);
      const users = await getUsers(6);
      // stake
      for (const u of users) {
        await u.pool.stake(u.staked);
        expect(await contract.contributionOf(u.address)).to.be.equal(
          u.contributed
        );
      }
      // Change user contribution after stake
      for (const u of users) {
        await contributionRulesMock.setContribution(
          u.address,
          u.contributed.div(2)
        );
      }
      // Still no changes in the contract
      for (const u of users) {
        expect(await contract.contributionOf(u.address)).to.be.equal(
          u.contributed
        );
      }
      // call computeContribution
      for (const u of users) {
        await expect(contract.computeContribution(u.address))
          .to.emit(contract, 'ContributionUpdated')
          .withArgs(u.address, u.contributed.div(2), u.contributed);
      }
      // Now the changes are reflected
      for (const u of users) {
        expect(await contract.contributionOf(u.address)).to.be.equal(
          u.contributed.div(2)
        );
      }
    });
    it('computeContributionInBatch after the user change his contribution', async function () {
      const {
        getUsers,
        contributionRulesMock,
        contract,
      } = await setupERC20RewardPoolTest();
      await contract.setContributionRules(contributionRulesMock.address);
      const users = await getUsers(6);
      // stake
      for (const u of users) {
        await u.pool.stake(u.staked);
        expect(await contract.contributionOf(u.address)).to.be.equal(
          u.contributed
        );
      }
      // Change user contribution after stake
      for (const u of users) {
        await contributionRulesMock.setContribution(
          u.address,
          u.contributed.div(2)
        );
      }
      // Still no changes in the contract
      for (const u of users) {
        expect(await contract.contributionOf(u.address)).to.be.equal(
          u.contributed
        );
      }
      // call computeContributionInBatch
      const emitPromise = expect(
        contract.computeContributionInBatch(users.map((u) => u.address))
      ).to.emit(contract, 'ContributionUpdated');
      users.forEach((u) =>
        emitPromise.withArgs(u.address, u.contributed.div(2), u.contributed)
      );
      await emitPromise;
      // Now the changes are reflected
      for (const u of users) {
        expect(await contract.contributionOf(u.address)).to.be.equal(
          u.contributed.div(2)
        );
      }
    });
  });
  describe('contribution calculation with rewards', function () {
    it('initial', async function () {
      const {
        getUsers,
        contributionRulesMock,
        rewardCalculatorMock,
        contract,
      } = await setupERC20RewardPoolTest();
      await contract.setRewardCalculator(rewardCalculatorMock.address, false);
      await contract.setContributionRules(contributionRulesMock.address);
      const users = await getUsers(8);
      for (const u of users) {
        expect(await contract.contributionOf(u.address)).to.be.equal(0);
        await u.pool.stake(u.staked);
        expect(await contract.balanceOf(u.address)).to.be.equal(u.staked);
        expect(await contract.contributionOf(u.address)).to.be.equal(
          u.contributed
        );
      }
      expect(await contract.totalContributions()).to.be.equal(
        sum(users.map((u) => u.contributed))
      );

      // Give a reward
      const reward = toWei(123);
      await rewardCalculatorMock.setReward(reward);
      await contract.restartRewards();

      // Check users contributions, balances and earned rewards
      for (const u of users) {
        expect(await contract.contributionOf(u.address)).to.be.equal(
          u.contributed
        );
        expect(await contract.balanceOf(u.address)).to.be.equal(u.staked);
        expect(await contract.earned(u.address)).to.be.equal(
          u.contributed.mul(reward).div(sum(users.map((u) => u.contributed)))
        );
      }
    });
    it('computeContribution after users change his contribution', async function () {
      const {
        getUsers,
        contributionRulesMock,
        rewardCalculatorMock,
        contract,
      } = await setupERC20RewardPoolTest();
      await contract.setRewardCalculator(rewardCalculatorMock.address, false);
      await contract.setContributionRules(contributionRulesMock.address);
      const users = await getUsers(6);
      // stake
      for (const u of users) {
        await u.pool.stake(u.staked);
        expect(await contract.contributionOf(u.address)).to.be.equal(
          u.contributed
        );
      }

      const usersWithNewContributions = users.map((u) => ({
        ...u,
        newContribution: randomBigNumber(1000000),
        oldContribution: u.contributed,
      }));

      // Change user contribution after stake
      for (const u of usersWithNewContributions) {
        await contributionRulesMock.setContribution(
          u.address,
          u.newContribution
        );
      }

      // Start a campaign without distributing the rewards
      const reward = toWei(123);
      await rewardCalculatorMock.setReward(reward);

      const usersWithReward = usersWithNewContributions.map((u) => ({
        ...u,
        reward: u.contributed
          .mul(reward)
          .div(sum(users.map((u) => u.contributed))),
      }));
      // Check users contributions, balances and earned rewards
      for (const u of usersWithReward) {
        // Still no changes in the contract
        expect(await contract.contributionOf(u.address)).to.be.equal(
          u.oldContribution
        );
        // User gets earnings with old contribution
        expect(await contract.earned(u.address)).to.be.equal(u.reward);
      }

      // refresh the contribution for each user, order matters but we assume we call quickly.
      const others = usersWithReward;
      const processed = [];
      for (let i = 0; ; i++) {
        const aUser = others.shift();
        if (!aUser) break;
        // call computeContribution for user 0 the others still have their old value
        await expect(contract.computeContribution(aUser.address))
          .to.emit(contract, 'ContributionUpdated')
          .withArgs(
            aUser.address,
            aUser.newContribution,
            aUser.oldContribution
          );

        // aUser gets the rewards according to the old contributions
        expect(await contract.earned(aUser.address)).to.be.closeTo(
          aUser.reward,
          i
        );
        expect(await contract.rewards(aUser.address)).to.be.closeTo(
          aUser.reward,
          i
        );
        // the contribution of the user is updated.
        expect(await contract.contributionOf(aUser.address)).to.be.equal(
          aUser.newContribution
        );

        // Add to the processed list.
        processed.push(aUser);

        // Give another reward
        await rewardCalculatorMock.setReward(reward);

        // others use the old contribution, processed use the new one.
        const totalContribution = sum(others.map((u) => u.oldContribution)).add(
          sum(processed.map((u) => u.newContribution))
        );
        // Update rewards.
        for (const u of processed) {
          u.reward = u.reward.add(
            u.newContribution.mul(reward).div(totalContribution)
          );
          expect(await contract.earned(u.address)).to.be.closeTo(u.reward, i);
        }
        for (const u of others) {
          // Still no changes in the contract
          expect(await contract.contributionOf(u.address)).to.be.equal(
            u.oldContribution
          );
          u.reward = u.reward.add(
            u.oldContribution.mul(reward).div(totalContribution)
          );
          expect(await contract.earned(u.address)).to.be.closeTo(
            u.reward,
            i + 1
          );
        }
      }
    });
    it('computeContributionInBatch after the user change his contribution', async function () {
      const {
        getUsers,
        contributionRulesMock,
        rewardCalculatorMock,
        contract,
      } = await setupERC20RewardPoolTest();
      await contract.setRewardCalculator(rewardCalculatorMock.address, false);
      await contract.setContributionRules(contributionRulesMock.address);
      const users = await getUsers(6);
      // stake
      for (const u of users) {
        await u.pool.stake(u.staked);
        expect(await contract.contributionOf(u.address)).to.be.equal(
          u.contributed
        );
      }

      const usersWithNewContributions = users.map((u) => ({
        ...u,
        newContribution: randomBigNumber(1000000),
        oldContribution: u.contributed,
      }));

      // Change user contribution after stake
      for (const u of usersWithNewContributions) {
        await contributionRulesMock.setContribution(
          u.address,
          u.newContribution
        );
      }

      // Start a campaign without distributing the rewards
      const reward = toWei(123);
      await rewardCalculatorMock.setReward(reward);

      const usersWithReward = usersWithNewContributions.map((u) => ({
        ...u,
        reward: u.contributed
          .mul(reward)
          .div(sum(users.map((u) => u.contributed))),
      }));
      // Check users contributions, balances and earned rewards
      for (const u of usersWithReward) {
        // Still no changes in the contract
        expect(await contract.contributionOf(u.address)).to.be.equal(
          u.oldContribution
        );
        // Users get the earnings calculated with the oldContribution
        expect(await contract.earned(u.address)).to.be.equal(u.reward);
      }

      // call computeContributionInBatch
      const emitPromise = expect(
        contract.computeContributionInBatch(
          usersWithReward.map((u) => u.address)
        )
      ).to.emit(contract, 'ContributionUpdated');
      usersWithReward.forEach((u) =>
        emitPromise.withArgs(u.address, u.newContribution, u.oldContribution)
      );
      await emitPromise;

      // Contributions where updated user got the earnings from old contribution
      for (const u of usersWithReward) {
        expect(await contract.contributionOf(u.address)).to.be.equal(
          u.newContribution
        );
        // Users get the earned amount calculated with the oldContribution
        expect(await contract.earned(u.address)).to.be.equal(
          u.oldContribution
            .mul(reward)
            .div(sum(usersWithReward.map((o) => o.oldContribution)))
        );
      }

      // Add another reward
      await rewardCalculatorMock.setReward(reward);
      // and distribute it
      await contract.restartRewards();

      // Now users get their rewards with the new contributions.
      for (const u of usersWithReward) {
        expect(await contract.contributionOf(u.address)).to.be.equal(
          u.newContribution
        );
        // Users get the earned amount calculated with the oldContribution
        expect(await contract.earned(u.address)).to.be.equal(
          u.reward.add(
            u.newContribution
              .mul(reward)
              .div(sum(usersWithReward.map((o) => o.newContribution)))
          )
        );
      }
    });
  });
  describe('trusted forwarder and meta-tx', function () {
    it('should fail to set the trusted forwarder if not admin', async function () {
      const {rewardToken, contractAsOther} = await setupERC20RewardPoolTest();

      expect(
        contractAsOther.setTrustedForwarder(rewardToken.address)
      ).to.be.revertedWith('Ownable: caller is not the owner');
    });
    it('should success to set the trusted forwarder if a valid contract and admin', async function () {
      const {getUser, contract, rewardToken} = await setupERC20RewardPoolTest();

      const user = await getUser();

      expect(contract.setTrustedForwarder(user.address)).to.be.revertedWith(
        'RequirementsRules: is not a contract'
      );

      expect(contract.setTrustedForwarder(rewardToken.address)).not.to.be
        .reverted;

      expect(await contract.getTrustedForwarder()).to.be.equal(
        rewardToken.address
      );
    });
    it('setReward with meta-tx', async function () {
      const {
        contract,
        getUser,
        trustedForwarder,
        rewardCalculatorMock,
      } = await setupERC20RewardPoolTest();
      await contract.setRewardCalculator(rewardCalculatorMock.address, false);

      const user = await getUser();

      const {
        to,
        data,
      } = await rewardCalculatorMock.populateTransaction.setReward(22);

      await sendMetaTx(to, trustedForwarder, data, user.address);

      const reward = await rewardCalculatorMock.getRewards();

      expect(reward).to.be.equal(22);
    });
    it('stake with meta-tx', async function () {
      const {
        contract,
        getUser,
        trustedForwarder,
        rewardCalculatorMock,
      } = await setupERC20RewardPoolTest();
      await contract.setRewardCalculator(rewardCalculatorMock.address, false);

      await contract.setMaxStakeOverall(999999999);

      const user = await getUser();

      const {to, data} = await contract.populateTransaction.stake(1000);

      // increasing the gas to avoid tx failing
      await sendMetaTx(to, trustedForwarder, data, user.address, '1000000000');

      expect(await user.pool.balanceOf(user.address)).to.be.equal(1000);
    });
    it('withdraw with meta-tx', async function () {
      const {
        contract,
        getUser,
        trustedForwarder,
        rewardCalculatorMock,
      } = await setupERC20RewardPoolTest();
      await contract.setRewardCalculator(rewardCalculatorMock.address, false);

      await contract.setMaxStakeOverall(999999999);

      const user = await getUser();

      user.pool.stake(1000);

      expect(await user.pool.balanceOf(user.address)).to.be.equal(1000);

      const {to, data} = await contract.populateTransaction.withdraw(1000);

      // increasing the gas to avoid tx failing
      await sendMetaTx(to, trustedForwarder, data, user.address, '1000000000');

      expect(await user.pool.balanceOf(user.address)).to.be.equal(0);
    });
  });
});
