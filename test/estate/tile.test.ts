import {deployments, ethers, getNamedAccounts} from "hardhat";
import {expect} from '../chai-setup';
import {withSnapshot} from "../utils";
import {BigNumber, BigNumberish} from "ethers";

const setupTest = withSnapshot([], async () => {
  const {deployer} = await getNamedAccounts();
  await deployments.deploy('TileTester', {from: deployer});
  return await ethers.getContract('TileTester', deployer);
});

function printTile(jsTile: boolean[][]) {
  console.log("     ", [...Array(jsTile.length).keys()].reduce((acc, val) => acc + val.toString().padEnd(3), ""));
  for (let i = 0; i < jsTile.length; i++) {
    const line = jsTile[i];
    console.log(i.toString().padEnd(5),
      line.reduce((acc, val) => acc + (val ? " X " : " O "), ""));
  }
}

function tileToArray(tile: { data: BigNumberish[] }) {
  const ret = [];
  for (let r = 0; r < tile.data.length; r++) {
    const bn = BigNumber.from(tile.data[r]);
    for (let s = 0; s < 8; s++) {
      const line = [];
      for (let t = 0; t < 24; t++) {
        line.push(bn.shr(s * 24 + t).and(1).eq(1));
      }
      ret.push(line);
    }
  }
  return ret;
}

function getEmptyTile() {
  return Array.from({length: 24},
    e => Array.from({length: 24}, e => false));
}

describe('TileLib', function () {
  it('Available quads', async function () {
    const tester = await setupTest();
    expect(await tester.quadMask(1)).to.be.equal(0x1);
    expect(await tester.quadMask(3)).to.be.equal(0x7);
    expect(await tester.quadMask(6)).to.be.equal(0x3F);
    expect(await tester.quadMask(12)).to.be.equal(0xFFF);
    expect(await tester.quadMask(24)).to.be.equal(0xFFFFFF);
    expect(await tester.quadMask(2)).to.be.equal(0);
  })

  it.skip('Some Tile', async function () {
    const tester = await setupTest();
    await tester.setQuad(0, 0, 0, 1);
    await tester.setQuad(0, 23, 23, 1);
    await tester.setQuad(0, 3, 0, 3);
    await tester.setQuad(0, 12, 6, 6);
    await tester.clearQuad(0, 15, 9, 3);
    const tile = await tester.getTile(0);
    const jsTile = tileToArray(tile);
    printTile(jsTile);
  });

  it('union', async function () {
    const tester = await setupTest();
    const tests = [[3, 0, 3], [12, 6, 6], [1, 1, 1], [23, 23, 1]]
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
    const tester = await setupTest();
    //const tests = [[12, 12, 1], [12, 12, 3], [12, 12, 6], [12, 12, 12], [0, 0, 24]]
    const tests = [[12, 12, 1], [12, 12, 3]]

    const idxs = [];
    for (let idx = 0; idx < tests.length; idx++) {
      const t = tests[idx];
      await tester.setQuad(idx, t[0], t[1], t[2]);
      idxs.push(idx);
    }
    const outIdx = 29;
    await tester.intersection(idxs, outIdx);
    const intersection = tileToArray(await tester.getTile(outIdx));
    const tile = getEmptyTile();
    tile[12][12] = true;
    expect(intersection).to.be.eql(tile);
  });

  it('contains', async function () {
    const tester = await setupTest();
    const tests = [[3, 0, 3], [12, 6, 6], [1, 1, 1], [23, 23, 1]]
    // 0
    for (const t of tests) {
      await tester.setQuad(0, t[0], t[1], t[2]);
    }
    // 1
    for (const t of tests) {
      await tester.clearQuad(1, 0, 0, 24);
      await tester.setQuad(1, t[0], t[1], t[2]);
      expect(await tester.containTile(0, 1)).to.be.true;
      expect(await tester.containQuad(0, t[0], t[1], t[2])).to.be.true;
    }
    await tester.setQuad(2, 2, 2, 1);
    expect(await tester.containTile(0, 2)).to.be.false;
    expect(await tester.containQuad(0, 2, 2, 1)).to.be.false;
    await tester.setQuad(3, 22, 22, 1);
    expect(await tester.containTile(0, 3)).to.be.false;
    expect(await tester.containQuad(0, 22, 22, 1)).to.be.false;
    expect(await tester.containQuad(0, 21, 21, 3)).to.be.false;
  });

  // TODO: Add more tests, specially for clear, grid like things, etc...
});
