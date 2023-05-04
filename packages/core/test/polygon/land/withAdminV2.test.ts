import {expect} from '../../chai-setup';
import {setupLand} from './fixtures';
import {sendMetaTx} from '../../sendMetaTx';

describe('PolygonLand:WithAdminV2', function () {
  it('should get the current admin', async function () {
    const {PolygonLand, deployer} = await setupLand();

    expect(await PolygonLand.getAdmin()).to.be.equal(deployer.address);
  });

  it('should change the admin to a new address', async function () {
    const {PolygonLand, ethers, users} = await setupLand();
    const admin = await PolygonLand.getAdmin();
    const contract = PolygonLand.connect(ethers.provider.getSigner(admin));

    await expect(contract.changeAdmin(users[0].address)).not.to.be.reverted;

    expect(await contract.getAdmin()).to.be.equal(users[0].address);
  });

  describe('Meta transactions', function () {
    it('should change the admin to a new address', async function () {
      const {PolygonLand, ethers, users, trustedForwarder} = await setupLand();
      const admin = await PolygonLand.getAdmin();
      const contract = PolygonLand.connect(ethers.provider.getSigner(admin));

      const {to, data} = await contract.populateTransaction[
        'changeAdmin(address)'
      ](users[0].address);

      await sendMetaTx(to, trustedForwarder, data, admin, '1000000');

      expect(await contract.getAdmin()).to.be.equal(users[0].address);
    });
  });
});
