import {expect} from '../../../chai-setup';
import {getTime} from '../../../utils';
import {BigNumber, Contract} from 'ethers';
import {doOnNextBlock, setBlockTime} from '../utils';
import {twoPeriodsSetup} from '../fixtures/rewardCalculator.fixture';

describe('TwoPeriodsRewardCalculator', function () {
  describe('roles', function () {
    it('reward pool should be able to call restartRewards', async function () {
      const {contractAsRewardPool} = await twoPeriodsSetup();
      await expect(contractAsRewardPool.restartRewards()).not.to.be.reverted;
    });
    it('others should fail to call restartRewards', async function () {
      const {
        contract,
        contractAsAdmin,
        contractAsRewardDistribution,
      } = await twoPeriodsSetup();

      await expect(contract.restartRewards()).to.be.revertedWith(
        'not reward pool'
      );
      await expect(contractAsAdmin.restartRewards()).to.be.revertedWith(
        'not reward pool'
      );
      await expect(
        contractAsRewardDistribution.restartRewards()
      ).to.be.revertedWith('not reward pool');
    });

    function rewardDistributionRoleCheck(
      method: (contract: Contract) => Promise<void>
    ) {
      it(
        'reward distribution should be able to call ' + method,
        async function () {
          const {contractAsRewardDistribution} = await twoPeriodsSetup();
          await expect(method(contractAsRewardDistribution)).not.to.be.reverted;
        }
      );
      it('other should fail to call ' + method, async function () {
        const {
          contract,
          contractAsAdmin,
          contractAsRewardPool,
        } = await twoPeriodsSetup();

        await expect(method(contract)).to.be.revertedWith(
          'not reward distribution'
        );
        await expect(method(contractAsAdmin)).to.be.revertedWith(
          'not reward distribution'
        );
        await expect(method(contractAsRewardPool)).to.be.revertedWith(
          'not reward distribution'
        );
      });
    }

    // eslint-disable-next-line mocha/no-setup-in-describe
    rewardDistributionRoleCheck((c) => c.runCampaign(12345678, 9876));
    // eslint-disable-next-line mocha/no-setup-in-describe
    rewardDistributionRoleCheck((c) => c.setInitialCampaign(12345678, 9876));
    // eslint-disable-next-line mocha/no-setup-in-describe
    rewardDistributionRoleCheck(async (c) => {
      await c.setInitialCampaign(123, 1234);
      return c.updateNextCampaign(12345678, 9876);
    });
  });

  it('startup', async function () {
    const {contract, contractAsRewardPool} = await twoPeriodsSetup();
    expect(await contract.getRewards()).to.be.equal(0);
    expect(await contract.finish1()).to.be.equal(0);
    expect(await contract.rate1()).to.be.equal(0);
    expect(await contract.finish2()).to.be.equal(0);
    expect(await contract.rate2()).to.be.equal(0);
    await contractAsRewardPool.restartRewards();
    expect(await contractAsRewardPool.getRewards()).to.be.equal(0);
    await contractAsRewardPool.restartRewards();
    expect(await contractAsRewardPool.getRewards()).to.be.equal(0);
  });

  describe('setup restrictions', function () {
    it('should fail to set initial campaign if campaign is running', async function () {
      const {contract, contractAsRewardDistribution} = await twoPeriodsSetup();
      expect(await contract.isCampaignFinished()).to.be.true;
      expect(await contract.isCampaignRunning()).to.be.false;
      await contractAsRewardDistribution.setInitialCampaign(123, 1234);
      await expect(
        contractAsRewardDistribution.setInitialCampaign(123, 1234)
      ).to.revertedWith('initial campaign running');
    });
    it('should fail to set next campaign if no campaign is running', async function () {
      const {contract, contractAsRewardDistribution} = await twoPeriodsSetup();
      expect(await contract.isCampaignFinished()).to.be.true;
      expect(await contract.isCampaignRunning()).to.be.false;
      await expect(
        contractAsRewardDistribution.updateNextCampaign(123, 1234)
      ).to.revertedWith('initial campaign not running');
    });
    it('should fail to update current campaign if no campaign is running', async function () {
      const {contract, contractAsRewardDistribution} = await twoPeriodsSetup();
      expect(await contract.isCampaignFinished()).to.be.true;
      expect(await contract.isCampaignRunning()).to.be.false;
      await expect(
        contractAsRewardDistribution.updateCurrentCampaign(123, 1234)
      ).to.revertedWith('initial campaign not running');
    });
    it('run campaign always works', async function () {
      const {contract, contractAsRewardDistribution} = await twoPeriodsSetup();
      expect(await contract.isCampaignRunning()).to.be.false;
      const duration1 = 123;
      const rate1 = 14;
      const reward1 = duration1 * rate1;
      const duration2 = 456;
      const rate2 = 53;
      const reward2 = duration2 * rate2;
      const duration3 = 789;
      const rate3 = 11;
      const reward3 = duration3 * rate3;

      // Set initial campaign
      const startTime = await doOnNextBlock(async () => {
        await contractAsRewardDistribution.runCampaign(reward1, duration1);
      });
      expect(await contract.isCampaignRunning()).to.be.true;
      expect(await contract.finish1()).to.be.equal(startTime + duration1);
      expect(await contract.rate1()).to.be.equal(rate1);
      expect(await contract.finish2()).to.be.equal(startTime + duration1);
      expect(await contract.rate2()).to.be.equal(0);

      // Set next campaign
      await contractAsRewardDistribution.runCampaign(reward2, duration2);
      expect(await contract.finish1()).to.be.equal(startTime + duration1);
      expect(await contract.rate1()).to.be.equal(rate1);
      expect(await contract.finish2()).to.be.equal(
        startTime + duration1 + duration2
      );
      expect(await contract.rate2()).to.be.equal(rate2);

      // Update next campaign
      await contractAsRewardDistribution.runCampaign(reward3, duration3);
      expect(await contract.finish1()).to.be.equal(startTime + duration1);
      expect(await contract.rate1()).to.be.equal(rate1);
      expect(await contract.finish2()).to.be.equal(
        startTime + duration1 + duration3
      );
      expect(await contract.rate2()).to.be.equal(rate3);
    });
  });
  describe('reward distribution', function () {
    async function checkRewards(
      contract: Contract,
      startTime: number,
      durationInSeconds: number,
      rewards: BigNumber,
      baseRewards = BigNumber.from(0)
    ): Promise<number> {
      // durationInSeconds must be divisible by steps.
      const steps = 10;
      const rate = rewards.div(durationInSeconds);
      for (let i = 1; i <= steps; i++) {
        const currentStep = (i * durationInSeconds) / steps;
        await setBlockTime(startTime + currentStep);
        expect(await contract.getRewards()).to.be.equal(
          rate.mul(currentStep).add(baseRewards)
        );
      }
      return getTime();
    }

    it('run an initial campaign alone', async function () {
      const {contract, contractAsRewardDistribution} = await twoPeriodsSetup();
      const durationInSeconds = 28 * 24 * 60 * 60;
      const rewards = BigNumber.from(durationInSeconds * 10000);
      const startTime = await doOnNextBlock(async () => {
        await contractAsRewardDistribution.setInitialCampaign(
          rewards,
          durationInSeconds
        );
      });
      const endTime = await checkRewards(
        contract,
        startTime,
        durationInSeconds,
        rewards
      );
      await setBlockTime(endTime + 10);
      expect(await contract.getRewards()).to.be.equal(rewards);
      expect(await contract.isCampaignRunning()).to.be.false;
    });
    it('run initial and next campaign', async function () {
      const {contract, contractAsRewardDistribution} = await twoPeriodsSetup();
      const duration1 = 28 * 24 * 60 * 60;
      const rate1 = 123;
      // Must be divisible by duration1 !!!
      const rewards1 = BigNumber.from(duration1 * rate1);
      const duration2 = 28 * 24 * 60;
      const rate2 = 456;
      // Must be divisible by duration2 !!!
      const rewards2 = BigNumber.from(duration2 * rate2);

      const startTime = await doOnNextBlock(async () => {
        await contractAsRewardDistribution.setInitialCampaign(
          rewards1,
          duration1
        );
      });
      await contractAsRewardDistribution.updateNextCampaign(
        rewards2,
        duration2
      );
      const endTime1 = await checkRewards(
        contract,
        startTime,
        duration1,
        rewards1
      );
      const endTime2 = await checkRewards(
        contract,
        endTime1,
        duration2,
        rewards2,
        rewards1
      );
      await setBlockTime(endTime2 + 10);
      expect(await contract.getRewards()).to.be.equal(rewards1.add(rewards2));
      expect(await contract.isCampaignRunning()).to.be.false;
    });
    it('run next campaign after the initial one finished', async function () {
      const {contractAsRewardDistribution: contract} = await twoPeriodsSetup();
      const duration1 = 28 * 24 * 60 * 60;
      const rate1 = 123;
      // Must be divisible by duration1 !!!
      const rewards1 = BigNumber.from(duration1 * rate1);
      const duration2 = 28 * 24 * 60;
      const rate2 = 456;
      // Must be divisible by duration2 !!!
      const rewards2 = BigNumber.from(duration2 * rate2);
      const duration3 = 789 * 60;
      const rate3 = 11;
      const rewards3 = BigNumber.from(duration3 * rate3);

      const startTime = await doOnNextBlock(async () => {
        await contract.setInitialCampaign(rewards1, duration1);
      });
      await contract.updateNextCampaign(rewards2, duration2);
      const endTime1 = await checkRewards(
        contract,
        startTime,
        duration1,
        rewards1
      );
      // I can call updateNextCampaign as many times as I want, only the last one will be taking into account
      await doOnNextBlock(async () => {
        await contract.updateNextCampaign(rewards1, duration1);
      }, endTime1 + 10);
      await doOnNextBlock(async () => {
        await contract.updateNextCampaign(rewards2, duration2);
      }, endTime1 + 20);
      await doOnNextBlock(async () => {
        await contract.updateNextCampaign(rewards3, duration3);
      }, endTime1 + 30);
      const endTime2 = await checkRewards(
        contract,
        endTime1,
        duration2,
        rewards2,
        rewards1
      );
      const endTime3 = await checkRewards(
        contract,
        endTime2,
        duration3,
        rewards3,
        rewards1.add(rewards2)
      );
      await setBlockTime(endTime3 + 10);
      expect(await contract.getRewards()).to.be.equal(
        rewards1.add(rewards2).add(rewards3)
      );
      expect(await contract.isCampaignRunning()).to.be.false;
    });
  });

  describe('restart reward', function () {
    it('before everything', async function () {
      const {
        contract,
        contractAsRewardDistribution,
        contractAsRewardPool,
      } = await twoPeriodsSetup();
      const duration1 = 28 * 24 * 60 * 60;
      const rate1 = 123;
      // Must be divisible by duration1 !!!
      const rewards1 = BigNumber.from(duration1 * rate1);
      const duration2 = 28 * 24 * 60;
      const rate2 = 456;
      // Must be divisible by duration2 !!!
      const rewards2 = BigNumber.from(duration2 * rate2);

      expect(await contract.getRewards()).to.be.equal(0);
      await contractAsRewardPool.restartRewards();
      expect(await contract.getRewards()).to.be.equal(0);

      const startTime = await doOnNextBlock(async () => {
        await contractAsRewardDistribution.setInitialCampaign(
          rewards1,
          duration1
        );
        await contractAsRewardDistribution.updateNextCampaign(
          rewards2,
          duration2
        );
      });

      await setBlockTime(startTime + duration1 + duration2 + 10);
      expect(await contract.getRewards()).to.be.equal(rewards1.add(rewards2));
      expect(await contract.isCampaignRunning()).to.be.false;
    });

    it('in middle of the first campaign', async function () {
      const {
        contract,
        contractAsRewardDistribution,
        contractAsRewardPool,
      } = await twoPeriodsSetup();
      const duration1 = 28 * 24 * 60 * 60;
      const rate1 = 123;
      // Must be divisible by duration1 !!!
      const rewards1 = BigNumber.from(duration1 * rate1);
      const duration2 = 28 * 24 * 60;
      const delta1 = duration1 / 3;
      const rate2 = 456;
      // Must be divisible by duration2 !!!
      const rewards2 = BigNumber.from(duration2 * rate2);

      const startTime = await doOnNextBlock(async () => {
        await contractAsRewardDistribution.setInitialCampaign(
          rewards1,
          duration1
        );
        await contractAsRewardDistribution.updateNextCampaign(
          rewards2,
          duration2
        );
      });

      await doOnNextBlock(async () => {
        await contractAsRewardPool.restartRewards();
      }, startTime + delta1);
      await setBlockTime(startTime + duration1 + duration2 + 10);
      expect(await contract.getRewards()).to.be.equal(
        rewards2.add(rate1 * (duration1 - delta1))
      );
      expect(await contract.isCampaignRunning()).to.be.false;
    });

    it('in middle of the second campaign', async function () {
      const {
        contract,
        contractAsRewardDistribution,
        contractAsRewardPool,
      } = await twoPeriodsSetup();
      const duration1 = 28 * 24 * 60 * 60;
      const rate1 = 123;
      // Must be divisible by duration1 !!!
      const rewards1 = BigNumber.from(duration1 * rate1);
      const duration2 = 28 * 24 * 60;
      const delta2 = duration2 / 3;
      const rate2 = 456;
      // Must be divisible by duration2 !!!
      const rewards2 = BigNumber.from(duration2 * rate2);

      const startTime = await doOnNextBlock(async () => {
        await contractAsRewardDistribution.setInitialCampaign(
          rewards1,
          duration1
        );
      });
      await contractAsRewardDistribution.updateNextCampaign(
        rewards2,
        duration2
      );
      await doOnNextBlock(async () => {
        await contractAsRewardPool.restartRewards();
      }, startTime + duration1 + delta2);
      await setBlockTime(startTime + duration1 + duration2 + 10);
      expect(await contract.getRewards()).to.be.equal(
        rate2 * (duration2 - delta2)
      );
      expect(await contract.isCampaignRunning()).to.be.false;
    });

    it('after everything', async function () {
      const {
        contract,
        contractAsRewardDistribution,
        contractAsRewardPool,
      } = await twoPeriodsSetup();
      const duration1 = 28 * 24 * 60 * 60;
      const rate1 = 123;
      // Must be divisible by duration1 !!!
      const rewards1 = BigNumber.from(duration1 * rate1);
      const duration2 = 28 * 24 * 60;
      const rate2 = 456;
      // Must be divisible by duration2 !!!
      const rewards2 = BigNumber.from(duration2 * rate2);

      const startTime = await doOnNextBlock(async () => {
        await contractAsRewardDistribution.setInitialCampaign(
          rewards1,
          duration1
        );
      });
      await contractAsRewardDistribution.updateNextCampaign(
        rewards2,
        duration2
      );

      await setBlockTime(startTime + duration1 + duration2 + 1000);

      expect(await contract.getRewards()).to.be.equal(rewards1.add(rewards2));
      await contractAsRewardPool.restartRewards();
      expect(await contract.getRewards()).to.be.equal(0);
      expect(await contract.isCampaignRunning()).to.be.false;
    });
    it('intermixed', async function () {
      const {
        contract,
        contractAsRewardDistribution,
        contractAsRewardPool,
      } = await twoPeriodsSetup();
      const duration1 = 28 * 24 * 60 * 60;
      const delta1 = duration1 / 3;
      const rate1 = 123;
      // Must be divisible by duration1 !!!
      const rewards1 = BigNumber.from(duration1 * rate1);
      const duration2 = 28 * 24 * 60;
      const delta2 = duration2 / 3;
      const rate2 = 456;
      // Must be divisible by duration2 !!!
      const rewards2 = BigNumber.from(duration2 * rate2);

      const startTime = await doOnNextBlock(async () => {
        await contractAsRewardDistribution.setInitialCampaign(
          rewards1,
          duration1
        );
        await contractAsRewardDistribution.updateNextCampaign(
          rewards2,
          duration2
        );
      });

      await setBlockTime(startTime + delta1);
      expect(await contract.getRewards()).to.be.equal(delta1 * rate1);

      await doOnNextBlock(async () => {
        await contractAsRewardPool.restartRewards();
        expect(await contract.getRewards()).to.be.equal(0);
      }, startTime + 2 * delta1);

      await setBlockTime(startTime + duration1);
      expect(await contract.getRewards()).to.be.equal(delta1 * rate1);

      await setBlockTime(startTime + duration1 + delta2);
      expect(await contract.getRewards()).to.be.equal(
        delta1 * rate1 + delta2 * rate2
      );

      await doOnNextBlock(async () => {
        await contractAsRewardPool.restartRewards();
        expect(await contract.getRewards()).to.be.equal(0);
      }, startTime + duration1 + 2 * delta2);

      await setBlockTime(startTime + duration1 + duration2 + 1000);
      expect(await contract.getRewards()).to.be.equal(delta2 * rate2);

      await contractAsRewardPool.restartRewards();
      expect(await contract.getRewards()).to.be.equal(0);
      expect(await contract.isCampaignRunning()).to.be.false;
    });
  });
});
