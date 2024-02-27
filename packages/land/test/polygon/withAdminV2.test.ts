import {expect} from 'chai';
import {loadFixture} from '@nomicfoundation/hardhat-network-helpers';
import {setupPolygonLand} from './fixtures';

describe('PolygonLand:WithAdminV2', function () {
  it('should get the current admin', async function () {
    const {landAsDeployer, landAdmin} = await loadFixture(setupPolygonLand);
    expect(await landAsDeployer.getAdmin()).to.be.equal(landAdmin);
  });

  it('should change the admin to a new address', async function () {
    const {landAsAdmin, deployer} = await loadFixture(setupPolygonLand);
    await expect(landAsAdmin.changeAdmin(deployer)).not.to.be.reverted;
    expect(await landAsAdmin.getAdmin()).to.be.equal(deployer);
  });

  describe('Meta transactions', function () {
    it('should change the admin to a new address', async function () {
      const {landAsAdmin, landAdmin, deployer, sendMetaTx} =
        await loadFixture(setupPolygonLand);
      const {to, data} =
        await landAsAdmin.changeAdmin.populateTransaction(deployer);
      await sendMetaTx(landAdmin, to, data);
      expect(await landAsAdmin.getAdmin()).to.be.equal(deployer);
    });
  });
});
