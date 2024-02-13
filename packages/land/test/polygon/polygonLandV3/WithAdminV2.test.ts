import {expect} from 'chai';
import {loadFixture} from '@nomicfoundation/hardhat-network-helpers';
import {setupPolygonLandV3} from './fixtures';

describe('PolygonLandV3:WithAdminV2', function () {
  it('should get the current admin', async function () {
    const {PolygonLandV3Contract, landAdmin} =
      await loadFixture(setupPolygonLandV3);
    expect(await PolygonLandV3Contract.getAdmin()).to.be.equal(landAdmin);
  });

  it('should change the admin to a new address', async function () {
    const {LandAsAdmin, deployer} = await loadFixture(setupPolygonLandV3);
    await expect(LandAsAdmin.changeAdmin(deployer)).not.to.be.reverted;
    expect(await LandAsAdmin.getAdmin()).to.be.equal(deployer);
  });

  describe('Meta transactions', function () {
    it('should change the admin to a new address', async function () {
      const {LandAsAdmin, landAdmin, deployer, sendMetaTx} =
        await loadFixture(setupPolygonLandV3);
      const {to, data} =
        await LandAsAdmin.changeAdmin.populateTransaction(deployer);
      await sendMetaTx(landAdmin, to, data);
      expect(await LandAsAdmin.getAdmin()).to.be.equal(deployer);
    });
  });
});
