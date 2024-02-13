import {expect} from 'chai';
import {loadFixture} from '@nomicfoundation/hardhat-network-helpers';
import {setupPolygonLandV3} from './fixtures';

describe('PolygonLandV3:WithSuperOperatorsV2', function () {
  it('should not be a super operator by default', async function () {
    const {PolygonLandV3Contract, landAdmin} =
      await loadFixture(setupPolygonLandV3);
    expect(await PolygonLandV3Contract.isSuperOperator(landAdmin)).to.be.false;
  });

  it('should be an admin to set super operator', async function () {
    const {PolygonLandV3Contract, deployer} =
      await loadFixture(setupPolygonLandV3);
    await expect(
      PolygonLandV3Contract.setSuperOperator(deployer, true),
    ).to.be.revertedWith('ADMIN_ONLY');
    expect(await PolygonLandV3Contract.isSuperOperator(deployer)).to.be.false;
  });

  it('should enable a super operator', async function () {
    const {LandAsAdmin, landAdmin} = await loadFixture(setupPolygonLandV3);
    await expect(LandAsAdmin.setSuperOperator(landAdmin, true)).not.to.be
      .reverted;
    expect(await LandAsAdmin.isSuperOperator(landAdmin)).to.be.true;
  });

  it('should disable a super operator', async function () {
    const {LandAsAdmin, landAdmin} = await loadFixture(setupPolygonLandV3);
    // TODO: .not.to.be.reverted is not the best possible test
    await expect(LandAsAdmin.setSuperOperator(landAdmin, true)).not.to.be
      .reverted;
    await expect(LandAsAdmin.setSuperOperator(landAdmin, false)).not.to.be
      .reverted;
    expect(await LandAsAdmin.isSuperOperator(landAdmin)).to.be.false;
  });

  describe('Meta transactions', function () {
    it('should enable a super operator', async function () {
      const {LandAsAdmin, landAdmin, sendMetaTx} =
        await loadFixture(setupPolygonLandV3);
      const {to, data} = await LandAsAdmin.setSuperOperator.populateTransaction(
        landAdmin,
        true,
      );
      await sendMetaTx(landAdmin, to, data);
      expect(await LandAsAdmin.isSuperOperator(landAdmin)).to.be.true;
    });
  });
});
