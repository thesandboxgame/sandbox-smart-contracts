import {expect} from '../chai-setup';
import {createTestMapQuads, printMap, setupMapTest} from './fixtures';

describe('MapLib', function () {
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
      expect(await tester.containTileAtCoord(0, t[0], t[1])).to.be.true;
      for (let i = 0; i < t[2]; i++) {
        for (let j = 0; j < t[2]; j++) {
          expect(await tester.containCoord(0, t[0] + i, t[1] + j)).to.be.true;
        }
      }
    }
    const t = quads[0];
    await tester.setQuad(1, t[0], t[1], t[2]);
    expect(await tester.containMap(0, 1)).to.be.true;
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
    console.log(await getMap(0));
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

  // TODO: Add more tests, specially for clear, grid like things, etc...
});
