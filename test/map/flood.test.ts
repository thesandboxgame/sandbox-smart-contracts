import {expect} from '../chai-setup';
import {setupMapTest, tileToArray} from './fixtures';

describe('MapLib flood', function () {
  describe('find a pixel', function () {
    it('some square in the center', async function () {
      const {tester} = await setupMapTest();
      await tester.setQuad(0, 12, 12, 6);
      let spot = await tester.floodStepWithSpot(0);
      while (!spot.done) {
        spot = await tester.floodStep(0, spot.next);
      }
      const orig = await tester.at(0, 0);
      expect(tileToArray(spot.next[0].data)).to.be.eql(
        tileToArray(orig.tile.data)
      );
      expect(await tester.isAdjacent(0)).to.be.true;
    });
  });
});
