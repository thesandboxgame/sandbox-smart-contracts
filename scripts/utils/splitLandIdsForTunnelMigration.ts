/**
 * How to use:
 *  - npx ts-node ./scripts/utils/splitLandIdsForTunnelMigration.ts
 */
import fs from 'fs-extra';

const tokensSnapshotL1 = JSON.parse(
  fs.readFileSync('./tunnel_mainnet.json').toString()
);
const tokensSnapshotL2 = JSON.parse(
  fs.readFileSync('./tunnel-polygon.json').toString()
);

const GRID_SIZE = 408;

interface TokenData {
  id: string;
  owner: {
    id: string;
  };
}

interface Quad {
  size: number;
  x: number;
  y: number;
}

const quads3x3OnLayer1: Array<Quad> = [];
const quads6x6OnLayer1: Array<Quad> = [];
const quads12x12OnLayer1: Array<Quad> = [];
const quads24x24OnLayer1: Array<Quad> = [];
const quads3x3OnLayer2: Array<Quad> = [];
const quads6x6OnLayer2: Array<Quad> = [];
const quads12x12OnLayer2: Array<Quad> = [];
const quads24x24OnLayer2: Array<Quad> = [];

let tokenOnLayer1: Array<number> = [];
let remainingTokenOnL2: Array<number> = [];

for (let i = 0; i < tokensSnapshotL1.length; i++) {
  tokenOnLayer1[i] = parseInt(tokensSnapshotL1[i].id);
}

// fetch common IDs
function getCommonElement(arr1: Array<TokenData>, arr2: Array<TokenData>) {
  let pointer = 0;
  const output = [];
  for (let i = 0; i < arr1.length; ++i) {
    for (let j = pointer; j < arr2.length; ++j) {
      if (arr1[i].id == arr2[j].id) {
        pointer = j;
        output.push(parseInt(arr1[i].id));
      }
    }
  }
  return output;
}

const commonIds = getCommonElement(tokensSnapshotL1, tokensSnapshotL2);

for (let i = 0; i < tokensSnapshotL2.length; i++) {
  remainingTokenOnL2.push(parseInt(tokensSnapshotL2[i].id));
}
for (let i = 0; i < commonIds.length; i++) {
  remainingTokenOnL2 = remainingTokenOnL2.filter(
    (element: number) => element != commonIds[i]
  );
}

function getParentQuadCoordinates(tokenId: number, parentSize: number) {
  const x = Math.floor((tokenId % GRID_SIZE) / parentSize) * parentSize;
  const y =
    Math.floor(Math.floor(tokenId / GRID_SIZE) / parentSize) * parentSize;
  return {x, y};
}

function idInPath(i: number, size: number, x: number, y: number) {
  const row = Math.floor(i / size);
  if (row % 2 == 0) {
    return x + (i % size) + (y + row) * GRID_SIZE;
  } else {
    return x + size - (1 + (i % size)) + (y + row) * GRID_SIZE;
  }
}

function checkOwner(size: number, x: number, y: number, arr: Array<number>) {
  let flag = true;
  for (let i = 0; i < size * size; i++) {
    const id = idInPath(i, size, x, y);
    flag = flag && arr.includes(id);
  }
  return flag;
}

function checkOwnerAndReturnQuad(tokenId: number, arr: Array<number>) {
  let coordinates = getParentQuadCoordinates(tokenId, 24);
  let isOwner = checkOwner(24, coordinates.x, coordinates.y, arr);
  let size = 24;
  if (!isOwner) {
    coordinates = getParentQuadCoordinates(tokenId, 12);
    isOwner = checkOwner(12, coordinates.x, coordinates.y, arr);
    size = 12;
  }
  if (!isOwner) {
    coordinates = getParentQuadCoordinates(tokenId, 6);
    isOwner = checkOwner(6, coordinates.x, coordinates.y, arr);
    size = 6;
  }
  if (!isOwner) {
    coordinates = getParentQuadCoordinates(tokenId, 3);
    isOwner = checkOwner(3, coordinates.x, coordinates.y, arr);
    size = 3;
  }
  return {size, coordinates, isOwner};
}

