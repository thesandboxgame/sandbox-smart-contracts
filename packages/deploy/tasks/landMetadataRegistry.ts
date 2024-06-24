// run `yarn hardhat load` for help
// usage example: `yarn hardhat load metadata --network amoy --file lands-PROD.json --dryrun`
// usage example: `yarn hardhat load names --network amoy --file neighborhoods-PROD.json --dryrun`
import {scope, types} from 'hardhat/config';
import * as fs from 'fs';
import {Contract} from 'ethers';

const MAX_ID = 2 ** 15 - 1;
type Metadata = {
  tokenId: bigint;
  isPremium: boolean;
  neighborhoodId: bigint;
};

export function updateMetadataWord(
  LANDS_PER_WORD: bigint,
  metadata: bigint,
  batchData: Metadata[]
): bigint {
  const BITS_PER_LAND = 256n / LANDS_PER_WORD;
  const MASK = 2n ** BITS_PER_LAND - 1n;
  const PREMIUM_MASK = 1n << (BITS_PER_LAND - 1n);
  for (const m of batchData) {
    const bits = (m.tokenId % LANDS_PER_WORD) * BITS_PER_LAND;
    const mask = ~(MASK << bits);
    metadata =
      (metadata & mask) |
      ((m.neighborhoodId | (m.isPremium ? PREMIUM_MASK : 0n)) << bits);
  }
  return metadata;
}

export async function updateMetadata(
  registryAsAdmin: Contract,
  metadata: Metadata[],
  dryRun: boolean
): Promise<void> {
  const LANDS_PER_WORD = await registryAsAdmin.LANDS_PER_WORD();
  let totalGasUsed = 0n;
  const batchData = {};
  for (const m of metadata) {
    const baseTokenId = LANDS_PER_WORD * (m.tokenId / LANDS_PER_WORD);
    if (!batchData[baseTokenId]) {
      batchData[baseTokenId] = [];
    }
    batchData[baseTokenId].push(m);
  }
  const batchBaseTokenIds = Object.keys(batchData);
  // first pass, collect metadata that need to be changed.
  const numBatchesPerRead = 408 * 3;
  const newData = [];
  let skipped = 0;
  for (let i = 0; i < batchBaseTokenIds.length; i += numBatchesPerRead) {
    const tokenIds = batchBaseTokenIds.slice(i, i + numBatchesPerRead);
    // get the old data from the contract, we can use zero[] if it is the first time or we don't care about the old data
    const oldData = await registryAsAdmin.batchGetMetadata(tokenIds);
    for (const [baseTokenId, metadataWord]: [bigint, bigint] of oldData) {
      const metadata = updateMetadataWord(
        LANDS_PER_WORD,
        metadataWord,
        batchData[baseTokenId]
      );
      if (metadata == metadataWord) {
        skipped++;
      } else {
        newData.push({
          baseTokenId,
          metadata,
        });
      }
    }
  }
  console.log(
    'skipped',
    skipped,
    'from a total of',
    batchBaseTokenIds.length,
    'batches'
  );
  const numBatchesPerTx = 408 * 2;
  for (let i = 0; i < newData.length; i += numBatchesPerTx) {
    const d = newData.slice(i, i + numBatchesPerTx);
    // update the metadata in the contract
    console.log(
      'calling LandMetadataRegistry.batchSetMetadata for the token ',
      i + 1,
      'to',
      i + d.length,
      'total',
      newData.length
    );
    if (!dryRun) {
      const tx = await registryAsAdmin.batchSetMetadata(d);
      const receipt = await tx.wait();
      totalGasUsed += receipt.cumulativeGasUsed;
      console.log(
        'DONE, hash:',
        receipt.hash,
        'cumulativeGasUsed',
        receipt.cumulativeGasUsed
      );
    }
  }
  console.log('TOTAL GAS USED:', totalGasUsed);
}

