import fs from 'fs-extra';
import hre, {ethers} from 'hardhat';
import {HardhatRuntimeEnvironment} from 'hardhat/types/runtime';
import MerkleTree from '../../lib/merkleTree';
import helpers, {
  SaleLandInfo,
  SaltedProofSaleLandInfo,
  SaltedSaleLandInfo
} from '../../lib/merkleTreeHelper';
import {isTestnet} from '../../utils/network';
import addresses from '../addresses.json';
import deadlines from './deadlines';
import {excludeMinted} from './excludeMinted';
import prices from './prices';

const {createDataArray, saltLands, calculateLandHash} = helpers;

export type LandSale = {
  sector: number;
  lands: SaleLandInfo[] | SaltedSaleLandInfo[];
  merkleRootHash: string;
  saltedLands: SaltedSaleLandInfo[];
  tree: MerkleTree;
};

export type SectorFiles = {
  secret: string;
  sectors: SectorData[];
  bundles: {[id: string]: string[]};
  prices: {[priceId: string]: string};
};
export type SectorLand = {
  coordinateX: number;
  coordinateY: number;
  ownerAddress: string;
  bundleId?: string;
};
export type SectorEstate = {
  coordinateX: number;
  coordinateY: number;
  ownerAddress: string;
  type: number;
  lands: {coordinateX: number; coordinateY: number}[];
  bundleId?: string;
};

export type SectorData = {
  sector: number;
  lands: SectorLand[];
  estates: SectorEstate[];
};

const sandboxWallet = addresses['sandbox'];

let errors = false;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function reportError(e: any) {
  errors = true;
  console.error(e);
}

function exitIfError() {
  if (errors) {
    process.exit(1);
  }
}

type PartnerLandInfo = SaleLandInfo & {
  originalX: number;
  originalY: number;
  name: string;
};

type LandGroup = {
  x: number;
  y: number;
  numLands: number;
  reserved: string;
  originalX: number;
  originalY: number;
  bundleId?: string;
};

async function generateLandsForMerkleTree(
  sectorData: SectorData,
  bundles: {[id: string]: string[]},
  prices: {[priceId: string]: string},
  log?: boolean
): Promise<{lands: SaleLandInfo[]; partnersLands: PartnerLandInfo[]}> {
  const partnersLands: PartnerLandInfo[] = [];
  const lands: SaleLandInfo[] = [];
  let numLands = 0;
  let numLandsInInput = 0;
  let num1x1Lands = 0;
  let num3x3Lands = 0;
  let num6x6Lands = 0;
  let num12x12Lands = 0;
  let num24x24Lands = 0;
  let numSandboxReservedGroups = 0;
  let numSandboxReserved = 0;
  let numReserved = 0;
  let numReservedGroup = 0;
  let numBundles = 0;

  function addLandGroup(landGroup: LandGroup) {
    const size = Math.sqrt(landGroup.numLands);
    if (size * size !== landGroup.numLands) {
      reportError('wrong number of land ' + landGroup.numLands);
    }
    let assetIds: string[] = [];
    if (landGroup.bundleId) {
      assetIds = bundles[landGroup.bundleId];
      numBundles++;
    }
    if (!assetIds) {
      throw new Error('assetIds cannot be undefined');
    }

    // Currently there are no assets on L2
    const premium = !!landGroup.bundleId;
    let priceId = '';
    if (size === 1) {
      num1x1Lands++;
      priceId = (premium ? 'premium_' : '') + '1x1';
    } else if (size === 3) {
      num3x3Lands++;
      priceId = (premium ? 'premium_' : '') + '3x3';
    } else if (size === 6) {
      num6x6Lands++;
      priceId = (premium ? 'premium_' : '') + '6x6';
    } else if (size === 12) {
      num12x12Lands++;
      priceId = (premium ? 'premium_' : '') + '12x12';
    } else if (size === 24) {
      num24x24Lands++;
      priceId = (premium ? 'premium_' : '') + '24x24';
    } else {
      reportError('wrong size : ' + size);
    }
    const price = prices[priceId];
    if (!price) {
      reportError('no price for size = ' + size);
    }

    if (!(landGroup.x % size === 0 && landGroup.y % size === 0)) {
      reportError(
        'invalid coordinates: ' + JSON.stringify({
          x: landGroup.x,
          originalX: landGroup.originalX,
          y: landGroup.y,
          originalY: landGroup.originalY,
          size,
        })
      );
      return;
    }

    if (landGroup.x < 0 || landGroup.x >= 408) {
      reportError('wrong x : ' + landGroup.x);
      return;
    }
    if (landGroup.y < 0 || landGroup.y >= 408) {
      reportError('wrong y : ' + landGroup.y);
      return;
    }

    if (landGroup.reserved) {
      numReservedGroup++;
      numReserved += size * size;
      if (landGroup.reserved.toLowerCase() === sandboxWallet.toLowerCase()) {
        numSandboxReservedGroups++;
        numSandboxReserved += size * size;
      }
      const name = 'unknown : ' + landGroup.reserved;
      partnersLands.push({
        x: landGroup.x,
        y: landGroup.x,
        originalX: landGroup.originalX,
        originalY: landGroup.originalY,
        name,
        size,
        price,
        reserved: landGroup.reserved,
        assetIds,
      });
    }
    lands.push({
      x: landGroup.x,
      y: landGroup.y,
      size,
      price,
      reserved: landGroup.reserved,
      assetIds,
    });
    numLands += size * size;
  }

  for (const land of sectorData.lands) {
    const x = land.coordinateX + 204;
    const y = land.coordinateY + 204;
    numLandsInInput++;
    addLandGroup({
      x,
      y,
      numLands: 1,
      reserved: land.ownerAddress,
      originalX: land.coordinateX,
      originalY: land.coordinateY,
      bundleId: land.bundleId,
    });
  }

  for (const estate of sectorData.estates) {
    const x = estate.coordinateX + 204;
    const y = estate.coordinateY + 204;
    numLandsInInput += estate.lands.length;
    addLandGroup({
      x,
      y,
      numLands: estate.lands.length,
      reserved: estate.ownerAddress,
      originalX: estate.coordinateX,
      originalY: estate.coordinateY,
      bundleId: estate.bundleId,
    });
  }

  if (log) {
    console.log({
      numLands,
      numLandsInInput,
      num1x1Lands,
      num3x3Lands,
      num6x6Lands,
      num12x12Lands,
      num24x24Lands,
      numSandboxReservedGroups,
      numSandboxReserved,
      numReserved,
      numReservedGroup,
      numBundles,
    });
  }

  exitIfError();
  return {lands, partnersLands};
}

