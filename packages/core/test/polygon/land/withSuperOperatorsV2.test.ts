import {expect} from '../../chai-setup';
import {sendMetaTx} from '../../sendMetaTx';
import {setupLand} from './fixtures';

describe('PolygonLand:WithSuperOperatorsV2', function () {
  it('should not be a super operator by default', async function () {
    const {PolygonLand, getNamedAccounts} = await setupLand();
    const {landAdmin} = await getNamedAccounts();

    expect(await PolygonLand.isSuperOperator(landAdmin)).to.be.false;
  });

  it('should be an admin to set super operator', async function () {
    const {PolygonLand, users} = await setupLand();

    await expect(
      users[0].PolygonLand.setSuperOperator(users[0].address, true)
    ).to.be.revertedWith('only admin is allowed to add super operators');

    expect(await PolygonLand.isSuperOperator(users[0].address)).to.be.false;
  });

  it('should enable a super operator', async function () {
    const {PolygonLand, ethers} = await setupLand();
    const admin = await PolygonLand.getAdmin();
    const contract = PolygonLand.connect(ethers.provider.getSigner(admin));

    await expect(contract.setSuperOperator(admin, true)).not.to.be.reverted;

    expect(await PolygonLand.isSuperOperator(admin)).to.be.true;
  });

  it('should disable a super operator', async function () {
    const {PolygonLand, ethers} = await setupLand();
    const admin = await PolygonLand.getAdmin();
    const contract = PolygonLand.connect(ethers.provider.getSigner(admin));

    await expect(contract.setSuperOperator(admin, true)).not.to.be.reverted;
    await expect(contract.setSuperOperator(admin, false)).not.to.be.reverted;

    expect(await PolygonLand.isSuperOperator(admin)).to.be.false;
  });

  describe('Meta transactions', function () {
    it('should enable a super operator', async function () {
      const {PolygonLand, ethers, trustedForwarder} = await setupLand();
      const admin = await PolygonLand.getAdmin();
      const contract = PolygonLand.connect(ethers.provider.getSigner(admin));

      const {to, data} = await contract.populateTransaction[
        'setSuperOperator(address,bool)'
      ](admin, true);

      await sendMetaTx(to, trustedForwarder, data, admin, '1000000');

      expect(await PolygonLand.isSuperOperator(admin)).to.be.true;
    });
  });
});
