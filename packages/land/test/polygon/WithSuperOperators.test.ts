import {expect} from 'chai';
import {loadFixture} from '@nomicfoundation/hardhat-network-helpers';
import {setupPolygonLand} from './fixtures';

describe('PolygonLand:WithSuperOperators', function () {
  it('should not be a super operator by default', async function () {
    const {PolygonLandContract, landAdmin} =
      await loadFixture(setupPolygonLand);
    expect(await PolygonLandContract.isSuperOperator(landAdmin)).to.be.false;
  });

  it('should be an admin to set super operator', async function () {
    const {PolygonLandContract, deployer} = await loadFixture(setupPolygonLand);
    await expect(
      PolygonLandContract.setSuperOperator(deployer, true),
    ).to.be.revertedWith('only admin allowed');
    expect(await PolygonLandContract.isSuperOperator(deployer)).to.be.false;
  });

  it('should enable a super operator', async function () {
    const {LandAsAdmin, landAdmin} = await loadFixture(setupPolygonLand);
    await expect(LandAsAdmin.setSuperOperator(landAdmin, true)).not.to.be
      .reverted;
    expect(await LandAsAdmin.isSuperOperator(landAdmin)).to.be.true;
  });

  it('should disable a super operator', async function () {
    const {LandAsAdmin, landAdmin} = await loadFixture(setupPolygonLand);
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
        await loadFixture(setupPolygonLand);
      const {to, data} = await LandAsAdmin.setSuperOperator.populateTransaction(
        landAdmin,
        true,
      );
      await sendMetaTx(landAdmin, to, data);
      expect(await LandAsAdmin.isSuperOperator(landAdmin)).to.be.true;
    });
  });
});
