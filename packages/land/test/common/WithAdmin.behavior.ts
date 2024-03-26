import {expect} from 'chai';
import {loadFixture} from '@nomicfoundation/hardhat-network-helpers';

// eslint-disable-next-line mocha/no-exports
export function shouldCheckForAdmin(setupLand, Contract: string) {
  describe(Contract + ':WithAdmin', function () {
    it('should get the current admin', async function () {
      const {LandContract, landAdmin} = await loadFixture(setupLand);
      expect(await LandContract.getAdmin()).to.be.equal(landAdmin);
    });

    it('should change the admin to a new address', async function () {
      const {LandAsAdmin, deployer} = await loadFixture(setupLand);
      await expect(LandAsAdmin.changeAdmin(deployer)).not.to.be.reverted;
      expect(await LandAsAdmin.getAdmin()).to.be.equal(deployer);
    });

    it('should only be changed to a new admin', async function () {
      const {LandAsAdmin, landAdmin} = await loadFixture(setupLand);
      await expect(LandAsAdmin.changeAdmin(landAdmin)).to.be.revertedWith(
        'only new admin',
      );
    });
  });
}
