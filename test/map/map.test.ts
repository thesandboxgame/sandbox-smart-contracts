import {expect} from '../chai-setup';
import {createTestMapQuads, printMap, setupMapTest} from './fixtures';

describe('MapLib', function () {
  it('Available quads', async function () {
    const {tester} = await setupMapTest();
    expect(await tester.quadMask(1)).to.be.equal(0x1);
    expect(await tester.quadMask(3)).to.be.equal(0x7);
    expect(await tester.quadMask(6)).to.be.equal(0x3f);
    expect(await tester.quadMask(12)).to.be.equal(0xfff);
    expect(await tester.quadMask(24)).to.be.equal(0xffffff);
    expect(await tester.quadMask(2)).to.be.equal(0);
  });

  it('Some Map With Coords', async function () {
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
      expect(await tester.containMap(outIdx, i + 1));
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
    expect(await tester.containMap(0, 1));
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
    printMap(await getMap(0));
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

  // TODO: Add more tests, specially for clear, grid like things, etc...
});
