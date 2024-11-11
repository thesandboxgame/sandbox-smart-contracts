/* eslint-disable @typescript-eslint/no-non-null-assertion */
import hre from 'hardhat';
import {TheGraph} from './graph-utils';
import {SectorData, SectorLand} from './landsale-utils';

let l1, l2;
if (hre.network.tags.testnet && !process.env.HARDHAT_FORK) {
  l1 = 'GOERLI';
  l2 = 'MUMBAI';
} else {
  l1 = 'MAINNET';
  l2 = 'POLYGON';
}
const graphUrlL1 = process.env[`SANDBOX_GRAPH_URL_${l1}`];
const graphUrlL2 = process.env[`SANDBOX_GRAPH_URL_${l2}`];
const skipExcludeMinted =
  process.env.CI !== undefined ||
  !graphUrlL1 ||
  !graphUrlL2 ||
  process.env.NODE_ENV === 'test';

export async function excludeMinted({
  sector,
  lands,
  estates,
}: SectorData): Promise<SectorData> {
  if (skipExcludeMinted) return {sector, lands, estates};
  const result: SectorData = {
    sector,
    lands: [],
    estates: [],
  };
  let minX = 204,
    minY = 204,
    maxX = -204,
    maxY = -204;
  const checkCoords = ({coordinateX, coordinateY}: SectorLand) => {
    if (coordinateX < minX) minX = coordinateX;
    if (coordinateX > maxX) maxX = coordinateX;
    if (coordinateY < minY) minY = coordinateY;
    if (coordinateY > maxY) maxY = coordinateY;
  };
  lands.forEach((land) => checkCoords(land));
  estates.forEach((estate) =>
    estate.lands.forEach((land) => checkCoords(land)),
  );
  const mintedLands = await getMintedLands({minX, minY, maxX, maxY});
  const isMinted = (land: SectorLand) =>
    mintedLands.find(
      (m) =>
        m.coordinateX === land.coordinateX &&
        m.coordinateY === land.coordinateY,
    );
  lands.forEach((land) => {
    if (isMinted(land)) {
      console.log('minted', JSON.stringify(land));
      return;
    }
    result.lands.push(land);
  });
  const mintedEstatesLands: SectorLand[] = [];
  estates.forEach((estate) => {
    estate.lands.forEach((land) => {
      if (isMinted(land)) {
        console.log('minted', JSON.stringify(land));
        mintedEstatesLands.push(land);
      }
    });
  });
  console.log({
    lands: lands.length,
    mintedLands: lands.length - result.lands.length,
  });
  console.log({
    estatesLands: estates.reduce((acc, e) => acc + e.lands.length, 0),
    mintedEstatesLands: mintedEstatesLands.length,
  });
  return result;
}

async function getMintedLands({
  minX,
  minY,
  maxX,
  maxY,
}: {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}): Promise<SectorLand[]> {
  console.log({minX, minY, maxX, maxY});
  const query = `{
    landTokens(where: {x_gte: ${minX + 204} y_gte: ${minY + 204} x_lte:${maxX + 204} y_lte: ${maxY + 204}}) {
      id
      x
      y
      owner { id }
    }
  }`;
  const landMap: {[id: string]: SectorLand} = {};
  const landChains = await Promise.all([
    new TheGraph(graphUrlL1!).query<{
      id: string;
      x: number;
      y: number;
      owner: {id: string};
    }>(query, 'landTokens', {}),
    new TheGraph(graphUrlL2!).query<{
      id: string;
      x: number;
      y: number;
      owner: {id: string};
    }>(query, 'landTokens', {}),
  ]);
  landChains.forEach((lands) =>
    lands.forEach((land) => {
      if (landMap[land.id]) return;
      landMap[land.id] = {
        coordinateX: land.x - 204,
        coordinateY: land.y - 204,
        ownerAddress: land.owner.id,
      };
    }),
  );
  return Object.values(landMap);
}
