/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from 'fs-extra';
import {BigNumber} from '@ethersproject/bignumber';
// import {AddressZero} from '@ethersproject/constants';
const AddressZero = '0x0000000000000000000000000000000000000000';

const transferEvents = JSON.parse(
  fs.readFileSync('tmp/asset_transfers.json').toString()
);

const batchTransfers = transferEvents.batchTransferEvents;
const singleTransfers = transferEvents.singleTransferEvents;

const all: {
  blockNumber: number;
  transactionIndex: number;
  event: string;
  args: any[];
}[] = batchTransfers.map((v: any) => {
  v.args[3] = v.args[3].map((v: {hex: string}) => v.hex);
  v.args[4] = v.args[4].map((v: {hex: string}) => v.hex);
  return v;
});

let lastInsert = 0;
for (const transfer of singleTransfers) {
  transfer.args[3] = transfer.args[3].hex;
  transfer.args[4] = transfer.args[4].hex;
  let i = lastInsert;
  while (
    i < all.length &&
    all[i].blockNumber <= transfer.blockNumber &&
    !(
      all[i].blockNumber === transfer.blockNumber &&
      all[i].transactionIndex > transfer.transactionIndex
    )
  ) {
    i++;
  }
  all.splice(i, 0, transfer);
  lastInsert = Math.min(i + 1, all.length);
}

fs.ensureDirSync('tmp');
fs.writeFileSync('tmp/all_transfers.json', JSON.stringify(all, null, '  '));

type Owner = {tokens: {[id: string]: number}; address: string};
type Asset = {id: string; supply: number};

const owners: {
  [address: string]: Owner;
} = {};
const assets: {[id: string]: Asset} = {};

function handleTransfer(
  from: string,
  to: string,
  id: string,
  value: number,
  transfer: any
) {
  if (from === AddressZero) {
    // minting
    let asset = assets[id];
    if (!asset) {
      asset = {id, supply: 0};
    }
    asset.supply += value;
    assets[id] = asset;
  } else {
    const currentOwner = owners[from];
    if (!currentOwner) {
      console.log({from, to, id, value, transfer});
    }
    currentOwner.tokens[id] -= value;
    let totalTokens = 0;
    for (const tokenId of Object.keys(currentOwner.tokens)) {
      totalTokens += currentOwner.tokens[tokenId];
    }
    if (totalTokens === 0) {
      console.log(`deleting ${from}`);
      delete owners[from];
    }
  }

  if (to === AddressZero) {
    // burning
    assets[id].supply -= value; // TODO collection handling ?
  } else {
    let newOwner = owners[to];
    if (!newOwner) {
      newOwner = {address: to, tokens: {}};
    }
    if (!newOwner.tokens[id]) {
      newOwner.tokens[id] = 0;
    }
    newOwner.tokens[id] += value;
    owners[to] = newOwner;
  }
}

for (const transfer of all) {
  if (transfer.event === 'TransferSingle') {
    handleTransfer(
      transfer.args[1].toLowerCase(),
      transfer.args[2].toLowerCase(),
      transfer.args[3].toLowerCase(),
      BigNumber.from(transfer.args[4]).toNumber(),
      transfer
    );
  } else if (transfer.event === 'TransferBatch') {
    for (let i = 0; i < transfer.args[3].length; i++) {
      handleTransfer(
        transfer.args[1].toLowerCase(),
        transfer.args[2].toLowerCase(),
        transfer.args[3][i].toLowerCase(),
        BigNumber.from(transfer.args[4][i]).toNumber(),
        transfer
      );
    }
  }
}

console.log({
  numOwners: Object.keys(owners).length,
  numAssets: Object.keys(assets).length,
});
