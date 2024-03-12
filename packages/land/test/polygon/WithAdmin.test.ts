import {expect} from 'chai';
import {loadFixture} from '@nomicfoundation/hardhat-network-helpers';
import {setupPolygonLand} from './fixtures';

describe('PolygonLand:WithAdmin', function () {
  it('should get the current admin', async function () {
    const {LandContract, landAdmin} = await loadFixture(setupPolygonLand);
    expect(await LandContract.getAdmin()).to.be.equal(landAdmin);
  });

  it('should change the admin to a new address', async function () {
    const {LandAsAdmin, deployer} = await loadFixture(setupPolygonLand);
    await expect(LandAsAdmin.changeAdmin(deployer)).not.to.be.reverted;
    expect(await LandAsAdmin.getAdmin()).to.be.equal(deployer);
  });

  describe('Meta transactions', function () {
    it('should change the admin to a new address', async function () {
      const {LandAsAdmin, landAdmin, deployer, sendMetaTx} =
        await loadFixture(setupPolygonLand);
      const {to, data} =
        await LandAsAdmin.changeAdmin.populateTransaction(deployer);
      await sendMetaTx(landAdmin, to, data);
      expect(await LandAsAdmin.getAdmin()).to.be.equal(deployer);
    });
  });
});
