import {getContract, withSnapshot} from '../../utils/testUtils';
import {expect} from 'chai';

const setupTest = withSnapshot(['FaucetsERC1155'], async (hre) => {
  const namedAccount = await hre.getNamedAccounts();
  const contract = await getContract(hre, 'FaucetsERC1155');
  return {
    contract,
    namedAccount,
  };
});

describe('FaucetsERC1155', function () {
  describe('check owner', function () {
    it('owner', async function () {
      const fixtures = await setupTest();
      expect(await fixtures.contract.owner()).to.be.equal(
        fixtures.namedAccount.catalystMinter
      );
    });
  });
});
