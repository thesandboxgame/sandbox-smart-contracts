import {deployments, ethers, getNamedAccounts} from "hardhat";
import {withSnapshot} from "../utils";
import {BigNumber, BigNumberish} from "ethers";

export const setupTileLibTest = withSnapshot([], async () => {
  const {deployer} = await getNamedAccounts();
  await deployments.deploy('TileTester', {from: deployer});
  return await ethers.getContract('TileTester', deployer);
});

export const setupTileWithCoordsLibTest = withSnapshot([], async () => {
  const {deployer} = await getNamedAccounts();
  await deployments.deploy('TileWithCoordTester', {from: deployer});
  return await ethers.getContract('TileWithCoordTester', deployer);
});

export const setupMapTest = withSnapshot([], async () => {
  const {deployer} = await getNamedAccounts();
  await deployments.deploy('MapTester', {from: deployer});
  const tester = await ethers.getContract('MapTester', deployer)
  return {
    tester,
    getMap: async function (idx: BigNumberish) {
      const length = BigNumber.from(await tester.length(idx));
      const ret = [];
      for (let i = BigNumber.from(0); i.lt(length); i = i.add(1)) {
        ret.push(tileWithCoordToJS(await tester.at(idx, i)));
      }
      return ret;
    }
  };
});

export function tileToArray(data: BigNumberish[]) {
  const ret = [];
  for (let r = 0; r < data.length; r++) {
    const bn = BigNumber.from(data[r]);
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

export function tileWithCoordToJS(coord: { tile: { data: BigNumberish[] } }) {
  return {
    tile: tileToArray(coord.tile.data),
    x: BigNumber.from(coord.tile.data[1]).shr(192),
    y: BigNumber.from(coord.tile.data[2]).shr(192)
  };
}

export function getEmptyTile() {
  return Array.from({length: 24},
    e => Array.from({length: 24}, e => false));
}


export function printTile(jsTile: boolean[][]) {
  console.log("     ", [...Array(jsTile.length).keys()].reduce((acc, val) => acc + val.toString().padEnd(3), ""));
  for (let i = 0; i < jsTile.length; i++) {
    const line = jsTile[i];
    console.log(i.toString().padEnd(5),
      line.reduce((acc, val) => acc + (val ? " X " : " O "), ""));
  }
}

export function printTileWithCoord(jsTile: {
  tile: boolean[][],
  x: BigNumber,
  y: BigNumber
}) {
  console.log("X", jsTile.x.toString(), jsTile.x.toHexString());
  console.log("Y", jsTile.y.toString(), jsTile.y.toHexString());
  printTile(jsTile.tile);

}

export function printMap(tiles: {
  tile: boolean[][],
  x: BigNumber,
  y: BigNumber
}[]) {
  for (const tile of tiles) {
    printTileWithCoord(tile);
  }
}

export function createTestMapQuads(xsize: number, ysize: number, cant: number, sizes = [1, 3, 6, 12, 24]) {
  const quads = [];
  for (let i = 0; i < cant; i++) {
    const x = Math.floor(xsize * Math.random());
    const y = Math.floor(ysize * Math.random());
    const idx = Math.round((sizes.length - 1) * Math.random());
    const size = sizes[idx];
    quads.push([Math.floor(x / size) * size, Math.floor(y / size) * size, size]);
  }
  return quads;
}
