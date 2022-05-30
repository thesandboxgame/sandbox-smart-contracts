import {expect} from '../chai-setup';
import {
  drawExtendedTile,
  extendedTileToArray,
  getEmptyExtendedTile,
  printTile,
  setRectangle,
  setupTileLibTest,
} from './fixtures';

describe('TileLib grow and flood', function () {
  it('some square in the center', async function () {
    const tester = await setupTileLibTest();
    await tester.setQuad(0, 12, 12, 6);
    const tile = await tester.grow(0);
    const result = setRectangle(getEmptyExtendedTile(), 24 + 11, 8 + 11, 8, 8);
    expect(extendedTileToArray(tile)).to.be.eql(result);
  });
  it('square border', async function () {
    const tester = await setupTileLibTest();
    for (let i = 0; i < 24; i++) {
      await tester.setQuad(0, i, 0, 1);
      await tester.setQuad(0, 0, i, 1);
      await tester.setQuad(0, i, 23, 1);
      await tester.setQuad(0, 23, i, 1);
    }
    const tile = await tester.grow(0);
    const result = drawExtendedTile([
      [24 - 1, 8 - 1, 3, 26],
      [24 - 1, 8 - 1, 26, 3],
      [48 - 2, 8 - 1, 3, 26],
      [24 - 1, 24 + 8 - 2, 26, 3],
    ]);
    expect(extendedTileToArray(tile)).to.be.eql(result);
  });

  it('top border', async function () {
    const tester = await setupTileLibTest();
    for (let i = 0; i < 24; i++) {
      await tester.setQuad(0, i, 0, 1);
    }
    const tile = await tester.grow(0);
    const result = drawExtendedTile([[24 - 1, 8 - 1, 26, 3]]);
    expect(extendedTileToArray(tile)).to.be.eql(result);
  });

  it('down border', async function () {
    const tester = await setupTileLibTest();
    for (let i = 0; i < 24; i++) {
      await tester.setQuad(0, i, 23, 1);
    }
    const tile = await tester.grow(0);
    const result = drawExtendedTile([[24 - 1, 24 + 8 - 2, 26, 3]]);
    expect(extendedTileToArray(tile)).to.be.eql(result);
  });

  it('left border', async function () {
    const tester = await setupTileLibTest();
    for (let i = 0; i < 24; i++) {
      await tester.setQuad(0, 0, i, 1);
    }
    const tile = await tester.grow(0);
    const result = drawExtendedTile([[24 - 1, 8 - 1, 3, 26]]);
    expect(extendedTileToArray(tile)).to.be.eql(result);
  });

  it('right border', async function () {
    const tester = await setupTileLibTest();
    for (let i = 0; i < 24; i++) {
      await tester.setQuad(0, 23, i, 1);
    }
    const tile = await tester.grow(0);
    const result = drawExtendedTile([[48 - 2, 8 - 1, 3, 26]]);
    expect(extendedTileToArray(tile)).to.be.eql(result);
  });

  it('a full square', async function () {
    const tester = await setupTileLibTest();
    await tester.setQuad(0, 0, 0, 24);
    const tile = await tester.grow(0);
    const result = drawExtendedTile([[24 - 1, 8 - 1, 26, 26]]);
    expect(extendedTileToArray(tile)).to.be.eql(result);
  });

  it('two dots in the division if the tile', async function () {
    const tester = await setupTileLibTest();
    await tester.setQuad(0, 12, 8, 1);
    await tester.setQuad(0, 12, 15, 1);
    const tile = await tester.grow(0);
    const result = drawExtendedTile([
      [24 + 11, 8 + 8 - 1, 3, 3],
      [24 + 11, 15 + 8 - 1, 3, 3],
    ]);
    expect(extendedTileToArray(tile)).to.be.eql(result);
  });

  // eslint-disable-next-line mocha/no-skipped-tests
  it.skip('flood test', async function () {
    const tester = await setupTileLibTest();
    await tester.setQuad(0, 12, 12, 1);
    let spot = await tester.findAPixel(0);
    for (let i = 0; i < 14; i++) {
      printTile(extendedTileToArray(spot.next));
      console.log('--------------------------->', i, 2 * i + 1);
      spot = await tester.floodStep(spot.next.center.middle);
    }
  });
});
