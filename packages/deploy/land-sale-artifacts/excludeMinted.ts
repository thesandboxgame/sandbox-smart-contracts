/* eslint-disable @typescript-eslint/no-non-null-assertion */
import hre from 'hardhat';
import {TheGraph} from './graph';
import {SectorData, SectorLand} from './getLandSales';

const networkRelations: {[k: string]: string} = {
  AMOY: 'SEPOLIA',
  SEPOLIA: 'AMOY',
  MAINNET: 'POLYGON',
  POLYGON: 'MAINNET',
};

function getGraphUrls() {
  const l1 = process.env.HARDHAT_FORK
    ? process.env.HARDHAT_FORK.toUpperCase()
    : hre.network.name.toUpperCase();
  if (!networkRelations[l1]) {
    console.warn('missing network relation for', l1);
    return [];
  }
  const layers = [l1, networkRelations[l1]];
  console.log('Layers', layers);
  const urls: string[] = [];
  for (const l of layers) {
    const u = process.env[`SANDBOX_GRAPH_URL_${l}`];
    if (!u) {
      console.warn(
        `missing graph url to check for minted lands SANDBOX_GRAPH_URL_${l}`
      );
      return [];
    }
    urls.push(u);
  }
  return urls;
}

export async function excludeMinted({
  sector,
  lands,
  estates,
}: SectorData): Promise<SectorData> {
  const urls = getGraphUrls();
  const skipExcludeMinted =
    process.env.CI !== undefined ||
    urls.length == 0 ||
    process.env.NODE_ENV === 'test';
  if (skipExcludeMinted) {
    console.warn('Skipping minted land check is a bad idea!!!');
    return {sector, lands, estates};
  }
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
    estate.lands.forEach((land) => checkCoords(land))
  );

  const mintedLands = await getMintedLands(urls, {
    minX,
    minY,
    maxX,
    maxY,
  });
  const isMinted = (land: SectorLand) =>
    mintedLands.find(
      (m) =>
        m.coordinateX === land.coordinateX && m.coordinateY === land.coordinateY
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
  if (lands.length - result.lands.length > 0 || mintedEstatesLands.length > 0) {
    console.warn('THERE ARE MINTED LAND IN THE JSON FILE!!!');
  }
  return result;
}

async function getMintedLands(
  urls: string[],
  {
    minX,
    minY,
    maxX,
    maxY,
  }: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  }
): Promise<SectorLand[]> {
  console.log('Will check land in the region:', {minX, minY, maxX, maxY});
  const query = `{
    landTokens(where: {x_gte: ${minX + 204} y_gte: ${minY + 204} x_lte:${
    maxX + 204
  } y_lte: ${maxY + 204}}) {
      id
      x
      y
      owner { id }
    }
  }`;
  const landMap: {[id: string]: SectorLand} = {};
  const landChains = await Promise.all(
    urls.map((u) =>
      new TheGraph(u).query<{
        id: string;
        x: number;
        y: number;
        owner: {id: string};
      }>(query, 'landTokens', {})
    )
  );
  landChains.forEach((lands) =>
    lands.forEach((land) => {
      if (landMap[land.id]) return;
      landMap[land.id] = {
        coordinateX: land.x - 204,
        coordinateY: land.y - 204,
        ownerAddress: land.owner.id,
      };
    })
  );
  return Object.values(landMap);
}
