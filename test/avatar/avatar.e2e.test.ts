import hre from 'hardhat';
import {expect} from 'chai';
import {getAvatarContracts} from '../common/fixtures/avatar';

describe('@skip-on-coverage @e2e @l1 Avatar', function () {
  describe('roles', function () {
    before(async function () {
      const {l1, buyer} = await getAvatarContracts(
        hre.companionNetworks['l1'] ? hre.companionNetworks['l1'] : hre,
        hre.companionNetworks['l2'] ? hre.companionNetworks['l2'] : hre
      );
      this.l1 = l1;
      this.buyer = buyer;
    });
    it('admin', async function () {
      const defaultAdminRole = await this.l1.avatar.DEFAULT_ADMIN_ROLE();
      expect(await this.l1.avatar.hasRole(defaultAdminRole, this.l1.sandAdmin))
        .to.be.true;
    });
    it('minter', async function () {
      const minterRole = await this.l1.avatar.MINTER_ROLE();
      expect(
        await this.l1.avatar.hasRole(minterRole, this.l1.avatarTunnel.address)
      ).to.be.true;
    });

    it('trusted forwarder', async function () {
      expect(await this.l1.avatar.getTrustedForwarder()).to.be.equal(
        this.l1.trustedForwarder.address
      );
    });
  });
});
