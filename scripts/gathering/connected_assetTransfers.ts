import fs from 'fs-extra';
import hre from 'hardhat';
import {queryEvents} from '../utils/query-events';
const {ethers, deployments} = hre;

void (async () => {
  const Asset = await ethers.getContract('Asset');
  const startBlock = (await deployments.get('Asset')).receipt?.blockNumber || 0;
  const singleTransferEvents = await queryEvents(
    Asset,
    Asset.filters.TransferSingle(),
    startBlock
  );
  console.log('SINGLE TRANSFERS', singleTransferEvents.length);
  const batchTransferEvents = await queryEvents(
    Asset,
    Asset.filters.TransferBatch(),
    startBlock
  );
  console.log('BATCH TRANSFERS', singleTransferEvents.length);
  fs.outputJSONSync('tmp/asset_transfers.json', {
    singleTransferEvents,
    batchTransferEvents,
  });
})();
