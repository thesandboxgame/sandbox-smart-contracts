import {expect} from '../chai-setup';
import {
  getEmptyTile,
  printTile,
  setRectangle,
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
      expect(await tester.intersectQuad(idx, t[0], t[1], t[2])).to.be.true;
      idxs.push(idx);
    }
    const outIdx = 29;
    await tester.intersection(idxs, outIdx);
    for (let idx = 0; idx < tests.length; idx++) {
      expect(await tester.intersect(idx, outIdx)).to.be.true;
    }
    const intersection = tileToArray((await tester.getTile(outIdx)).data);
    const tile = getEmptyTile();
    tile[12][12] = true;
    expect(intersection).to.be.eql(tile);
  });
  it('addIfNotContain', async function () {
    const tester = await setupTileLibTest();
    await tester.setQuad(0, 3, 3, 3);
    const tile = tileToArray((await tester.getTile(0)).data);

    // Failure
    const [error, retError] = await tester.addIfNotContain(0, 4, 4);
    expect(error).to.be.false;
    expect(tile).to.be.eql(tileToArray(retError.data));

    // Success
    const [success, retSuccess] = await tester.addIfNotContain(0, 1, 1);
    expect(success).to.be.true;
    tile[1][1] = true;
    expect(tile).to.be.eql(tileToArray(retSuccess.data));
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
  describe('find a pixel', function () {
    it('line 0-7', async function () {
      const tester = await setupTileLibTest();
      await tester.setQuad(0, 3, 3, 3);
      const tile = setRectangle(3, 3, 1, 1);
      const ret = tileToArray((await tester.findAPixel(0)).data);
      expect(ret).to.be.eql(tile);
    });
    it('line 8-15', async function () {
      const tester = await setupTileLibTest();
      await tester.setQuad(0, 9, 9, 3);
      const tile = setRectangle(9, 9, 1, 1);
      const ret = tileToArray((await tester.findAPixel(0)).data);
      expect(ret).to.be.eql(tile);
    });
    it('line 16-23', async function () {
      const tester = await setupTileLibTest();
      await tester.setQuad(0, 18, 18, 3);
      const tile = setRectangle(18, 18, 1, 1);
      const ret = tileToArray((await tester.findAPixel(0)).data);
      expect(ret).to.be.eql(tile);
    });
    it('empty tile', async function () {
      const tester = await setupTileLibTest();
      const ret = tileToArray((await tester.findAPixel(0)).data);
      expect(ret).to.be.eql(getEmptyTile());
    });
  });

  describe('exceptions', function () {
    it('tile size must be limited to 24x24', async function () {
      const tester = await setupTileLibTest();
      await expect(tester.setQuad(0, 24, 24, 1)).to.revertedWith(
        'Invalid tile coordinates'
      );
      await expect(tester.clearQuad(0, 24, 24, 1)).to.revertedWith(
        'Invalid tile coordinates'
      );
      await expect(tester.containQuad(0, 24, 24, 1)).to.revertedWith(
        'Invalid tile coordinates'
      );
      await expect(tester.intersectQuad(0, 24, 24, 1)).to.revertedWith(
        'Invalid tile coordinates'
      );
      await expect(tester.containCoord(0, 24, 24)).to.revertedWith(
        'Invalid coordinates'
      );
      await expect(tester.addIfNotContain(0, 24, 24)).to.revertedWith(
        'Invalid coordinates'
      );
    });
    it('coords must be module size', async function () {
      const tester = await setupTileLibTest();
      await expect(tester.setQuad(0, 2, 2, 3)).to.revertedWith(
        'Invalid coordinates'
      );
      await expect(tester.clearQuad(0, 2, 2, 3)).to.revertedWith(
        'Invalid coordinates'
      );
      await expect(tester.containQuad(0, 2, 2, 3)).to.revertedWith(
        'Invalid coordinates'
      );
      await expect(tester.intersectQuad(0, 2, 2, 3)).to.revertedWith(
        'Invalid coordinates'
      );
    });
    it('mask size must be 1,3,6,12 or 24', async function () {
      const tester = await setupTileLibTest();
      await expect(tester.setQuad(0, 0, 0, 5)).to.revertedWith('invalid size');
      await expect(tester.setQuad(0, 0, 0, 25)).to.revertedWith('invalid size');
      await expect(tester.clearQuad(0, 0, 0, 5)).to.revertedWith(
        'invalid size'
      );
      await expect(tester.clearQuad(0, 0, 0, 25)).to.revertedWith(
        'invalid size'
      );
      await expect(tester.containQuad(0, 0, 0, 5)).to.revertedWith(
        'invalid size'
      );
      await expect(tester.containQuad(0, 0, 0, 25)).to.revertedWith(
        'invalid size'
      );
      await expect(tester.intersectQuad(0, 0, 0, 25)).to.revertedWith(
        'invalid size'
      );
    });
  });
});