export async function getLandSales(
  presale: string,
  networkName: string,
  expose?: boolean
): Promise<LandSale[]> {
  const {secret, sectors, bundles, prices} = await getLandSaleFiles(
    presale,
    networkName
  );

  const landSales = [];
  for (const sectorData of sectors) {
    const fixedSectorData = await excludeMinted(sectorData)
    console.log({lands: sectorData.lands.length, unmintedLands: fixedSectorData.lands.length})
    const {lands} = await generateLandsForMerkleTree(
      fixedSectorData,
      bundles,
      prices
    );

    const saltedLands = saltLands(lands, secret);
    const tree = new MerkleTree(createDataArray(saltedLands));
    const merkleRootHash = tree.getRoot().hash;

    landSales.push({
      sector: sectorData.sector,
      lands: expose ? saltedLands : lands,
      merkleRootHash,
      saltedLands,
      tree,
    });
  }
  return landSales;
}

export async function getLandSaleFiles(
  presale: string,
  networkName: string
): Promise<SectorFiles> {
  const networkNameMap: {[name: string]: string} = {
    mainnet: 'mainnet',
    polygon: 'mainnet',
    rinkeby: 'testnet',
    goerli: 'testnet',
    mumbai: 'testnet',
    hardhat: 'testnet',
    localhost: 'testnet',
  };
  const name = networkNameMap[networkName];
  const secretPath = `./secret/.${presale}_${name}_secret`;
  const sectorPath = `./${presale}/sectors.${name}.json`;
  const bundlesPaths = [
    `./${presale}/bundles.${networkName}.json`,
    `./${presale}/bundles.${name}.json`,
  ];
  let secret;
  if (networkName === 'hardhat' || networkName === 'localhost') {
    secret =
      '0x4467363716526536535425451427798982881775318563547751090997863683';
  } else {
    secret = loadSecret(secretPath);
    if (!secret && hre.network.tags.mainnet)
      throw new Error('LandPreSale secret not found');
    else secret = generateSecret(secretPath);
  }
  const sectors = (await import(sectorPath)).default;
  const bundles = await loadBundles(bundlesPaths);
  return {secret, sectors, bundles, prices};
}

function loadSecret(path: string) {
  let secret = null;
  try {
    secret = fs.readFileSync(path).toString();
  } catch {
    console.log('LandPreSale secret not found.');
  }
  return secret;
}

function generateSecret(path: string) {
  const secret = ethers.Wallet.createRandom().privateKey.toString();
  fs.writeFileSync(path, secret);
  return secret;
}

async function loadBundles(paths: string[]) {
  for (const path of paths) {
    try {
      const bundles = (await import(path)).default;
      return bundles;
    } catch {
      continue;
    }
  }
  throw new Error('Bundles not found');
}

export function getDeadline(
  hre: HardhatRuntimeEnvironment,
  sector: number
): number {
  let deadline = deadlines[sector];
  if (!deadline) {
    throw new Error(`no deadline for sector ${sector}`);
  }
  if (isTestnet(hre)) {
    hre.deployments.log('increasing deadline by 10 year');
    deadline += 10 * 365 * 24 * 60 * 60; // add 10 year on testnets
  }
  console.log(`Deadline sector ${sector}:`, new Date(deadline * 1000).toISOString())
  return deadline;
}

export function writeProofs(
  hre: HardhatRuntimeEnvironment,
  landSaleName: string,
  landSale: LandSale
): void {
  if (
    hre.network.name !== 'hardhat' ||
    landSaleName === 'EstateSaleWithAuth_0_0'
  ) {
    const landsWithProof: SaltedProofSaleLandInfo[] = [];
    for (const land of landSale.saltedLands) {
      const proof = landSale.tree.getProof(calculateLandHash(land));
      landsWithProof.push({...land, proof});
    }
    const path = `./secret/estate-sale/${hre.network.name}/.proofs_${landSale.sector}.json`;
    fs.outputJsonSync(path, landsWithProof);
  }
}

export async function setAsLandMinter(
  hre: HardhatRuntimeEnvironment,
  address: string,
  contractName = 'Land'
): Promise<void> {
  const {read, execute, catchUnknownSigner} = hre.deployments;
  const isMinter = await read(contractName, 'isMinter', address);
  if (!isMinter) {
    const currentLandAdmin = await read(contractName, 'getAdmin');
    await catchUnknownSigner(
      execute(
        contractName,
        {from: currentLandAdmin, log: true},
        'setMinter',
        address,
        true
      )
    );
  }
}