function clearL1Ids(size: number, x: number, y: number) {
  for (let i = 0; i < size * size; i++) {
    const id = idInPath(i, size, x, y);
    tokenOnLayer1 = tokenOnLayer1.filter((tokenId) => tokenId != id);
  }
}

function clearL2Ids(size: number, x: number, y: number) {
  for (let i = 0; i < size * size; i++) {
    const id = idInPath(i, size, x, y);
    remainingTokenOnL2 = remainingTokenOnL2.filter((tokenId) => tokenId != id);
  }
}

for (let i = 0; i < tokensSnapshotL1.length; i++) {
  const {size, coordinates, isOwner} = checkOwnerAndReturnQuad(
    parseInt(tokensSnapshotL1[i].id),
    tokenOnLayer1
  );
  if (isOwner) {
    if (size == 3) {
      quads3x3OnLayer1.push({size: size, x: coordinates.x, y: coordinates.y});
    } else if (size == 6) {
      quads6x6OnLayer1.push({size: size, x: coordinates.x, y: coordinates.y});
    } else if (size == 12) {
      quads12x12OnLayer1.push({size: size, x: coordinates.x, y: coordinates.y});
    } else if (size == 24) {
      quads24x24OnLayer1.push({size: size, x: coordinates.x, y: coordinates.y});
    } else {
      console.log('Wrong size in input');
    }
    clearL1Ids(size, coordinates.x, coordinates.y);
  }
}

for (let i = 0; i < tokensSnapshotL2.length; i++) {
  const {size, coordinates, isOwner} = checkOwnerAndReturnQuad(
    parseInt(tokensSnapshotL2[i].id),
    remainingTokenOnL2
  );
  if (isOwner) {
    if (size == 3) {
      quads3x3OnLayer2.push({size: size, x: coordinates.x, y: coordinates.y});
    } else if (size == 6) {
      quads6x6OnLayer2.push({size: size, x: coordinates.x, y: coordinates.y});
    } else if (size == 12) {
      quads12x12OnLayer2.push({size: size, x: coordinates.x, y: coordinates.y});
    } else if (size == 24) {
      quads24x24OnLayer2.push({size: size, x: coordinates.x, y: coordinates.y});
    } else {
      console.log('Wrong size in input');
    }
    clearL2Ids(size, coordinates.x, coordinates.y);
  }
}

fs.writeFile(
  'tunnel_land_common_ids.json',
  JSON.stringify(commonIds),
  (err) => {
    if (err) console.log(err);
    else {
      console.log('tunnel_land_common_ids.json File written successfully');
    }
  }
);
fs.writeFile(
  'tunnel_polygon_unique_ids.json',
  JSON.stringify(remainingTokenOnL2),
  (err) => {
    if (err) console.log(err);
    else {
      console.log('tunnel_polygon_unique_ids.json File written successfully');
    }
  }
);

fs.writeFile(
  'tunnel_polygon_unique_quads.json',
  JSON.stringify({
    quads3x3OnLayer2,
    quads6x6OnLayer2,
    quads12x12OnLayer2,
    quads24x24OnLayer2,
  }),
  (err) => {
    if (err) console.log(err);
    else {
      console.log('tunnel_polygon_unique_quads.json File written successfully');
    }
  }
);

fs.writeFile(
  'tunnel_mainnet_quads.json',
  JSON.stringify({
    quads3x3OnLayer1,
    quads6x6OnLayer1,
    quads12x12OnLayer1,
    quads24x24OnLayer1,
  }),
  (err) => {
    if (err) console.log(err);
    else {
      console.log('tunnel_mainnet_unique_quads.json File written successfully');
    }
  }
);

fs.writeFile(
  'tunnel_mainnet_lands.json',
  JSON.stringify(tokenOnLayer1),
  (err) => {
    if (err) console.log(err);
    else {
      console.log('tunnel_mainnet_lands.json File written successfully');
    }
  }
);
