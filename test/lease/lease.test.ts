import {setupLease} from './fixtures';
import {expect} from '../chai-setup';
import {constants} from 'ethers';

const zeroAddress = constants.AddressZero;

describe('PolygonLease.sol', function () {
  it('owner can lease PolygonLand to themselves', async function () {
    const {owner, MockLandWithMint, tokenId, PolygonLease} = await setupLease();

    // Create (mint) a lease NFT for their PolygonLand
    await expect(
      owner.PolygonLease.create(
        MockLandWithMint.address,
        tokenId,
        owner.address,
        zeroAddress
      )
    ).to.not.be.reverted;

    expect(await PolygonLease.isLeased(MockLandWithMint.address, tokenId)).to.be
      .true;
    expect(
      await PolygonLease.currentUser(MockLandWithMint.address, tokenId)
    ).to.be.equal(owner.address);
  });
});
