import hre, {deployments} from 'hardhat';
import {expect} from 'chai';
import {getAvatarContracts} from '../../common/fixtures/avatar';

describe('@skip-on-coverage @e2e @l2 polygon Avatar', function () {
  before(async function () {
    const {l2, buyer} = await getAvatarContracts(
      hre.companionNetworks['l1'] ? hre.companionNetworks['l1'] : hre,
      hre.companionNetworks['l2'] ? hre.companionNetworks['l2'] : hre
    );
    this.l2 = l2;
    this.buyer = buyer;
  });
  describe('roles', function () {
    it('admin', async function () {
      const defaultAdminRole = await this.l2.avatar.DEFAULT_ADMIN_ROLE();
      expect(await this.l2.avatar.hasRole(defaultAdminRole, this.l2.sandAdmin))
        .to.be.true;
      expect(await this.l2.avatar.hasRole(defaultAdminRole, this.l2.sandAdmin))
        .to.be.true;
    });
    it('minter', async function () {
      const minterRole = await this.l2.avatar.MINTER_ROLE();
      expect(await this.l2.avatar.hasRole(minterRole, this.l2.sale.address)).to
        .be.true;
    });
    it('trusted forwarder', async function () {
      expect(await this.l2.avatar.getTrustedForwarder()).to.be.equal(
        this.l2.trustedForwarder.address
      );
      expect(await this.l2.sale.getTrustedForwarder()).to.be.equal(
        this.l2.trustedForwarder.address
      );
    });
    it('signer', async function () {
      const signerRole = await this.l2.sale.SIGNER_ROLE();
      expect(await this.l2.sale.hasRole(signerRole, this.l2.backendAuthWallet))
        .to.be.true;
    });
    it('seller', async function () {
      const sellerRole = await this.l2.sale.SELLER_ROLE();
      expect(await this.l2.sale.hasRole(sellerRole, this.l2.sandboxAccount)).to
        .be.true;
    });
  });

  describe('public values', function () {
    it('avatarTokenAddress', async function () {
      const avatarTokenAddress = await this.l2.sale.avatarTokenAddress();
      const avatarContract = await deployments.get('PolygonAvatar');
      expect(avatarTokenAddress).to.be.equal(avatarContract.address);
    });
    it('sandTokenAddress', async function () {
      const sandTokenAddress = await this.l2.sale.sandTokenAddress();
      const sandContract = await deployments.get('PolygonSand');
      expect(sandTokenAddress).to.be.equal(sandContract.address);
    });
  });
});
