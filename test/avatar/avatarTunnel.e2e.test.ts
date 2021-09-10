import hre from 'hardhat';
import {expect} from 'chai';
import {getAvatarContracts} from '../common/fixtures/avatar';

describe('@skip-on-coverage @e2e @l1 AvatarTunnel', function () {
  describe('roles', function () {
    before(async function () {
      const {l1, l2, buyer} = await getAvatarContracts(
        hre.companionNetworks['l1'] ? hre.companionNetworks['l1'] : hre,
        hre.companionNetworks['l2'] ? hre.companionNetworks['l2'] : hre
      );
      this.l1 = l1;
      this.l2 = l2;
      this.buyer = buyer;
    });
    it('owner', async function () {
      expect(await this.l1.avatarTunnel.owner()).to.be.equal(this.l1.deployer);
    });
    it('checkpointManager', async function () {
      const checkpointManager = await this.l1.avatarTunnel.checkpointManager();
      expect(this.l1.checkPointManager.address).to.be.equal(checkpointManager);
    });
    it('fxRoot', async function () {
      const fxRoot = await this.l1.avatarTunnel.fxRoot();
      expect(this.l1.fxRoot.address).to.be.equal(fxRoot);
    });
    it('fxChildTunnel', async function () {
      const fxChildTunnel = await this.l1.avatarTunnel.fxChildTunnel();
      expect(this.l2.avatarTunnel.address).to.be.equal(fxChildTunnel);
    });
    it('rootAvatarToken', async function () {
      const rootAvatarToken = await this.l1.avatarTunnel.rootAvatarToken();
      expect(this.l1.avatar.address).to.be.equal(rootAvatarToken);
    });
    it('trusted forwarder', async function () {
      expect(await this.l1.avatar.getTrustedForwarder()).to.be.equal(
        this.l1.trustedForwarder.address
      );
    });
  });
});
