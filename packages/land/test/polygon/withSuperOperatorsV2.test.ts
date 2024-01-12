import {expect} from 'chai';
import {loadFixture} from '@nomicfoundation/hardhat-network-helpers';
import {setupPolygonLand} from './fixtures';

describe('PolygonLand:WithSuperOperatorsV2', function () {
  it('should not be a super operator by default', async function () {
    const {landAsDeployer, landAdmin} = await loadFixture(setupPolygonLand);
    expect(await landAsDeployer.isSuperOperator(landAdmin)).to.be.false;
  });

  it('should be an admin to set super operator', async function () {
    const {landAsDeployer, deployer} = await loadFixture(setupPolygonLand);
    await expect(
      landAsDeployer.setSuperOperator(deployer, true),
    ).to.be.revertedWith('ADMIN_ONLY');
    expect(await landAsDeployer.isSuperOperator(deployer)).to.be.false;
  });

  it('should enable a super operator', async function () {
    const {landAsAdmin, landAdmin} = await loadFixture(setupPolygonLand);
    await expect(landAsAdmin.setSuperOperator(landAdmin, true)).not.to.be
      .reverted;
    expect(await landAsAdmin.isSuperOperator(landAdmin)).to.be.true;
  });

  it('should disable a super operator', async function () {
    const {landAsAdmin, landAdmin} = await loadFixture(setupPolygonLand);
    // TODO: .not.to.be.reverted is not the best possible test
    await expect(landAsAdmin.setSuperOperator(landAdmin, true)).not.to.be
      .reverted;
    await expect(landAsAdmin.setSuperOperator(landAdmin, false)).not.to.be
      .reverted;
    expect(await landAsAdmin.isSuperOperator(landAdmin)).to.be.false;
  });

  describe('Meta transactions', function () {
    it('should enable a super operator', async function () {
      const {landAsAdmin, landAdmin, sendMetaTx} =
        await loadFixture(setupPolygonLand);
      const {to, data} = await landAsAdmin.setSuperOperator.populateTransaction(
        landAdmin,
        true,
      );
      await sendMetaTx(landAdmin, to, data);
      expect(await landAsAdmin.isSuperOperator(landAdmin)).to.be.true;
    });
  });
});
