import {anyValue} from '@nomicfoundation/hardhat-chai-matchers/withArgs';
import {expect} from 'chai';
import {ethers} from 'hardhat';
import {loadFixture, time} from '@nomicfoundation/hardhat-network-helpers';
import {deployOneYearLockFixture} from './fixtures';

describe('LockUpgradable', function () {
  describe('Deployment', function () {
    it('Should set the right unlockTime', async function () {
      const {lockAsOwner, unlockTime} = await loadFixture(
        deployOneYearLockFixture
      );

      expect(await lockAsOwner.unlockTime()).to.equal(unlockTime);
    });

    it('Should be very careful about the owner', async function () {
      const {lockAsOwner, deployer} = await loadFixture(
        deployOneYearLockFixture
      );

      expect(await lockAsOwner.owner()).to.equal(await deployer.getAddress());
    });

    it('Should receive and store the funds to lock', async function () {
      const {lockAsOwner, lockedAmount} = await loadFixture(
        deployOneYearLockFixture
      );

      expect(
        await ethers.provider.getBalance(lockAsOwner.getAddress())
      ).to.equal(lockedAmount);
    });

    it('Should fail if the unlockTime is not in the future', async function () {
      // We don't use the fixture here because we want a different deployment
      const latestTime = await time.latest();
      const Lock = await ethers.getContractFactory('Lock');
      await expect(Lock.deploy(latestTime, {value: 1})).to.be.revertedWith(
        'Unlock time should be in the future'
      );
    });
  });

  describe('Withdrawals', function () {
    describe('Validations', function () {
      it('Should revert with the right error if called too soon', async function () {
        const {lockAsOwner} = await loadFixture(deployOneYearLockFixture);

        await expect(lockAsOwner.withdraw()).to.be.revertedWith(
          "You can't withdraw yet"
        );
      });

      it('Should revert with the right error if called from another account', async function () {
        const {lockAsOwner, unlockTime, otherAccount} = await loadFixture(
          deployOneYearLockFixture
        );

        // We can increase the time in Hardhat Network
        await time.increaseTo(unlockTime);

        // We use lock.connect() to send a transaction from another account
        await expect(
          lockAsOwner.connect(otherAccount).withdraw()
        ).to.be.revertedWith("You aren't the owner");
      });

      it("Shouldn't fail if the unlockTime has arrived and the owner calls it", async function () {
        const {lockAsDeployer, unlockTime} = await loadFixture(
          deployOneYearLockFixture
        );

        // Transactions are sent using the first signer by default
        await time.increaseTo(unlockTime);

        await expect(lockAsDeployer.withdraw()).not.to.be.reverted;
      });
    });

    describe('Events', function () {
      it('Should emit an event on withdrawals', async function () {
        const {lockAsDeployer, unlockTime, lockedAmount} = await loadFixture(
          deployOneYearLockFixture
        );

        await time.increaseTo(unlockTime);

        await expect(lockAsDeployer.withdraw())
          .to.emit(lockAsDeployer, 'Withdrawal')
          .withArgs(lockedAmount, anyValue); // We accept any value as `when` arg
      });
    });

    describe('Transfers', function () {
      it('Should transfer the funds to the owner', async function () {
        const {lockAsDeployer, unlockTime, lockedAmount, deployer} =
          await loadFixture(deployOneYearLockFixture);

        await time.increaseTo(unlockTime);

        await expect(lockAsDeployer.withdraw()).to.changeEtherBalances(
          [deployer, lockAsDeployer],
          [lockedAmount, -lockedAmount]
        );
      });
    });
  });
});
