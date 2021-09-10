import hre from 'hardhat';
import {expect} from 'chai';
import {getAvatarContracts} from '../../common/fixtures/avatar';

describe('@skip-on-coverage @e2e @l2 polygon AvatarTunnel', function () {
  before(async function () {
    const {l1, l2, buyer} = await getAvatarContracts(
      hre.companionNetworks['l1'] ? hre.companionNetworks['l1'] : hre,
      hre.companionNetworks['l2'] ? hre.companionNetworks['l2'] : hre
    );
    this.l1 = l1;
    this.l2 = l2;
    this.buyer = buyer;
  });
  describe('roles', function () {
    it('owner', async function () {
      expect(await this.l2.avatarTunnel.owner()).to.be.equal(this.l2.deployer);
    });
    it('fxChild', async function () {
      const fxChild = await this.l2.avatarTunnel.fxChild();
      expect(this.l2.fxChild.address).to.be.equal(fxChild);
    });
    it('fxRootTunnel', async function () {
      const fxRootTunnel = await this.l2.avatarTunnel.fxRootTunnel();
      expect(this.l1.avatarTunnel.address).to.be.equal(fxRootTunnel);
    });
    it('childAvatarToken', async function () {
      const childAvatarToken = await this.l2.avatarTunnel.childAvatarToken();
      expect(this.l2.avatar.address).to.be.equal(childAvatarToken);
    });
    it('trusted forwarder', async function () {
      expect(await this.l2.avatar.getTrustedForwarder()).to.be.equal(
        this.l2.trustedForwarder.address
      );
    });
  });
});