const landMetadataRegistryScope = scope(
  'load',
  'Land metadata registry operations'
);
landMetadataRegistryScope
  .task(
    'names',
    'Import neighborhood names in batch into the metadata registry. Takes a json file with an array of objects with the keys [id, name]'
  )
  .addFlag('dryrun', 'simulate execution')
  .addParam(
    'file',
    'json input file name with array of objects that contain the keys [id, name]',
    undefined,
    types.inputFile
  )
  .setAction(async (args, hre) => {
    const data = JSON.parse(fs.readFileSync(args.file).toString('utf8'));
    for (const [i, d] of data.entries()) {
      if (isNaN(parseInt(d.id)) || d.id < 0 || d.id >= MAX_ID) {
        throw new Error(`invalid neighborhoodId ${d.id} in object number ${i}`);
      }
      if (!d.name || typeof d.name != 'string' || d.name.trim().length === 0) {
        throw new Error(`invalid name ${d.name} in object number ${i}`);
      }
    }
    const {sandAdmin} = await hre.getNamedAccounts();
    if (!sandAdmin) {
      throw new Error('Missing sandAdmin account in hardhat.config');
    }
    const contract = await hre.ethers.getContract(
      'LandMetadataRegistry',
      sandAdmin
    );
    if (!contract) {
      throw new Error('Error getting contract LandMetadataRegistry');
    }
    console.log('calling LandMetadataRegistry.batchSetNeighborhoodName');
    if (args.dryrun) {
      console.log(
        'With args',
        data.map((x) => ({neighborhoodId: x.id, name: x.name}))
      );
    } else {
      const tx = await contract.batchSetNeighborhoodName(
        data.map((x) => ({neighborhoodId: x.id, name: x.name}))
      );
      const receipt = await tx.wait();
      console.log(
        'DONE, hash:',
        receipt.hash,
        'cumulativeGasUsed',
        receipt.cumulativeGasUsed
      );
    }
  });

landMetadataRegistryScope
  .task(
    'metadata',
    'Import metadata into the metadata registry. Takes a json file with an array of objects with the keys [coordinateX,coordinateY,neighborhoodId,premium]'
  )
  .addFlag('dryrun', 'simulate execution')
  .addParam(
    'file',
    'json input file name with array of objects that contain the keys [coordinateX,coordinateY,neighborhoodId,premium]',
    undefined,
    types.inputFile
  )
  .setAction(async (args, hre) => {
    const data = JSON.parse(fs.readFileSync(args.file).toString('utf8'));
    for (const [i, d] of data.entries()) {
      if (
        isNaN(parseInt(d.coordinateX)) ||
        d.coordinateX >= 204 ||
        d.coordinateX < -204
      ) {
        throw new Error(
          `invalid coordinateX ${d.coordinateX} in object number ${i}`
        );
      }
      if (
        isNaN(parseInt(d.coordinateY)) ||
        d.coordinateY >= 204 ||
        d.coordinateY < -204
      ) {
        throw new Error(
          `invalid coordinateX ${d.coordinateY} in object number ${i}`
        );
      }
      if (
        'blockchainId' in d &&
        (isNaN(parseInt(d.blockchainId)) ||
          BigInt(d.coordinateX + 204 + 408 * (d.coordinateY + 204)) !=
            d.blockchainId)
      ) {
        if (d.blockchainId === null) {
          console.warn(
            `WARNING: missing blockchainId for coords ${d.coordinateX} and ${d.coordinateY} in object number ${i}`
          );
        } else {
          throw new Error(
            `invalid blockchainId ${d.blockchainId} don't match ${d.coordinateX} and ${d.coordinateY} in object number ${i}`
          );
        }
      }
      if (isNaN(parseInt(d.neighborhoodId))) {
        console.warn(
          `WARNING: invalid neighborhoodId ${d.neighborhoodId} in object number ${i} (${d.coordinateX}, ${d.coordinateY}) using unknown`
        );
        d.neighborhoodId = 0;
      } else {
        if (d.neighborhoodId < 0 || d.neighborhoodId >= MAX_ID) {
          throw new Error(
            `invalid neighborhoodId ${d.neighborhoodId} in object number ${i}`
          );
        }
      }
    }
    const {sandAdmin} = await hre.getNamedAccounts();
    if (!sandAdmin) {
      throw new Error('Missing sandAdmin account in hardhat.config');
    }
    const contract = await hre.ethers.getContract(
      'LandMetadataRegistry',
      sandAdmin
    );
    if (!contract) {
      throw new Error('Error getting contract LandMetadataRegistry');
    }
    const metadata = data.map((x) => ({
      tokenId: BigInt(x.coordinateX + 204 + 408 * (x.coordinateY + 204)),
      isPremium: !!x.premium,
      neighborhoodId: BigInt(x.neighborhoodId),
    }));
    await updateMetadata(contract, metadata, args.dryrun);
  });
