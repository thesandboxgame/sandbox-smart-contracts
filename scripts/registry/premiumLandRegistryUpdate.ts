#!/usr/bin/env -S yarn ts-node --files
import {BigNumber, Contract} from 'ethers';
import {TileWithCoords} from '../../test/registry/fixtures';
import {ethers, getNamedAccounts} from 'hardhat';
import {fetchData} from './util';
import {Box, Point, QuadTreeWithCounter} from '../utils/quadTree';

const gasPerTx = 15162211 + 1;
const gasPerQuad: {[k: number]: number} = {
  24: 15162211,
  12: 3891387,
  6: 1060792,
  3: 353660,
  1: 145371,
};
const gridSize = 408;

function emptyMap() {
  return Array.from({length: gridSize}).map(() =>
    Array.from({length: gridSize}).map(() => false)
  );
}

async function getBlockchainMap(contract: Contract) {
  const l = BigNumber.from(await contract.length()).toNumber();
  console.log('current Premium tiles quantity', l);
  const map = emptyMap();
  for (let i = 0; i < l; i++) {
    const coord = await contract['at(uint256)'](i);
    const jsData = TileWithCoords.initFromBlockchain(coord).getJsData();
    const jsY = jsData.y.mul(24).toNumber();
    const jsX = jsData.x.mul(24).toNumber();
    for (let y = 0; y < jsData.tile.length; y++) {
      const line = jsData.tile[y];
      for (let x = 0; x < line.length; x++) {
        map[x + jsX][y + jsY] = line[x];
      }
    }
  }
  return map;
}

async function getNeededMap() {
  // Get current map
  const data = await fetchData();
  console.log('needed Premium lands quantity', data.length);
  const map = emptyMap();
  for (let i = 0; i < data.length; i++) {
    const d = data[i];
    const x = d.x + 204;
    const y = d.y + 204;
    map[x][y] = true;
  }
  return map;
}

type Quad = {x: number; y: number; size: number};

function mapToQuads(map: boolean[][]): Quad[] {
  const quadMultiple = 24 * 2 * 2 * 2 * 2 * 2;
  const q = new QuadTreeWithCounter(new Box(0, 0, quadMultiple, quadMultiple));
  for (let x = 0; x < map.length; x++) {
    for (let y = 0; y < map[x].length; y++) {
      if (map[x][y]) q.insert(new Point(x, y));
    }
  }
  const quads = q
    .findFullQuads()
    .map((q) => ({x: q.x, y: q.y, size: Math.sqrt(q.h * q.w)}));
  quads.sort((a, b) => b.size - a.size);
  return quads;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function print(map: boolean[][]) {
  console.log();
  for (let y = 0; y < gridSize; y++) {
    const line = [];
    for (let x = 0; x < gridSize; x++) {
      line.push(map[x][y] ? 'X' : '.');
    }
    console.log(line.join(''));
  }
  console.log();
}

type Batch = {xs: number[]; ys: number[]; sizes: number[]};

function getBatches(quads: Quad[]): Batch[] {
  const ret: Batch[] = [];
  let gas = 0;
  let b: Batch = {xs: [], ys: [], sizes: []};
  for (let i = 0; i < quads.length; i++) {
    const q = quads[i];
    gas += gasPerQuad[q.size];
    if (gas > gasPerTx) {
      if (b.xs.length === 0) {
        throw new Error('must increment gasPerTx');
      }
      ret.push(b);
      gas = 0;
      b = {xs: [], ys: [], sizes: []};
    }
    b.xs.push(q.x);
    b.ys.push(q.y);
    b.sizes.push(q.size);
  }
  if (b.xs.length > 0) {
    ret.push(b);
  }
  return ret;
}

async function main() {
  const neededMap = await getNeededMap();
  const {mapDesigner} = await getNamedAccounts();
  const contract = await ethers.getContract('PremiumLandRegistry', mapDesigner);
  const blockchainMap = await getBlockchainMap(contract);
  const mapToSet = emptyMap();
  const mapToClear = emptyMap();
  for (let x = 0; x < gridSize; x++) {
    for (let y = 0; y < gridSize; y++) {
      mapToSet[x][y] = neededMap[x][y] && !blockchainMap[x][y];
      mapToClear[x][y] = !neededMap[x][y] && blockchainMap[x][y];
    }
  }
  const quadsToSet = mapToQuads(mapToSet);
  const batchesToSet = getBatches(quadsToSet);
  console.log(
    'Quantity of quads to set',
    quadsToSet.length,
    'in',
    batchesToSet.length,
    'batches'
  );

  const quadsToClear = mapToQuads(mapToClear);
  const batchesToClear = getBatches(quadsToClear);
  console.log(
    'Quantity of quads to clear',
    quadsToClear.length,
    'in',
    batchesToClear.length,
    'batches'
  );
  const dryRun = false;
  if (!dryRun) {
    for (const b of batchesToSet) {
      console.log('Setting batch', b);
      const tx = await contract.batchSet(b.xs, b.ys, b.sizes);
      console.log(tx.hash);
      const receipt = await tx.wait();
      console.log(
        'Status',
        receipt.status,
        'Gas used',
        receipt.gasUsed.toString()
      );
    }

    for (const b of batchesToClear) {
      console.log('Clearing batch', b);
      const tx = await contract.batchClear(b.xs, b.ys, b.sizes);
      console.log(tx.hash);
      const receipt = await tx.wait();
      console.log(
        'Status',
        receipt.status,
        'Gas used',
        receipt.gasUsed.toString()
      );
    }
  }
}

if (require.main === module) {
  main().catch((err) => console.error(err));
}
