import {expect} from '../chai-setup';
import {
  drawTile,
  getEmptyTile,
  resultToArray,
  setRectangle,
  setupTileLibTest,
} from './fixtures';
import {BigNumber, Contract} from 'ethers';

async function setTileQuads(tester: Contract, tile: boolean[][]) {
  for (let y = 0; y < tile.length; y++) {
    for (let x = 0; x < tile[0].length; x++) {
      if (tile[y][x]) {
        await tester.setQuad(0, x, y, 1);
      }
    }
  }
}

describe('TileLib tester flood', function () {
  describe('adjacent', function () {
    it('a line', async function () {
      const tester = await setupTileLibTest();
      await setTileQuads(
        tester,
        resultToArray(['O X X O', 'O X X O', 'O X X O'])
      );
      expect(await tester.isAdjacent(0)).to.be.true;
      console.log(
        'Gas estimate:',
        BigNumber.from(await tester.estimateGas.isAdjacent(0)).toString()
      );
    });
    it('a square', async function () {
      const tester = await setupTileLibTest();
      const tile = drawTile([[3, 3, 10, 10]], getEmptyTile);
      await setTileQuads(tester, tile);
      expect(await tester.isAdjacent(0)).to.be.true;
      console.log(
        'Gas estimate:',
        BigNumber.from(await tester.estimateGas.isAdjacent(0)).toString()
      );
    });
    it('a square with a hole', async function () {
      const tester = await setupTileLibTest();
      const tile = setRectangle(
        drawTile([[3, 3, 10, 10]], getEmptyTile),
        5,
        5,
        3,
        3,
        false
      );
      await setTileQuads(tester, tile);
      expect(await tester.isAdjacent(0)).to.be.true;
      console.log(
        'Gas estimate:',
        BigNumber.from(await tester.estimateGas.isAdjacent(0)).toString()
      );
    });
  });
  describe('not adjacent', function () {
    it('truncated line', async function () {
      const tester = await setupTileLibTest();
      await setTileQuads(
        tester,
        resultToArray(['O X X O', 'O O O O', 'O X X O', 'O X X O'])
      );
      expect(await tester.isAdjacent(0)).to.be.false;
      console.log(
        'Gas estimate:',
        BigNumber.from(await tester.estimateGas.isAdjacent(0)).toString()
      );
    });
    it('two squares', async function () {
      const tester = await setupTileLibTest();
      const tile = drawTile(
        [
          [3, 3, 2, 2],
          [10, 10, 2, 2],
        ],
        getEmptyTile
      );
      await setTileQuads(tester, tile);
      expect(await tester.isAdjacent(0)).to.be.false;
      console.log(
        'Gas estimate:',
        BigNumber.from(await tester.estimateGas.isAdjacent(0)).toString()
      );
    });
  });
});
