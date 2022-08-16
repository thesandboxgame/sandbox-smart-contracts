import {Event} from 'ethers';
import fs from 'fs-extra';
import hre from 'hardhat';
const {ethers} = hre;

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
  let blockRange = 100000;
  let fromBlock = startBlock;
  let toBlock = Math.min(fromBlock + blockRange, endBlock);
  while (fromBlock <= endBlock) {
    try {
      const moreEvents = await filterFunc(fromBlock, toBlock);
      console.log({fromBlock, toBlock, numEvents: moreEvents.length});
      successes[blockRange] = true;
      consecutiveSuccess++;
      if (consecutiveSuccess > 6) {
        const newBlockRange = blockRange * 2;
        if (!failures[newBlockRange] || successes[newBlockRange]) {
          blockRange = newBlockRange;
          console.log({blockRange});
        }
      }
      fromBlock = toBlock + 1;
      toBlock = Math.min(fromBlock + blockRange, endBlock);
      events.push(...moreEvents);
    } catch (e) {
      failures[blockRange] = true;
      consecutiveSuccess = 0;
      blockRange /= 2;
      toBlock = Math.min(fromBlock + blockRange, endBlock);
      console.log({fromBlock, toBlock, numEvents: 'ERROR'});
      console.log({blockRange});
      console.error(e);
    }
  }
  return events;
}

void (async () => {
  const Asset = await ethers.getContract('Asset');
  const startBlock = (
    await import(`../../deployments/${hre.network.name}/Asset.json`)
  ).receipt.blockNumber;
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
  fs.outputJSONSync('tmp/asset_transfers.json', {
    singleTransferEvents,
    batchTransferEvents,
  });
})();
