import {setupL2EstateAndLand} from './fixtures';
import {expect} from '../chai-setup';

describe('Difference on L2 Estate test', function () {
  it('roles', async function () {
    const {
      other,
      landContractAsOther,
      estateContractAsOther,
      estateTunnel,
      mintQuad,
      createEstate,
    } = await setupL2EstateAndLand();
    expect(1).to.be.equal(1);
  });
});
