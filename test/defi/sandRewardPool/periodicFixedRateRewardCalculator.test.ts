import {expect} from 'chai';
import {ethers, getUnnamedAccounts} from 'hardhat';
import {mine, withSnapshot} from '../../utils';
import {BigNumber} from 'ethers';

const fixture = withSnapshot([], async function (hre) {
  const durationInSeconds = 28 * 24 * 60 * 60;
  const {deployments, getNamedAccounts, ethers} = hre;
  const {deployer} = await getNamedAccounts();
  const [
    admin,
    rewardPool,
    rewardDistribution,
    other,
  ] = await getUnnamedAccounts();

  // Taken from 01_deploy_mock_land_with_mint.ts
  await deployments.deploy('PeriodicFixedRateRewardCalculator', {
    from: deployer,
    args: [rewardPool, durationInSeconds],
  });
  const contract = await ethers.getContract(
    'PeriodicFixedRateRewardCalculator',
    deployer
  );
  const contractAsAdmin = await ethers.getContract(
    'PeriodicFixedRateRewardCalculator',
    admin
  );
  const contractAsRewardDistribution = await ethers.getContract(
    'PeriodicFixedRateRewardCalculator',
    rewardDistribution
  );
  const contractAsRewardPool = await ethers.getContract(
    'PeriodicFixedRateRewardCalculator',
    rewardPool
  );
  const REWARD_DISTRIBUTION = await contract.REWARD_DISTRIBUTION();
  await contract.grantRole(REWARD_DISTRIBUTION, rewardDistribution);
  return {
    durationInSeconds,
    contract,
    contractAsAdmin,
    contractAsRewardDistribution,
    contractAsRewardPool,
    rewardDistribution,
    admin,
    rewardPool,
    other,
  };
});

async function setBlockTime(time: number) {
  await ethers.provider.send('evm_setNextBlockTimestamp', [time]);
  await mine();
}

async function doOnNextBlock(todo: () => Promise<void>, nextTimestamp = 0) {
  if (!nextTimestamp) {
    const latestBlock = await ethers.provider.getBlock('latest');
    nextTimestamp = latestBlock.timestamp + 10;
  }
  await ethers.provider.send('evm_setNextBlockTimestamp', [nextTimestamp]);
  await todo();
  return nextTimestamp;
}

