import {expect} from '../chai-setup';
import {setupMapTest} from './fixtures';
import {BigNumber, Contract} from 'ethers';

// eslint-disable-next-line @typescript-eslint/no-empty-function,@typescript-eslint/no-unused-vars
// const log = console.log;
//
// const eqTiles = (arr1: boolean[][], arr2: boolean[][]) =>
//   arr1.length == arr2.length &&
//   arr1.every(
//     (r, i) => r.length === arr2[i].length && r.every((s, j) => s === arr2[i][j])
//   );

async function floodTest(
  tester: Contract,
  isAdjacentTest: (isAdjacent: boolean) => void
): Promise<void> {
  // let spot = await tester.floodStepWithSpot(0);
  // // let j = 0;
  // while (!spot.done) {
  //   spot = await tester.floodStep(0, spot.next);
  //   log(
  //     'Gas estimate:',
  //     BigNumber.from(await tester.estimateGas.isAdjacent(0)).toString()
  //   );
  //   // console.log('------------------------------------', j++);
  //   // for (let i = 0; i < spot.next.length; i++) {
  //   //   console.log(i);
  //   //   printTile(tileToArray(spot.next[i].data));
  //   // }
  // }
  // const len = BigNumber.from(await tester.length(0)).toNumber();
  // let adj = true;
  // for (let i = 0; i < len; i++) {
  //   const orig = await tester.at(0, i);
  //   const floodTile = tileToArray(spot.next[i].data);
  //   const origTile = tileToArray(orig.tile.data);
  //   adj = adj && eqTiles(floodTile, origTile);
  // }
  // isAdjacentTest(adj);
  isAdjacentTest(await tester.isAdjacent(0));
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
    it('four full tiles', async function () {
      const {tester} = await setupMapTest();
      await tester.setQuad(0, 0, 0, 24);
      await tester.setQuad(0, 0, 24, 24);
      await tester.setQuad(0, 24, 0, 24);
      await tester.setQuad(0, 24, 24, 24);
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

  describe('isQuadAdjacent', function () {
    it('four full tiles', async function () {
      const {tester} = await setupMapTest();
      const totalGas = BigNumber.from(0);

      async function pushAndSet(x: number, y: number, size: number) {
        totalGas.add(await tester.estimateGas.isQuadAdjacent(0, x, y, size));
        expect(await tester.isQuadAdjacent(0, x, y, size)).to.be.true;
        await tester.setQuad(0, x, y, size);
      }

      await pushAndSet(0, 0, 24);
      await pushAndSet(0, 24, 24);
      await pushAndSet(24, 0, 24);
      await pushAndSet(24, 24, 24);
    });
    it('add 24x24 one by one', async function () {
      const {tester} = await setupMapTest();
      const totalGas = BigNumber.from(0);
      for (let x = 0; x < 24; x++) {
        for (let y = 0; y < 24; y++) {
          totalGas.add(await tester.estimateGas.isQuadAdjacent(0, x, y, 1));
          expect(await tester.isQuadAdjacent(0, x, y, 1)).to.be.true;
          await tester.setQuad(0, x, y, 1);
        }
      }
    });
    it('adjacent pixels', async function () {
      const {tester} = await setupMapTest();
      expect(await tester.isQuadAdjacent(0, 123, 123, 1)).to.be.true;
      await tester.setQuad(0, 123, 123, 1);

      // left
      expect(await tester.isQuadAdjacent(0, 122, 123, 1)).to.be.true;
      // up
      expect(await tester.isQuadAdjacent(0, 123, 122, 1)).to.be.true;
      // right
      expect(await tester.isQuadAdjacent(0, 124, 123, 1)).to.be.true;
      // down
      expect(await tester.isQuadAdjacent(0, 123, 124, 1)).to.be.true;

      expect(await tester.isQuadAdjacent(0, 0, 0, 1)).to.be.false;
      expect(await tester.isQuadAdjacent(0, 122, 122, 1)).to.be.false;
      expect(await tester.isQuadAdjacent(0, 124, 124, 1)).to.be.false;
      expect(await tester.isQuadAdjacent(0, 122, 124, 1)).to.be.false;
      expect(await tester.isQuadAdjacent(0, 124, 122, 1)).to.be.false;
    });
  });
  describe('@skip-on-coverage gas consumption', function () {
    describe('adjacent', function () {
      it('some square in the center', async function () {
        const {tester} = await setupMapTest();
        await tester.setQuad(0, 12, 12, 6);
        expect(
          BigNumber.from(await tester.estimateGas.isAdjacent(0))
        ).to.be.lte(118522);
      });
      it('a square over two tiles', async function () {
        const {tester} = await setupMapTest();
        await tester.setQuad(0, 0, 12, 12);
        await tester.setQuad(0, 0, 24, 12);
        expect(
          BigNumber.from(await tester.estimateGas.isAdjacent(0))
        ).to.be.lte(481577);
      });
      it('a square over four tiles', async function () {
        const {tester} = await setupMapTest();
        await tester.setQuad(0, 12, 12, 12);
        await tester.setQuad(0, 12, 24, 12);
        await tester.setQuad(0, 24, 12, 12);
        await tester.setQuad(0, 24, 24, 12);
        expect(
          BigNumber.from(await tester.estimateGas.isAdjacent(0))
        ).to.be.lte(1247425);
      });
      it('four full tiles', async function () {
        const {tester} = await setupMapTest();
        await tester.setQuad(0, 0, 0, 24);
        await tester.setQuad(0, 0, 24, 24);
        await tester.setQuad(0, 24, 0, 24);
        await tester.setQuad(0, 24, 24, 24);
        expect(
          BigNumber.from(await tester.estimateGas.isAdjacent(0))
        ).to.be.lte(2298357);
      });
    });
    describe('not adjacent', function () {
      it('two squares in the same tile', async function () {
        const {tester} = await setupMapTest();
        await tester.setQuad(0, 6, 6, 6);
        await tester.setQuad(0, 18, 18, 6);
        expect(
          BigNumber.from(await tester.estimateGas.isAdjacent(0))
        ).to.be.lte(127511);
      });
      it('two squares in two different tiles', async function () {
        const {tester} = await setupMapTest();
        await tester.setQuad(0, 12, 12, 6);
        await tester.setQuad(0, 36, 36, 6);
        expect(
          BigNumber.from(await tester.estimateGas.isAdjacent(0))
        ).to.be.lte(145443);
      });
    });

    describe('isQuadAdjacent', function () {
      it('four full tiles', async function () {
        const {tester} = await setupMapTest();
        const totalGas = BigNumber.from(0);

        async function pushAndSet(x: number, y: number, size: number) {
          totalGas.add(await tester.estimateGas.isQuadAdjacent(0, x, y, size));
          await tester.setQuad(0, x, y, size);
        }

        await pushAndSet(0, 0, 24);
        await pushAndSet(0, 24, 24);
        await pushAndSet(24, 0, 24);
        await pushAndSet(24, 24, 24);
        expect(totalGas).to.be.lte(185883);
      });
      it('add 24x24 one by one', async function () {
        const {tester} = await setupMapTest();
        const totalGas = BigNumber.from(0);
        for (let x = 0; x < 24; x++) {
          for (let y = 0; y < 24; y++) {
            totalGas.add(await tester.estimateGas.isQuadAdjacent(0, x, y, 1));
            await tester.setQuad(0, x, y, 1);
          }
        }
        expect(totalGas).to.be.lte(23019530);
      });
    });
  });
});
