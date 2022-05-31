import {expect} from '../chai-setup';
import {setupMapTest, tileToArray} from './fixtures';
import {BigNumber, Contract} from 'ethers';

const eqTiles = (arr1: boolean[][], arr2: boolean[][]) =>
  arr1.length == arr2.length &&
  arr1.every(
    (r, i) => r.length === arr2[i].length && r.every((s, j) => s === arr2[i][j])
  );

async function floodTest(
  tester: Contract,
  isAdjacentTest: (isAdjacent: boolean) => void
): Promise<void> {
  let spot = await tester.floodStepWithSpot(0);
  // let j = 0;
  while (!spot.done) {
    spot = await tester.floodStep(0, spot.next);
    // console.log('------------------------------------', j++);
    // for (let i = 0; i < spot.next.length; i++) {
    //   console.log(i);
    //   printTile(tileToArray(spot.next[i].data));
    // }
  }
  const len = BigNumber.from(await tester.length(0)).toNumber();
  let adj = true;
  for (let i = 0; i < len; i++) {
    const orig = await tester.at(0, i);
    const floodTile = tileToArray(spot.next[i].data);
    const origTile = tileToArray(orig.tile.data);
    adj = adj && eqTiles(floodTile, origTile);
  }
  isAdjacentTest(adj);
  isAdjacentTest(await tester.isAdjacent(0));
  // console.log(
  //   'Gas estimate:',
  //   BigNumber.from(await tester.estimateGas.isAdjacent(0)).toString()
  // );
}

async function adjacentTest(tester: Contract) {
  await floodTest(tester, (isAdjacent) => expect(isAdjacent).to.be.true);
}

async function notAdjacentTest(tester: Contract) {
  await floodTest(tester, (isAdjacent) => expect(isAdjacent).to.be.false);
}

describe('MapLib flood', function () {
  describe('adjacent', function () {
    it('some square in the center', async function () {
      const {tester} = await setupMapTest();
      await tester.setQuad(0, 12, 12, 6);
      await adjacentTest(tester);
    });
    it('a square over two tiles', async function () {
      const {tester} = await setupMapTest();
      await tester.setQuad(0, 0, 12, 12);
      await tester.setQuad(0, 0, 24, 12);
      await adjacentTest(tester);
    });
    it('a square over four tiles', async function () {
      const {tester} = await setupMapTest();
      await tester.setQuad(0, 12, 12, 12);
      await tester.setQuad(0, 12, 24, 12);
      await tester.setQuad(0, 24, 12, 12);
      await tester.setQuad(0, 24, 24, 12);
      await adjacentTest(tester);
    });
  });
  describe('not adjacent', function () {
    it('two squares in the same tile', async function () {
      const {tester} = await setupMapTest();
      await tester.setQuad(0, 6, 6, 6);
      await tester.setQuad(0, 18, 18, 6);
      await notAdjacentTest(tester);
    });
    it('two squares in two different tiles', async function () {
      const {tester} = await setupMapTest();
      await tester.setQuad(0, 12, 12, 6);
      await tester.setQuad(0, 36, 36, 6);
      await notAdjacentTest(tester);
    });
  });
});