describe('PeriodicFixedRateRewardCalculator', function () {
  describe('roles', function () {
    it('reward pool should be able to call restartRewards', async function () {
      const {contractAsRewardPool} = await fixture();
      await expect(contractAsRewardPool.restartRewards(0)).not.to.be.reverted;
    });
    it('others should fail to call restartRewards', async function () {
      const {
        contract,
        contractAsAdmin,
        contractAsRewardDistribution,
      } = await fixture();

      await expect(contract.restartRewards(0)).to.be.revertedWith(
        'not reward pool'
      );
      await expect(contractAsAdmin.restartRewards(0)).to.be.revertedWith(
        'not reward pool'
      );
      await expect(
        contractAsRewardDistribution.restartRewards(0)
      ).to.be.revertedWith('not reward pool');
    });
    it('reward distribution should be able to call notifyRewardAmount', async function () {
      const {contractAsRewardDistribution} = await fixture();
      await expect(contractAsRewardDistribution.notifyRewardAmount(12345678))
        .not.to.be.reverted;
    });
    it('other should fail to call notifyRewardAmount', async function () {
      const {contract, contractAsAdmin, contractAsRewardPool} = await fixture();

      await expect(contract.notifyRewardAmount(12345678)).to.be.revertedWith(
        'not reward distribution'
      );
      await expect(
        contractAsAdmin.notifyRewardAmount(12345678)
      ).to.be.revertedWith('not reward distribution');
      await expect(
        contractAsRewardPool.notifyRewardAmount(12345678)
      ).to.be.revertedWith('not reward distribution');
    });
  });

  describe('should be no rewards on initialization', function () {
    it('startup', async function () {
      const {contract} = await fixture();
      expect(await contract.getRewards()).to.be.equal(0);
    });
    it('update call', async function () {
      const {contractAsRewardPool, durationInSeconds} = await fixture();
      await contractAsRewardPool.restartRewards(0);
      expect(await contractAsRewardPool.getRewards()).to.be.equal(0);
      await contractAsRewardPool.restartRewards(100);
      expect(await contractAsRewardPool.getRewards()).to.be.equal(0);
      const time = await doOnNextBlock(async () => {
        await contractAsRewardPool.restartRewards(100);
      });
      await setBlockTime(time + 2 * durationInSeconds);
      expect(await contractAsRewardPool.getRewards()).to.be.equal(0);
    });
  });

  describe('reward distribution', function () {
    it('setup: we use the rate, so REWARDS must be multiple of duration (or leftover + reward if we add in the middle)', async function () {
      const {
        contract,
        contractAsRewardDistribution,
        durationInSeconds,
      } = await fixture();
      const rewards = BigNumber.from(12345678);
      const realRewards = rewards.div(durationInSeconds).mul(durationInSeconds);
      expect(await contract.duration()).to.be.equal(durationInSeconds);
      expect(await contract.lastUpdateTime()).to.be.equal(0);
      expect(await contract.periodFinish()).to.be.equal(0);

      const time = await doOnNextBlock(async () => {
        await contractAsRewardDistribution.notifyRewardAmount(rewards);
      });
      expect(await contract.lastUpdateTime()).to.be.equal(time);
      expect(await contract.periodFinish()).to.be.equal(
        time + durationInSeconds
      );
      expect(await contract.rewardRate()).to.be.equal(
        rewards.div(durationInSeconds)
      );
      await setBlockTime(time + 2 * durationInSeconds);
      expect(await contract.getRewards()).to.be.equal(realRewards);
    });
    it('we distribute rewards linearly', async function () {
      const {
        contract,
        contractAsRewardDistribution,
        durationInSeconds,
      } = await fixture();
      const rewards = BigNumber.from(durationInSeconds * 10000);
      const time = await doOnNextBlock(async () => {
        await contractAsRewardDistribution.notifyRewardAmount(rewards);
      });
      expect(await contract.lastUpdateTime()).to.be.equal(time);
      const steps = 100;
      for (let i = 1; i <= steps; i++) {
        const currentStep = (i * durationInSeconds) / steps;
        await setBlockTime(time + currentStep);
        expect(await contract.getRewards()).to.be.equal(
          rewards.div(durationInSeconds).mul(currentStep)
        );
      }
      await setBlockTime(time + durationInSeconds + 10);
      expect(await contract.getRewards()).to.be.equal(rewards);
    });
    it('if update rewards is called (with contribution!=0) then rewards starts from zero again', async function () {
      const {
        contract,
        contractAsRewardDistribution,
        contractAsRewardPool,
        durationInSeconds,
      } = await fixture();
      // OBS: Calling restartRewards before notifyRewardAmount doesn't change anything.
      await doOnNextBlock(async () => {
        await contractAsRewardPool.restartRewards(1);
      });

      const totalRewards = BigNumber.from(durationInSeconds * 10000);
      const rate = totalRewards.div(durationInSeconds);
      const time = await doOnNextBlock(async () => {
        await contractAsRewardDistribution.notifyRewardAmount(totalRewards);
      });
      expect(await contract.lastUpdateTime()).to.be.equal(time);
      const steps = 100;
      // 30 steps
      const currentStep = (30 * durationInSeconds) / steps;
      await setBlockTime(time + currentStep);
      expect(await contract.getRewards()).to.be.equal(rate.mul(currentStep));

      // This freezes the rewards on step 31
      const updateStep = (31 * durationInSeconds) / steps;
      const updateTime = await doOnNextBlock(async () => {
        await contractAsRewardPool.restartRewards(1);
      }, time + updateStep);
      expect(await contract.lastUpdateTime()).to.be.equal(updateTime);
      expect(await contract.getRewards()).to.be.equal(0);

      for (let i = 32; i <= steps; i++) {
        const currentStep = (i * durationInSeconds) / steps;
        await setBlockTime(time + currentStep);
        expect(await contract.getRewards()).to.be.equal(
          rate.mul(currentStep - updateStep)
        );
      }
      await setBlockTime(time + durationInSeconds + 10);
      const firstPartRewards = rate.mul(updateStep);
      const currentRewards = await contract.getRewards();
      expect(firstPartRewards.add(currentRewards)).to.be.equal(totalRewards);
    });

    it('calling notifyRewardAmount in the middle of the distribution will distribute the remaining + what was added', async function () {
      const {
        contract,
        contractAsRewardDistribution,
        durationInSeconds,
      } = await fixture();
      const rewards1 = BigNumber.from(
        durationInSeconds * durationInSeconds * 123
      );
      const rewards2 = BigNumber.from(durationInSeconds * 4);

      const startTime = await doOnNextBlock(async () => {
        await contractAsRewardDistribution.notifyRewardAmount(rewards1);
      });

      const updateStep = (31 * durationInSeconds) / 100;
      const updateTime = await doOnNextBlock(async () => {
        await contractAsRewardDistribution.notifyRewardAmount(rewards2);
      }, startTime + updateStep);

      const firstPartRewards = rewards1.div(durationInSeconds).mul(updateStep);
      const remaining = rewards1.sub(firstPartRewards);
      const rate2 = rewards2.add(remaining).div(durationInSeconds);
      // This is not always true!!!
      expect(rate2.mul(durationInSeconds)).to.be.equal(rewards2.add(remaining));
      expect(await contract.lastUpdateTime()).to.be.equal(updateTime);
      expect(await contract.periodFinish()).to.be.equal(
        updateTime + durationInSeconds
      );
      expect(await contract.rewardRate()).to.be.equal(rate2);
      expect(await contract.getRewards()).to.be.equal(firstPartRewards);

      const steps = 100;
      for (let i = 1; i <= steps; i++) {
        const currentStep = (i * durationInSeconds) / steps;
        await setBlockTime(updateTime + currentStep);
        expect(await contract.getRewards()).to.be.equal(
          firstPartRewards.add(rate2.mul(currentStep))
        );
      }
      await setBlockTime(updateTime + durationInSeconds + 10);
      expect(await contract.getRewards()).to.be.equal(rewards1.add(rewards2));
    });
    it('calling notifyRewardAmount after the distribution will distribute both amounts', async function () {
      const {
        contract,
        contractAsRewardDistribution,
        durationInSeconds,
      } = await fixture();
      const rewards1 = BigNumber.from(
        durationInSeconds * durationInSeconds * 123
      );
      const rewards2 = BigNumber.from(durationInSeconds * 456);

      const time = await doOnNextBlock(async () => {
        await contractAsRewardDistribution.notifyRewardAmount(rewards1);
      });
      // Calling after period finish.
      const updateTime = await doOnNextBlock(async () => {
        await contractAsRewardDistribution.notifyRewardAmount(rewards2);
      }, time + durationInSeconds + 10);

      const rate2 = rewards2.div(durationInSeconds);
      expect(await contract.lastUpdateTime()).to.be.equal(updateTime);
      expect(await contract.periodFinish()).to.be.equal(
        updateTime + durationInSeconds
      );
      expect(await contract.rewardRate()).to.be.equal(rate2);
      expect(await contract.getRewards()).to.be.equal(rewards1);

      const steps = 100;
      for (let i = 1; i <= steps; i++) {
        const currentStep = (i * durationInSeconds) / steps;
        await setBlockTime(updateTime + currentStep);
        expect(await contract.getRewards()).to.be.equal(
          rewards1.add(rate2.mul(currentStep))
        );
      }
      await setBlockTime(updateTime + durationInSeconds + 10);
      expect(await contract.getRewards()).to.be.equal(rewards1.add(rewards2));
    });
  });
});
