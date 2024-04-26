import {expect} from 'chai';
import {loadFixture} from '@nomicfoundation/hardhat-network-helpers';
import {ZeroAddress} from 'ethers';

// eslint-disable-next-line mocha/no-exports
export function shouldCheckForSuperOperators(setupLand, Contract: string) {
  describe(Contract + ':WithSuperOperators', function () {
    it('should not be a super operator by default', async function () {
      const {LandContract, landAdmin} = await loadFixture(setupLand);
      expect(await LandContract.isSuperOperator(landAdmin)).to.be.false;
    });

    it('should be an admin to set super operator', async function () {
      const {LandContract, deployer} = await loadFixture(setupLand);
      await expect(
        LandContract.setSuperOperator(deployer, true),
      ).to.be.revertedWithCustomError(LandContract, 'OnlyAdmin');
      expect(await LandContract.isSuperOperator(deployer)).to.be.false;
    });

    it('should enable a super operator', async function () {
      const {LandAsAdmin, landAdmin} = await loadFixture(setupLand);
      await expect(LandAsAdmin.setSuperOperator(landAdmin.address, true)).not.to
        .be.reverted;
      expect(await LandAsAdmin.isSuperOperator(landAdmin.address)).to.be.true;
    });

    it('should disable a super operator', async function () {
      const {LandAsAdmin, landAdmin} = await loadFixture(setupLand);
      await expect(LandAsAdmin.setSuperOperator(landAdmin.address, true)).not.to
        .be.reverted;
      await expect(LandAsAdmin.setSuperOperator(landAdmin.address, false)).not
        .to.be.reverted;
      expect(await LandAsAdmin.isSuperOperator(landAdmin.address)).to.be.false;
    });

    it('should not accept address 0 as super operator', async function () {
      const {LandAsAdmin} = await loadFixture(setupLand);
      await expect(
        LandAsAdmin.setSuperOperator(ZeroAddress, false),
      ).to.be.revertedWithCustomError(LandAsAdmin, 'InvalidAddress');
      await expect(
        LandAsAdmin.setSuperOperator(ZeroAddress, true),
      ).to.be.revertedWithCustomError(LandAsAdmin, 'InvalidAddress');
      expect(await LandAsAdmin.isSuperOperator(ZeroAddress)).to.be.false;
    });

    it('should only be able to disable an enabled super operator', async function () {
      const {LandAsAdmin, landAdmin} = await loadFixture(setupLand);
      await expect(LandAsAdmin.setSuperOperator(landAdmin.address, true)).not.to
        .be.reverted;
      expect(await LandAsAdmin.isSuperOperator(landAdmin.address)).to.be.true;
      await expect(
        LandAsAdmin.setSuperOperator(landAdmin.address, true),
      ).to.be.revertedWithCustomError(LandAsAdmin, 'InvalidArgument');
      await expect(LandAsAdmin.setSuperOperator(landAdmin.address, false)).not
        .to.be.reverted;
    });

    it('should only be able to enable a disabled super operator', async function () {
      const {LandAsAdmin, landAdmin} = await loadFixture(setupLand);
      expect(await LandAsAdmin.isSuperOperator(landAdmin.address)).to.be.false;
      await expect(
        LandAsAdmin.setSuperOperator(landAdmin.address, false),
      ).to.be.revertedWithCustomError(LandAsAdmin, 'InvalidArgument');
      await expect(LandAsAdmin.setSuperOperator(landAdmin.address, true)).not.to
        .be.reverted;
    });
  });
}
