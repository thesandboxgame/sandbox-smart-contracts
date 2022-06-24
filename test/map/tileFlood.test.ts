import {expect} from '../chai-setup';
import {
  drawTile,
  getEmptyTile,
  resultToArray,
  setRectangle,
  setTileQuads,
  setupTileWithCoordsLibTest,
} from './fixtures';
import {Contract} from 'ethers';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function printGasEstimate(tester: Contract) {
  // console.log(
  //   'Gas estimate:',
  //   BigNumber.from(await tester.estimateGas.isAdjacent(0)).toString()
  // );
}

describe('TileLibWithCoord tester flood', function () {
  describe('adjacent', function () {
    it('a line', async function () {
      const tester = await setupTileWithCoordsLibTest();
      await setTileQuads(
        tester,
        resultToArray(['O X X O', 'O X X O', 'O X X O'])
      );
      expect(await tester.isAdjacent(0)).to.be.true;
      await printGasEstimate(tester);
    });
    it('a square', async function () {
      const tester = await setupTileWithCoordsLibTest();
      const tile = drawTile([[3, 3, 10, 10]], getEmptyTile);
      await setTileQuads(tester, tile);
      expect(await tester.isAdjacent(0)).to.be.true;
      await printGasEstimate(tester);
    });
    it('a square with a hole', async function () {
      const tester = await setupTileWithCoordsLibTest();
      const tile = setRectangle(5, 5, 3, 3, drawTile([[3, 3, 10, 10]]), false);
      await setTileQuads(tester, tile);
      expect(await tester.isAdjacent(0)).to.be.true;
      await printGasEstimate(tester);
    });
    it('two squares on a 4-connected component', async function () {
      const tester = await setupTileWithCoordsLibTest();
      const tile = drawTile(
        [
          [3, 3, 2, 2],
          [4, 5, 2, 2],
        ],
        getEmptyTile
      );
      await setTileQuads(tester, tile);
      expect(await tester.isAdjacent(0)).to.be.true;
      await printGasEstimate(tester);
    });
  });
  describe('not adjacent', function () {
    it('truncated line', async function () {
      const tester = await setupTileWithCoordsLibTest();
      await setTileQuads(
        tester,
        resultToArray(['O X X O', 'O O O O', 'O X X O', 'O X X O'])
      );
      expect(await tester.isAdjacent(0)).to.be.false;
      await printGasEstimate(tester);
    });

    it('two squares', async function () {
      const tester = await setupTileWithCoordsLibTest();
      const tile = drawTile(
        [
          [3, 3, 2, 2],
          [10, 10, 2, 2],
        ],
        getEmptyTile
      );
      await setTileQuads(tester, tile);
      expect(await tester.isAdjacent(0)).to.be.false;
      await printGasEstimate(tester);
    });
    it('two squares on a 8-connected component', async function () {
      const tester = await setupTileWithCoordsLibTest();
      const tile = drawTile(
        [
          [3, 3, 2, 2],
          [5, 5, 2, 2],
        ],
        getEmptyTile
      );
      await setTileQuads(tester, tile);
      expect(await tester.isAdjacent(0)).to.be.false;
      await printGasEstimate(tester);
    });
  });
});
