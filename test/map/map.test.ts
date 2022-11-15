import {expect} from '../chai-setup';
import {
  createTestMapQuads,
  drawTile,
  getEmptyTile,
  getEmptyTranslateResult,
  getFullTile,
  printMap,
  setRectangle,
  setTileQuads,
  setupMapTest,
  translateResultToArray,
} from './fixtures';
import {BigNumber} from 'ethers';

describe('MapLib main', function () {
  // eslint-disable-next-line mocha/no-skipped-tests
  it.skip('Some Map With Coords', async function () {
    const {tester, getMap} = await setupMapTest();
    // Create Test set
    const tests = createTestMapQuads(240, 240, 30, [1, 3, 6, 12]);
    // 0
    for (const t of tests) {
      await tester.setQuad(0, t[0], t[1], t[2]);
    }
    const map = await getMap(0);
    printMap(map);
    // Check each coord == Land
  });

  it('merge', async function () {
    const {tester, getMap} = await setupMapTest();
    // Create Test set
    const maps = [];
    for (let i = 0; i < 6; i++) {
      maps.push(createTestMapQuads(60, 60, 50, [1, 3, 6, 12]));
    }
    // 0
    for (const map of maps) {
      for (const t of map) {
        await tester.setQuad(0, t[0], t[1], t[2]);
      }
    }
    // merge
    const outIdx = 29;
    // 1 - 11
    for (let i = 0; i < maps.length; i++) {
      const map = maps[i];
      for (const t of map) {
        await tester.setQuad(i + 1, t[0], t[1], t[2]);
      }
      await tester.setMap(outIdx, i + 1);
      expect(await tester.containMap(outIdx, i + 1)).to.be.true;
    }
    expect(await getMap(0)).to.be.eql(await getMap(outIdx));
  });

  it('contain', async function () {
    const {tester} = await setupMapTest();
    // Create Test set
    const quads = createTestMapQuads(240, 240, 10, [1, 3, 6, 12]);
    for (const t of quads) {
      await tester.setQuad(0, t[0], t[1], t[2]);
      expect(await tester.containQuad(0, t[0], t[1], t[2])).to.be.true;
      for (let i = 0; i < t[2]; i++) {
        for (let j = 0; j < t[2]; j++) {
          expect(await tester.containCoord(0, t[0] + i, t[1] + j)).to.be.true;
        }
      }
    }
    const t = quads[0];
    await tester.setQuad(1, t[0], t[1], t[2]);
    expect(await tester.containMap(0, 1)).to.be.true;
    expect(await tester.containTiles(0, 1)).to.be.true;

    // tile set
    expect(await tester.containMap(10, 1)).to.be.false;
    await tester.setMapUsingTiles(10, 0);
    expect(await tester.containMap(10, 1)).to.be.true;
    await tester.clearMapUsingTiles(10, 0);
    expect(await tester.containMap(10, 1)).to.be.false;
  });

  it('clear map', async function () {
    const {tester, getMap} = await setupMapTest();
    const maps = [];
    for (let i = 0; i < 10; i++) {
      maps.push(createTestMapQuads(60, 60, 10));
    }
    // set
    for (const map of maps) {
      for (const t of map) {
        await tester.setQuad(0, t[0], t[1], t[2]);
      }
    }
    // clear
    for (let i = 0; i < maps.length; i++) {
      const map = maps[i];
      for (const t of map) {
        await tester.setQuad(i + 1, t[0], t[1], t[2]);
        await tester.clearMap(0, i + 1);
      }
    }
    // clear
    expect(await getMap(0)).to.be.empty;
  });

  it('clear quad', async function () {
    const {tester, getMap} = await setupMapTest();
    const maps = [];
    for (let i = 0; i < 10; i++) {
      maps.push(createTestMapQuads(60, 60, 10));
    }
    // set
    for (const map of maps) {
      for (const t of map) {
        await tester.setQuad(0, t[0], t[1], t[2]);
      }
    }
    // clear
    for (const map of maps) {
      for (const t of map) {
        await tester.clearQuad(0, t[0], t[1], t[2]);
      }
    }
    expect(await getMap(0)).to.be.empty;
  });

  it('clear', async function () {
    const {tester, getMap} = await setupMapTest();
    const maps = [];
    for (let i = 0; i < 10; i++) {
      maps.push(createTestMapQuads(60, 60, 10));
    }
    // set
    for (const map of maps) {
      for (const t of map) {
        await tester.setQuad(0, t[0], t[1], t[2]);
      }
    }
    await tester.clear(0);
    // clear
    expect(await getMap(0)).to.be.empty;
  });
  it('isEqual', async function () {
    const {tester} = await setupMapTest();
    // Create Test set
    const quads = [];
    quads.push({x: 6, y: 6, size: 3});
    quads.push({x: 1, y: 1, size: 1});
    quads.push({x: 3, y: 3, size: 1});
    for (const t of quads) {
      await tester.setQuad(0, [t.x], [t.y], [t.size]);
    }
    for (let i = 0; i < quads.length; i++) {
      const t = quads[i];
      await tester.setQuad(1, [t.x], [t.y], [t.size]);
      if (i < quads.length - 1) {
        expect(await tester.isEqual(0, 1)).to.be.false;
        expect(await tester.isEqual(1, 0)).to.be.false;
      }
    }
    expect(await tester.isEqual(0, 1)).to.be.true;
    expect(await tester.isEqual(1, 0)).to.be.true;
    expect(await tester.containMap(0, 1)).to.be.true;
    expect(await tester.containMap(1, 0)).to.be.true;
  });

  describe('translate', function () {
    it('1 pixel all over the place', async function () {
      const {tester} = await setupMapTest();
      await tester.setQuad(10, 0, 0, 1);
      const t = await tester.at(10, 0);
      const tests = [0, 1, 7, 8, 9, 12, 16, 23];
      for (const x of tests) {
        for (const y of tests) {
          await tester.setQuad(0, 240 + x, 240 + y, 1);
          expect(
            await tester.containTileWithOffset(0, t.tile, 240 + x, 240 + y)
          ).to.be.true;
          expect(
            await tester.intersectTileWithOffset(0, t.tile, 240 + x, 240 + y)
          ).to.be.true;
          expect(await tester.containTileWithOffset(0, t.tile, 241 + x, y)).to
            .be.false;
          expect(
            await tester.intersectTileWithOffset(0, t.tile, 241 + x, 240 + y)
          ).to.be.false;
        }
      }
    });
    it('translate 1 pixel in 0,0 by 0,0', async function () {
      const {tester} = await setupMapTest();
      await tester.setQuad(10, 0, 0, 1);
      const t = await tester.at(10, 0);

      await tester.setQuad(0, 0, 0, 1);
      expect(await tester.containTileWithOffset(0, t.tile, 0, 0)).to.be.true;
      expect(await tester.intersectTileWithOffset(0, t.tile, 0, 0)).to.be.true;
    });

    it('land count', async function () {
      const {tester} = await setupMapTest();
      await tester.setQuad(0, 0, 0, 1);
      await tester.setQuad(0, 60, 60, 1);
      await tester.setQuad(0, 0, 60, 1);
      await tester.setQuad(0, 60, 0, 1);
      expect(await tester.getLandCount(0)).to.be.equal(4);
    });

    it('@skip-on-coverage gas usage of land count', async function () {
      const {tester} = await setupMapTest();
      for (let i = 0; i < 10; i++) {
        await tester.setQuad(0, i * 24, 0, 1);
      }
      expect(
        BigNumber.from(await tester.estimateGas.getLandCount(0))
      ).to.be.lte(121264);
    });

    describe('translate', function () {
      it('translate 1 pixel all over the place', async function () {
        const {tester} = await setupMapTest();
        await tester.setQuad(0, 0, 0, 1);
        const t = await tester.at(0, 0);
        const tests = [0, 1, 7, 8, 9, 12, 16, 23];
        for (const x of tests) {
          for (const y of tests) {
            const ret = translateResultToArray(
              await tester.translate(t.tile, x, y)
            );
            const result = getEmptyTranslateResult();
            result[y][x] = true;
            expect(ret).to.be.eql(result);
          }
        }
      });
      it('translate a full tile all over the place y first', async function () {
        const {tester} = await setupMapTest();
        await tester.setQuad(0, 0, 0, 24);
        const t = await tester.at(0, 0);
        const tests = [0, 1, 7, 8, 9, 12, 16, 23];
        for (const x of tests) {
          for (const y of tests) {
            const ret = translateResultToArray(
              await tester.translate(t.tile, x, y)
            );
            const result = setRectangle(
              x,
              y,
              24,
              24,
              getEmptyTranslateResult()
            );
            expect(ret).to.be.eql(result);
          }
        }
      });
      it('translate a full tile all over the place x first', async function () {
        const {tester} = await setupMapTest();
        await tester.setQuad(0, 0, 0, 24);
        const t = await tester.at(0, 0);
        const tests = [0, 1, 7, 8, 9, 12, 16, 23];
        for (const x of tests) {
          for (const y of tests) {
            const ret = translateResultToArray(
              await tester.translate(t.tile, x, y)
            );
            const result = setRectangle(
              x,
              y,
              24,
              24,
              getEmptyTranslateResult()
            );
            expect(ret).to.be.eql(result);
          }
        }
      });
      it('@skip-on-coverage gas usage for figure translation', async function () {
        const {tester} = await setupMapTest();
        const tile = drawTile(
          [
            [3, 3, 2, 2],
            [4, 5, 2, 2],
          ],
          getEmptyTile
        );
        await setTileQuads(tester, tile);
        const t = await tester.at(0, 0);
        expect(
          BigNumber.from(await tester.estimateGas.translate(t.tile, 23, 23))
        ).to.be.lte(37885);
      });
      it('clear a figure', async function () {
        const {tester} = await setupMapTest();
        await tester.setQuad(0, 0, 0, 24);
        await tester.setQuad(0, 24, 0, 24);
        await tester.setQuad(0, 0, 24, 24);
        await tester.setQuad(0, 24, 24, 24);

        await tester.setQuad(11, 0, 0, 6);
        const smallTile = await tester.at(11, 0);

        await tester.clearTranslateResult(0, smallTile.tile, 24 - 3, 24 - 3);
        const ret = translateResultToArray({
          topLeft: await tester.at(0, 0),
          topRight: await tester.at(0, 1),
          bottomLeft: await tester.at(0, 2),
          bottomRight: await tester.at(0, 3),
        });
        const result = setRectangle(
          24 - 3,
          24 - 3,
          6,
          6,
          getFullTile(48, 48),
          false
        );
        expect(ret).to.be.eql(result);
      });
      it('translate a figure', async function () {
        const {tester} = await setupMapTest();
        await tester.setQuad(10, 0, 0, 1);
        await tester.setQuad(10, 0, 6, 1);
        await tester.setQuad(10, 6, 0, 1);
        await tester.setQuad(10, 6, 6, 1);
        const t = await tester.at(10, 0);
        const tests = [0, 1, 7, 8, 9, 12, 16, 23];
        const bases = [240, 123];
        for (const b of bases) {
          for (const x of tests) {
            for (const y of tests) {
              // figure
              await tester.setQuad(0, b + x, b + y, 1);
              await tester.setQuad(0, b + x, b + y + 6, 1);
              await tester.setQuad(0, b + x + 6, b + y, 1);
              await tester.setQuad(0, b + x + 6, b + y + 6, 1);
              // some extra
              await tester.setQuad(0, b + x + 1, b + y, 1);
              await tester.setQuad(0, b + x, b + y + 1, 1);
              expect(
                await tester.containTileWithOffset(0, t.tile, b + x, b + y)
              ).to.be.true;
              expect(
                await tester.containTileWithOffset(0, t.tile, b + 1 + x, y)
              ).to.be.false;
            }
          }
        }
      });
    });
  });
  describe('intersect', function () {
    it('intersect start with empty map', async function () {
      const {tester} = await setupMapTest();
      // empty tile, empty map
      expect(await tester.intersect(0, 0)).to.be.false;

      // empty tile with some coords, empty map
      await tester.initTile(0, 120, 120);
      expect(await tester.intersect(0, 0)).to.be.false;

      // non empty tile, empty map
      await tester.setTileQuad(0, 123, 123, 3);
      expect(await tester.intersect(0, 0)).to.be.false;

      // non empty map that don't intersect
      await tester.setQuad(0, 0, 0, 24);
      expect(await tester.intersect(0, 0)).to.be.false;

      // intersect
      await tester.setQuad(0, 120, 120, 24);
      expect(await tester.intersect(0, 0)).to.be.true;
    });

    it('intersect start with empty tile', async function () {
      const {tester} = await setupMapTest();
      // empty tile, non empty map
      await tester.setQuad(0, 123, 123, 3);
      expect(await tester.intersect(0, 0)).to.be.false;

      // empty tile with some coords, non empty map
      await tester.initTile(0, 120, 120);
      expect(await tester.intersect(0, 0)).to.be.false;

      // intersect
      await tester.setTileQuad(0, 120, 120, 6);
      expect(await tester.intersect(0, 0)).to.be.true;
    });
    it('intersect quads', async function () {
      const {tester} = await setupMapTest();

      // empty map
      expect(await tester.intersectQuad(0, 0, 0, 10)).to.be.false;
      expect(await tester.intersectMap(0, 1)).to.be.false;
      expect(await tester.intersectTiles(0, 1)).to.be.false;

      // non empty map
      await tester.setQuad(0, 0, 0, 6);
      expect(await tester.intersectQuad(0, 12, 12, 3)).to.be.false;
      expect(await tester.intersectQuad(0, 0, 0, 3)).to.be.true;
      await tester.setQuad(1, 0, 0, 1);
      expect(await tester.intersectMap(0, 1)).to.be.true;
      expect(await tester.intersectTiles(0, 1)).to.be.true;
    });
  });

  describe('exceptions', function () {
    it("a map that don't contain", async function () {
      const {tester} = await setupMapTest();
      expect(await tester.containCoord(0, 24, 24)).to.be.false;
      expect(await tester.containQuad(0, 24, 24, 1)).to.be.false;
      await tester.setQuad(1, 24, 24, 1);
      expect(await tester.containMap(0, 1)).to.be.false;
      expect(await tester.containTiles(0, 1)).to.be.false;
      expect(await tester.intersectMap(0, 1)).to.be.false;
      expect(await tester.intersectTiles(0, 1)).to.be.false;
    });
    it('is not Equal', async function () {
      const {tester} = await setupMapTest();
      await tester.setQuad(0, 0, 0, 1);
      await tester.setQuad(0, 120, 120, 1);
      await tester.setQuad(1, 0, 0, 1);
      expect(await tester.isEqual(0, 1)).to.be.false;
    });
  });
  it('for coverage', async function () {
    const {tester} = await setupMapTest();
    await tester.getMap(0);
  });
});
