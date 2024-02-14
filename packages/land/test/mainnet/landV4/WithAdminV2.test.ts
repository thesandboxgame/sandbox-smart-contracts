import {expect} from 'chai';
import {loadFixture} from '@nomicfoundation/hardhat-network-helpers';
import {setupLandV4} from './fixtures';

describe('LandV4:AdminV2', function () {
  it('should get the current admin', async function () {
    const {LandV4Contract, landAdmin} = await loadFixture(setupLandV4);
    expect(await LandV4Contract.getAdmin()).to.be.equal(landAdmin);
  });

  it('should change the admin to a new address', async function () {
    const {LandAsAdmin, deployer} = await loadFixture(setupLandV4);
    await expect(LandAsAdmin.changeAdmin(deployer)).not.to.be.reverted;
    expect(await LandAsAdmin.getAdmin()).to.be.equal(deployer);
  });

  it('should only be changed to a new admin', async function () {
    const {LandAsAdmin, landAdmin} = await loadFixture(setupLandV4);
    await expect(LandAsAdmin.changeAdmin(landAdmin.address)).to.be.revertedWith(
      'only new admin',
    );
  });
});
