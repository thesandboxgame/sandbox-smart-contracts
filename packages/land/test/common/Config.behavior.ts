import {expect} from 'chai';
import {loadFixture} from '@nomicfoundation/hardhat-network-helpers';
import {ZeroAddress} from 'ethers';

// eslint-disable-next-line mocha/no-exports
export function landConfig(setupLand, Contract: string) {
  describe(Contract + ':Settings', function () {
    describe('roles', function () {
      it('Only admin can set landMinter', async function () {
        const {LandContract, deployer} = await loadFixture(setupLand);
        await expect(
          LandContract.setMinter(deployer, true),
        ).to.be.revertedWithCustomError(LandContract, 'OnlyAdmin');
      });

      it('should enable a landMinter', async function () {
        const {LandAsAdmin, deployer} = await setupLand();
        await expect(LandAsAdmin.setMinter(deployer, true)).not.to.be.reverted;
        expect(await LandAsAdmin.isMinter(deployer)).to.be.true;
      });

      it('should disable a landMinter', async function () {
        const {LandAsAdmin, deployer} = await setupLand();
        await expect(LandAsAdmin.setMinter(deployer, true)).not.to.be.reverted;
        await expect(LandAsAdmin.setMinter(deployer, false)).not.to.be.reverted;
        expect(await LandAsAdmin.isMinter(deployer)).to.be.false;
      });

      it('should not set royaltyManager if caller is not admin', async function () {
        const {LandAsOther, other} = await loadFixture(setupLand);
        await expect(
          LandAsOther.setRoyaltyManager(other),
        ).to.be.revertedWithCustomError(LandAsOther, 'OnlyAdmin');
      });

      it('should set royaltyManager', async function () {
        const {LandAsAdmin, other, RoyaltyManagerContract} =
          await loadFixture(setupLand);
        expect(await LandAsAdmin.getRoyaltyManager()).to.be.equal(
          RoyaltyManagerContract,
        );
        await LandAsAdmin.setRoyaltyManager(other);
        expect(await LandAsAdmin.getRoyaltyManager()).to.be.equal(other);
      });

      it('should not set owner if caller is not admin', async function () {
        const {LandAsOther, other} = await loadFixture(setupLand);
        await expect(
          LandAsOther.transferOwnership(other),
        ).to.be.revertedWithCustomError(LandAsOther, 'OnlyAdmin');
      });

      it('should set owner', async function () {
        const {LandAsAdmin, other, landOwner} = await loadFixture(setupLand);
        expect(await LandAsAdmin.owner()).to.be.equal(landOwner);
        await LandAsAdmin.transferOwnership(other);
        expect(await LandAsAdmin.owner()).to.be.equal(other);
      });

      it('should not initialize twice', async function () {
        const {LandAsAdmin, other} = await loadFixture(setupLand);
        await expect(
          LandAsAdmin.initialize(other),
        ).to.be.revertedWithCustomError(LandAsAdmin, 'InvalidInitialization');
      });

      it('should not initialize twice after upgrade', async function () {
        const {LandAsAdmin, landAdmin, other} = await loadFixture(setupLand);
        expect(await LandAsAdmin.getAdmin()).to.be.equal(landAdmin);
        await LandAsAdmin.simulateUpgrade(ZeroAddress);
        await LandAsAdmin.initialize(other);
        expect(await LandAsAdmin.getAdmin()).to.be.equal(other);

        await LandAsAdmin.simulateUpgrade(landAdmin);
        await expect(
          LandAsAdmin.initialize(other),
        ).to.be.revertedWithCustomError(LandAsAdmin, 'InvalidInitialization');
      });

      it('should not change admin if old admin is zero', async function () {
        const {LandAsAdmin, landAdmin, other} = await loadFixture(setupLand);
        expect(await LandAsAdmin.getAdmin()).to.be.equal(landAdmin);
        await LandAsAdmin.simulateUpgrade(ZeroAddress);
        await expect(
          LandAsAdmin.changeAdminWithoutPerms(other),
        ).to.be.revertedWithCustomError(LandAsAdmin, 'InvalidAddress');
      });
    });
  });
}
