import {Event} from 'ethers';
import {BigNumber} from '@ethersproject/bignumber';
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

(async () => {
  const Asset = await ethers.getContract('OldAsset');
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

  // for (const transfer of singleTransferEvents) {
  //   const t = transfer as any;
  //   t.args[3] = t.args[3].toString();
  //   t.args[4] = t.args[4].toString();
  // }

  // for (const transfer of batchTransferEvents) {
  //   const t = transfer as any;
  //   t.args[3] = t.args[3].map((v: BigNumber) => v.toString());
  //   t.args[4] = t.args[4].map((v: BigNumber) => v.toString());
  // }

  // write to disk
  fs.ensureDirSync('tmp');
  fs.writeFileSync(
    'tmp/asset_transfers.json',
    JSON.stringify({singleTransferEvents, batchTransferEvents}, null, '  ')
  );
})();
