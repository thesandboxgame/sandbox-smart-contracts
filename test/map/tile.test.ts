import {expect} from '../chai-setup';
import {
  getEmptyTile,
  printTile,
  setupTileLibTest,
  tileToArray,
} from './fixtures';

describe('TileLib main', function () {
  // eslint-disable-next-line mocha/no-skipped-tests
  it.skip('Some Tile', async function () {
    const tester = await setupTileLibTest();
    await tester.setQuad(0, 0, 0, 1);
    await tester.setQuad(0, 23, 23, 1);
    await tester.setQuad(0, 3, 0, 3);
    await tester.setQuad(0, 12, 6, 6);
    await tester.clearQuad(0, 15, 9, 3);
    const tile = await tester.getTile(0);
    const jsTile = tileToArray(tile.data);
    printTile(jsTile);
  });

  it('union', async function () {
    const tester = await setupTileLibTest();
    const tests = [
      [3, 0, 3],
      [12, 6, 6],
      [1, 1, 1],
      [23, 23, 1],
    ];
    // 0
    for (const t of tests) {
      await tester.setQuad(0, t[0], t[1], t[2]);
    }
    const tile = await tester.getTile(0);
    // a lot of tiles to merge
    const idxs = [];
    for (let idx = 0; idx < tests.length; idx++) {
      const t = tests[idx];
      await tester.setQuad(idx + 1, t[0], t[1], t[2]);
      idxs.push(idx + 1);
    }
    const outIdx = 29;
    await tester.union(idxs, outIdx);
    const union = await tester.getTile(outIdx);
    expect(union).to.be.eql(tile);
    expect(await tester.isEqual(outIdx, 0)).to.be.true;
  });

  it('intersection', async function () {
    const tester = await setupTileLibTest();
    //const tests = [[12, 12, 1], [12, 12, 3], [12, 12, 6], [12, 12, 12], [0, 0, 24]]
    const tests = [
      [12, 12, 1],
      [12, 12, 3],
    ];

    const idxs = [];
    for (let idx = 0; idx < tests.length; idx++) {
      const t = tests[idx];
      await tester.setQuad(idx, t[0], t[1], t[2]);
      idxs.push(idx);
    }
    const outIdx = 29;
    await tester.intersection(idxs, outIdx);
    const intersection = tileToArray((await tester.getTile(outIdx)).data);
    const tile = getEmptyTile();
    tile[12][12] = true;
    expect(intersection).to.be.eql(tile);
  });

  it('contains', async function () {
    const tester = await setupTileLibTest();
    const tests = [
      [3, 0, 3],
      [12, 6, 6],
      [1, 1, 1],
      [23, 23, 1],
    ];
    // 0
    for (const t of tests) {
      await tester.setQuad(0, t[0], t[1], t[2]);
      expect(await tester.containQuad(0, t[0], t[1], t[2])).to.be.true;
    }
    for (const t of tests) {
      expect(await tester.containQuad(0, t[0], t[1], t[2])).to.be.true;
    }
    expect(await tester.containQuad(0, 2, 2, 1)).to.be.false;
    expect(await tester.containQuad(0, 22, 22, 1)).to.be.false;
    expect(await tester.containQuad(0, 21, 21, 3)).to.be.false;
    // 1
    for (const t of tests) {
      await tester.clearQuad(1, 0, 0, 24);
      await tester.setQuad(1, t[0], t[1], t[2]);
      expect(await tester.containQuad(1, t[0], t[1], t[2])).to.be.true;
      expect(await tester.containQuad(1, 2, 2, 1)).to.be.false;
      expect(await tester.containQuad(1, 22, 22, 1)).to.be.false;
      expect(await tester.containQuad(1, 21, 21, 3)).to.be.false;
    }
  });

  it('findAPixel', async function () {
    const tester = await setupTileLibTest();
    for (let x = 0; x < 24; x++) {
      for (let y = 0; y < 24; y++) {
        await tester.clearQuad(0, 0, 0, 24);
        await tester.setQuad(0, x, y, 1);
        await tester.setFindAPixel(0, 1);
        expect(await tester.isEqual(0, 1)).to.be.true;
      }
    }
  });
  // TODO: Add more tests, specially for clear, grid like things, etc...
});
