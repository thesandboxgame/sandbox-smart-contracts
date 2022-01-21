import {expect} from '../../chai-setup';
import {toWei} from '../../utils';
import {setupLandOwnersSandRewardPool} from './fixtures/sandRewardPool.fixture';

describe('LandOwnersSandRewardPool', function () {
  // TODO: when we have L2 lands
  // eslint-disable-next-line mocha/no-skipped-tests
  it.skip('users with land should be able to stake', async function () {
    const {
      other,
      sandAsOther,
      contractAsOther,
    } = await setupLandOwnersSandRewardPool();
    const cant = toWei(1);
    await sandAsOther.approve(contractAsOther.address, cant);
    await contractAsOther.balanceOf(other).to.be.equal(0);
    await contractAsOther.stake(cant);
    await contractAsOther.balanceOf(other).to.be.equal(cant);
  });
  it('users without land should revert', async function () {
    const {
      sandAsOther,
      contractAsOther,
    } = await setupLandOwnersSandRewardPool();
    const cant = toWei(1);
    await sandAsOther.approve(contractAsOther.address, cant);
    await expect(contractAsOther.stake(cant)).to.be.revertedWith(
      'not enough contributions'
    );
  });
});
