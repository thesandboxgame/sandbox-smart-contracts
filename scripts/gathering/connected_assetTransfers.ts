import {Event} from 'ethers';
import fs from 'fs-extra';
import {ethers} from 'hardhat';

const startBlock = 9040032;

async function queryEvents(
  filterFunc: (startBlock: number, endBlock: number) => Promise<Event[]>,
  startBlock: number,
  endBlock?: number
) {
  if (!endBlock) {
    endBlock = await ethers.provider.getBlockNumber();
  }
  let consecutiveSuccess = 0;
  const successes: Record<number, boolean> = {};
  const failures: Record<number, boolean> = {};
  const events = [];
  let blockRange = 200000;
  let midBlock = Math.min(startBlock + blockRange, endBlock);
  while (startBlock <= endBlock) {
    try {
      const midEvents = await filterFunc(startBlock, midBlock);

      console.log({startBlock, midBlock, numEvents: midEvents.length});
      successes[blockRange] = true;
      consecutiveSuccess++;
      if (consecutiveSuccess > 3) {
        const newBlockRange = blockRange * 2;
        if (!failures[newBlockRange] || successes[newBlockRange]) {
          blockRange = newBlockRange;
          console.log({blockRange});
        }
      }

      startBlock = midBlock + 1;
      midBlock = Math.min(startBlock + blockRange, endBlock);
      events.push(...midEvents);
    } catch (e) {
      failures[blockRange] = true;
      consecutiveSuccess = 0;
      blockRange /= 2;
      midBlock = Math.min(startBlock + blockRange, endBlock);

      console.log({startBlock, midBlock, numEvents: 'ERROR'});
      console.log({blockRange});
      console.error(e);
    }
  }
  return events;
}

(async () => {
  const Asset = await ethers.getContract('Asset');
  const singleTransferEvents = await queryEvents(
    Asset.queryFilter.bind(Asset, Asset.filters.TransferSingle()),
    startBlock
  );

  console.log('SINGLE TRANSFERS', singleTransferEvents.length);

  const batchTransferEvents = await queryEvents(
    Asset.queryFilter.bind(Asset, Asset.filters.TransferBatch()),
    startBlock
  );

  console.log('BATCH TRANSFERS', singleTransferEvents.length);

  // write to disk
  fs.ensureDirSync('tmp');
  fs.writeFileSync(
    'tmp/asset_transfers.json',
    JSON.stringify({singleTransferEvents, batchTransferEvents}, null, '  ')
  );
})();
