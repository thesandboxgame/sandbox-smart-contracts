import {Fixtures, setupFixtures} from './fixtures';
import {expect} from '../chai-setup';

describe('ChildEstateTokenV1.sol', function () {
  let fixtures: Fixtures;
  beforeEach(async function () {
    fixtures = await setupFixtures();
  });
  it('createFromQuad, it will always fail because minter is never set', async function () {
    await expect(
      fixtures.deployer.childEstateTokenV1.createFromQuad(
        fixtures.others[0],
        fixtures.others[1],
        100,
        100,
        100
      )
    ).to.be.revertedWith('not _check_authorized');
  });
  it('addQuad, it will always fail because minter is never set', async function () {
    await expect(
      fixtures.deployer.childEstateTokenV1.addQuad(
        fixtures.others[0],
        100,
        100,
        100,
        100
      )
    ).to.be.revertedWith('not _check_authorized');
  });
  it('createFromMultipleLands, it will always fail because minter is never set', async function () {
    await expect(
      fixtures.deployer.childEstateTokenV1.createFromMultipleLands(
        fixtures.others[0],
        fixtures.others[1],
        [1, 2, 3],
        [1, 2, 3]
      )
    ).to.be.revertedWith('not _check_authorized');
  });
  it('addMultipleLands, it will always fail because minter is never set', async function () {
    await expect(
      fixtures.deployer.childEstateTokenV1.addMultipleLands(
        fixtures.others[0],
        fixtures.others[1],
        [1, 2, 3],
        [1, 2, 3]
      )
    ).to.be.revertedWith('not _check_authorized');
  });
  it('createFromMultipleQuads, it will always fail because minter is never set', async function () {
    await expect(
      fixtures.deployer.childEstateTokenV1.createFromMultipleQuads(
        fixtures.others[0],
        fixtures.others[1],
        [1, 2, 3],
        [1, 2, 3],
        [1, 2, 3],
        [1, 2, 3]
      )
    ).to.be.revertedWith('not _check_authorized');
  });
  it('addMultipleQuads, it will always fail because minter is never set', async function () {
    await expect(
      fixtures.deployer.childEstateTokenV1.addMultipleQuads(
        fixtures.others[0],
        fixtures.others[1],
        [1, 2, 3],
        [1, 2, 3],
        [1, 2, 3],
        [1, 2, 3]
      )
    ).to.be.revertedWith('not _check_authorized');
  });
  it('destroy, it will always fail because minter is never set', async function () {
    await expect(
      fixtures.deployer.childEstateTokenV1.destroy(fixtures.others[0], 1)
    ).to.be.revertedWith('not _check_authorized');
  });
  it('transferFromDestroyedEstate, it will always fail because minter is never set', async function () {
    await expect(
      fixtures.deployer.childEstateTokenV1.transferFromDestroyedEstate(
        fixtures.others[0],
        fixtures.others[1],
        1
      )
    ).to.be.revertedWith('not _check_authorized');
  });
  it('tokenURI, it will always fail because minter is never set', async function () {
    await expect(
      fixtures.deployer.childEstateTokenV1.tokenURI(1)
    ).to.be.revertedWith('BURNED_OR_NEVER_MINTED');
  });
});
