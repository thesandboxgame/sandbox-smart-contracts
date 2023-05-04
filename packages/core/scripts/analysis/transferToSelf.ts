import fs from 'fs-extra';

const transferEvents = JSON.parse(
  fs.readFileSync('tmp/asset_transfers.json').toString()
);

const batchTransfers = transferEvents.batchTransferEvents;
const singleTransfers = transferEvents.singleTransferEvents;

const batchTransfersToSelf = [];
for (const transfer of batchTransfers) {
  if (transfer.args[1] === transfer.args[2]) {
    batchTransfersToSelf.push(transfer);
  }
}

console.log('batch transfer to self', batchTransfersToSelf.length);

const singleTransfersToSelf = [];
for (const transfer of singleTransfers) {
  if (transfer.args[1] === transfer.args[2]) {
    singleTransfersToSelf.push(transfer);
  }
}

console.log('single transfer to self', singleTransfersToSelf.length);
