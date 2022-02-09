import {expect} from '../../chai-setup';
import {toWei} from '../../utils';
import {setupLandOwnersSandRewardPool} from './fixtures/sandRewardPool.fixture';

describe('LandOwnersSandRewardPool', function () {
  // TODO: when we have L2 lands
  // eslint-disable-next-line mocha/no-skipped-tests
  it('users with land should be able to stake', async function () {
    const {
      other,
      sandAsOther,
      contractAsOther,
      useMockInsteadOfL2Land,
    } = await setupLandOwnersSandRewardPool();
    const {mockLandWithMint} = await useMockInsteadOfL2Land();

    await mockLandWithMint.mintQuad(other, 1, 1, 1, '0x');
    const cant = toWei(1);
    await sandAsOther.approve(contractAsOther.address, cant);
    expect(await contractAsOther.balanceOf(other)).to.be.equal(0);
    await contractAsOther.stake(cant);
    expect(await contractAsOther.balanceOf(other)).to.be.equal(cant);
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
  it('if a user sells his land we can recompute the contribution', async function () {
    const {
      other,
      other2,
      sandAsOther,
      sandAsOther2,
      contractAsOther,
      contractAsOther2,
      useMockInsteadOfL2Land,
    } = await setupLandOwnersSandRewardPool();
    const {
      mockLandWithMint,
      mockLandWithMintAsOther,
    } = await useMockInsteadOfL2Land();
    const size = 1;
    const x = 1;
    const y = 1;
    const GRID_SIZE = 408;
    const id = x + y * GRID_SIZE;

    // Initial mint
    await mockLandWithMint.mintQuad(other, size, x, y, '0x');
    expect(await mockLandWithMint.balanceOf(other)).to.be.equal(1);
    expect(await mockLandWithMint.ownerOf(id)).to.be.equal(other);

    // stake
    const cant = toWei(1);
    await sandAsOther.approve(contractAsOther.address, cant);
    expect(await contractAsOther.balanceOf(other)).to.be.equal(0);
    await contractAsOther.stake(cant);
    expect(await contractAsOther.balanceOf(other)).to.be.equal(cant);

    // Sell the land
    await mockLandWithMintAsOther.transferQuad(other, other2, size, x, y, []);
    expect(await mockLandWithMint.balanceOf(other)).to.be.equal(0);
    expect(await mockLandWithMint.balanceOf(other2)).to.be.equal(1);
    expect(await mockLandWithMint.ownerOf(id)).to.be.equal(other2);

    // The contribution is still the same situation
    expect(await contractAsOther.balanceOf(other)).to.be.equal(cant);
    expect(await contractAsOther.contributionOf(other)).to.be.equal(cant);
    expect(await contractAsOther.balanceOf(other2)).to.be.equal(0);
    expect(await contractAsOther.contributionOf(other2)).to.be.equal(0);

    // Update contributions.
    await contractAsOther.computeContribution(other);
    expect(await contractAsOther.balanceOf(other)).to.be.equal(cant);
    expect(await contractAsOther.contributionOf(other)).to.be.equal(0);
    expect(await contractAsOther.balanceOf(other2)).to.be.equal(0);
    expect(await contractAsOther.contributionOf(other2)).to.be.equal(0);

    // other2 stakes
    // stake
    const cant2 = toWei(1);
    await sandAsOther2.approve(contractAsOther2.address, cant2);
    await contractAsOther2.stake(cant);
    expect(await contractAsOther.balanceOf(other2)).to.be.equal(cant);
    expect(await contractAsOther.contributionOf(other2)).to.be.equal(cant);
  });
});
