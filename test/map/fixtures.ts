import {deployments, ethers, getNamedAccounts} from 'hardhat';
import {withSnapshot} from '../utils';
import {BigNumber, BigNumberish, Contract} from 'ethers';

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
  const mapLib = await deployments.deploy('MapLib', {from: deployer});
  await deployments.deploy('MapTester', {
    from: deployer,
    libraries: {
      MapLib: mapLib.address,
    },
  });
  const tester = await ethers.getContract('MapTester', deployer);
  return {
    tester,
    getMap: async function (idx: BigNumberish) {
      const length = BigNumber.from(await tester.length(idx));
      const ret = [];
      for (let i = BigNumber.from(0); i.lt(length); i = i.add(1)) {
        ret.push(tileWithCoordToJS(await tester.at(idx, i)));
      }
      return ret;
    },
  };
});

type ExtendedTileLine = {
  up: BigNumberish;
  middle: {data: BigNumberish[]};
  down: BigNumberish;
};
type Tile = {data: BigNumberish[]};
type ExtendedTile = {
  left: Tile;
  up: BigNumberish;
  middle: Tile;
  down: BigNumberish;
  right: Tile;
};

export function extendedTileToArray(data: ExtendedTile): boolean[][] {
  const lineToArray = (line: ExtendedTileLine) =>
    tileToArray([line.up, ...line.middle.data, line.down]);
  const left = lineToArray({up: 0, middle: data.left, down: 0});
  const center = lineToArray(data);
  const right = lineToArray({up: 0, middle: data.right, down: 0});
  const ret = [];
  for (let i = 0; i < left.length; i++) {
    ret.push([...left[i], ...center[i], ...right[i]]);
  }
  return ret;
}

type TranslateResult = {
  topLeft: {tile: Tile};
  topRight: {tile: Tile};
  bottomLeft: {tile: Tile};
  bottomRight: {tile: Tile};
};

export function translateResultToArray(data: TranslateResult): boolean[][] {
  const ret = [];
  const topLeft = tileToArray(data.topLeft.tile.data);
  const topRight = tileToArray(data.topRight.tile.data);
  for (let i = 0; i < topLeft.length; i++) {
    ret.push([...topLeft[i], ...topRight[i]]);
  }
  const bottomLeft = tileToArray(data.bottomLeft.tile.data);
  const bottomRight = tileToArray(data.bottomRight.tile.data);
  for (let i = 0; i < bottomLeft.length; i++) {
    ret.push([...bottomLeft[i], ...bottomRight[i]]);
  }
  return ret;
}

export function getEmptyTranslateResult(): boolean[][] {
  return getEmptyTile(48, 48);
}

export function tileToArray(data: BigNumberish[]): boolean[][] {
  const ret = [];
  for (let r = 0; r < data.length; r++) {
    const bn = BigNumber.from(data[r]);
    for (let s = 0; s < 8; s++) {
      const line = [];
      for (let t = 0; t < 24; t++) {
        line.push(
          bn
            .shr(s * 24 + t)
            .and(1)
            .eq(1)
        );
      }
      ret.push(line);
    }
  }
  return ret;
}

export function resultToArray(strs: string[]): boolean[][] {
  return strs.map((x) =>
    x
      .split(' ')
      .map((x) => x.trim())
      .filter((x) => x.trim() != '')
      .map((x) => x != 'O')
  );
}

export function tileWithCoordToJS(coord: {
  tile: {data: BigNumberish[]};
}): {tile: boolean[][]; x: BigNumber; y: BigNumber} {
  return {
    tile: tileToArray(coord.tile.data),
    x: BigNumber.from(coord.tile.data[1]).shr(224),
    y: BigNumber.from(coord.tile.data[2]).shr(224),
  };
}

export function getEmptyTile(height = 24, width = 24): boolean[][] {
  return Array.from({length: height}, () =>
    Array.from({length: width}, () => false)
  );
}

export function getEmptyExtendedTile(): boolean[][] {
  return getEmptyTile(8 + 24 + 8, 24 * 3);
}

export function setRectangle(
  tile: boolean[][],
  x0: number,
  y0: number,
  dx: number,
  dy: number,
  val = true
): boolean[][] {
  for (let i = 0; i < dx; i++) {
    for (let j = 0; j < dy; j++) {
      tile[y0 + j][x0 + i] = val;
    }
  }
  return tile;
}

export function drawTile(
  rectangles: number[][],
  initFunc: () => boolean[][]
): boolean[][] {
  return rectangles.reduce(
    (acc, val) => setRectangle(acc, val[0], val[1], val[2], val[3]),
    initFunc()
  );
}

export function drawExtendedTile(rectangles: number[][]): boolean[][] {
  return drawTile(rectangles, getEmptyExtendedTile);
}

export function printTile(jsTile: boolean[][], compact = false): void {
  if (compact) {
    console.log(
      jsTile.map((x) => x.reduce((acc, val) => acc + (val ? 'X ' : 'O '), ''))
    );
    return;
  }
  console.log(
    '     ',
    [...Array(jsTile[0].length).keys()].reduce(
      (acc, val) => acc + val.toString().substring(0, 1).padEnd(2),
      ''
    )
  );
  console.log(
    '     ',
    [...Array(jsTile[0].length).keys()].reduce(
      (acc, val) => acc + val.toString().substring(1, 2).padEnd(2),
      ''
    )
  );
  for (let i = 0; i < jsTile.length; i++) {
    console.log(
      i.toString().padEnd(5),
      jsTile[i].reduce((acc, val) => acc + (val ? 'X ' : 'O '), '')
    );
  }
}

export function printTileWithCoord(jsTile: {
  tile: boolean[][];
  x: BigNumber;
  y: BigNumber;
}): void {
  console.log('X', jsTile.x.toString(), jsTile.x.toHexString());
  console.log('Y', jsTile.y.toString(), jsTile.y.toHexString());
  printTile(jsTile.tile);
}

export function printMap(
  tiles: {
    tile: boolean[][];
    x: BigNumber;
    y: BigNumber;
  }[]
): void {
  for (const tile of tiles) {
    printTileWithCoord(tile);
  }
}

export function roundedTo(n: number, size: number): number {
  return Math.floor(n / size) * size;
}

export function createTestMapQuads(
  xsize: number,
  ysize: number,
  cant: number,
  sizes = [1, 3, 6, 12, 24]
): number[][] {
  const quads = [];
  for (let i = 0; i < cant; i++) {
    const x = Math.floor(xsize * Math.random());
    const y = Math.floor(ysize * Math.random());
    const idx = Math.round((sizes.length - 1) * Math.random());
    const size = sizes[idx];
    quads.push([roundedTo(x, size), roundedTo(y, size), size]);
  }
  return quads;
}

export async function setTileQuads(
  tester: Contract,
  tile: boolean[][]
): Promise<void> {
  for (let y = 0; y < tile.length; y++) {
    for (let x = 0; x < tile[0].length; x++) {
      if (tile[y][x]) {
        await tester.setQuad(0, x, y, 1);
      }
    }
  }
}
