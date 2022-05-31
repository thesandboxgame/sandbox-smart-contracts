import {expect} from '../chai-setup';
import {
  drawExtendedTile,
  extendedTileToArray,
  printTile,
  setupTileLibTest,
} from './fixtures';

describe('TileLib grow and flood', function () {
  it('a dot', async function () {
    const tester = await setupTileLibTest();
    await tester.setQuad(0, 12, 12, 1);
    const tile = await tester.grow(0);

    const result = drawExtendedTile([
      [36, 19, 1, 3],
      [35, 20, 3, 1],
    ]);
    expect(extendedTileToArray(tile)).to.be.eql(result);
  });
  it('some square in the center', async function () {
    const tester = await setupTileLibTest();
    await tester.setQuad(0, 12, 12, 6);
    const tile = await tester.grow(0);
    const result = drawExtendedTile([
      [35, 20, 8, 6],
      [36, 19, 6, 8],
    ]);
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
      [24, 7, 24, 3],
      [24, 30, 24, 3],
      [23, 8, 3, 24],
      [46, 8, 3, 24],
    ]);
    expect(extendedTileToArray(tile)).to.be.eql(result);
  });

  it('top border', async function () {
    const tester = await setupTileLibTest();
    for (let i = 0; i < 24; i++) {
      await tester.setQuad(0, i, 0, 1);
    }
    const tile = await tester.grow(0);
    const result = drawExtendedTile([[24, 7, 24, 3]]);
    result[8][23] = true;
    result[8][48] = true;
    expect(extendedTileToArray(tile)).to.be.eql(result);
  });

  it('down border', async function () {
    const tester = await setupTileLibTest();
    for (let i = 0; i < 24; i++) {
      await tester.setQuad(0, i, 23, 1);
    }
    const tile = await tester.grow(0);
    const result = drawExtendedTile([[24, 30, 24, 3]]);
    result[31][23] = true;
    result[31][48] = true;
    expect(extendedTileToArray(tile)).to.be.eql(result);
  });

  it('left border', async function () {
    const tester = await setupTileLibTest();
    for (let i = 0; i < 24; i++) {
      await tester.setQuad(0, 0, i, 1);
    }
    const tile = await tester.grow(0);
    const result = drawExtendedTile([[23, 8, 3, 24]]);
    result[7][24] = true;
    result[32][24] = true;
    expect(extendedTileToArray(tile)).to.be.eql(result);
  });

  it('right border', async function () {
    const tester = await setupTileLibTest();
    for (let i = 0; i < 24; i++) {
      await tester.setQuad(0, 23, i, 1);
    }
    const tile = await tester.grow(0);
    const result = drawExtendedTile([[46, 8, 3, 24]]);
    result[7][47] = true;
    result[32][47] = true;
    expect(extendedTileToArray(tile)).to.be.eql(result);
  });

  it('a full square', async function () {
    const tester = await setupTileLibTest();
    await tester.setQuad(0, 0, 0, 24);
    const tile = await tester.grow(0);
    const result = drawExtendedTile([
      [23, 8, 26, 24],
      [24, 7, 24, 26],
    ]);
    expect(extendedTileToArray(tile)).to.be.eql(result);
  });

  it('two dots in the division of the tile', async function () {
    const tester = await setupTileLibTest();
    await tester.setQuad(0, 12, 0, 1);
    await tester.setQuad(0, 12, 23, 1);
    const tile = await tester.grow(0);
    const result = drawExtendedTile([
      [36, 7, 1, 3],
      [35, 8, 3, 1],
      [36, 30, 1, 3],
      [35, 31, 3, 1],
    ]);
    expect(extendedTileToArray(tile)).to.be.eql(result);
  });

  it('four corners', async function () {
    const tester = await setupTileLibTest();
    await tester.setQuad(0, 0, 0, 1);
    await tester.setQuad(0, 0, 23, 1);
    await tester.setQuad(0, 23, 0, 1);
    await tester.setQuad(0, 23, 23, 1);
    const tile = await tester.grow(0);
    const result = drawExtendedTile([
      [24, 7, 1, 3],
      [23, 8, 3, 1],
      [47, 7, 1, 3],
      [46, 8, 3, 1],
      [24, 30, 1, 3],
      [23, 31, 3, 1],
      [47, 30, 1, 3],
      [46, 31, 3, 1],
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
      spot = await tester.floodStep(spot.next.middle);
    }
  });
});
