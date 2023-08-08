import {getContract, withSnapshot} from '../../utils/testUtils';
import {expect} from 'chai';

const setupTest = withSnapshot(['SignedMultiGiveaway'], async (hre) => {
  const namedAccount = await hre.getNamedAccounts();
  const contract = await getContract(hre, 'SignedMultiGiveaway');
  return {
    contract,
    namedAccount,
  };
});

describe('SignedMultiGiveaway', function () {
  describe('check roles', function () {
    it('admin', async function () {
      const fixtures = await setupTest();
      const defaultAdminRole = await fixtures.contract.DEFAULT_ADMIN_ROLE();
      expect(
        await fixtures.contract.getRoleMemberCount(defaultAdminRole)
      ).to.be.equal(1);
      expect(
        await fixtures.contract.hasRole(
          defaultAdminRole,
          fixtures.namedAccount.sandAdmin
        )
      ).to.be.true;
    });

    it('signer', async function () {
      const fixtures = await setupTest();
      const signerRole = await fixtures.contract.SIGNER_ROLE();
      expect(
        await fixtures.contract.getRoleMemberCount(signerRole)
      ).to.be.equal(1);
      expect(
        await fixtures.contract.hasRole(
          signerRole,
          fixtures.namedAccount.backendCashbackWallet
        )
      ).to.be.true;
    });
  });
});
