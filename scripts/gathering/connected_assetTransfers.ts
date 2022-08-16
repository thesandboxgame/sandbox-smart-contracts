import fs from 'fs-extra';
import hre from 'hardhat';
import {queryEvents} from '../utils/query-events';
const {ethers} = hre;

void (async () => {
  const Asset = await ethers.getContract('Asset');
  const startBlock = (
    await import(`../../deployments/${hre.network.name}/Asset.json`)
  ).receipt.blockNumber;
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
