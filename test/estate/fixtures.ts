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

export function printTile(jsTile: boolean[][]) {
  console.log("     ", [...Array(jsTile.length).keys()].reduce((acc, val) => acc + val.toString().padEnd(3), ""));
  for (let i = 0; i < jsTile.length; i++) {
    const line = jsTile[i];
    console.log(i.toString().padEnd(5),
      line.reduce((acc, val) => acc + (val ? " X " : " O "), ""));
  }
}

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
    x: BigNumber.from(coord.tile.data[1]).shl(192),
    y: BigNumber.from(coord.tile.data[2]).shl(192)
  };
}

export function getEmptyTile() {
  return Array.from({length: 24},
    e => Array.from({length: 24}, e => false));
}
