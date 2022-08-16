/**
 * Script to filter quad owners that are contracts
 * How to use:
 *  - yarn execute <NETWORK> ./scripts/analysis/addressIsContract.ts
 */
import fs from 'fs-extra';
import {isContract} from '../../utils/address';

void (async () => {
  const addresses: string[] = fs
    .readJSONSync('tmp/addressList.json')
    .map((a: string) => a.toLowerCase());
  const contracts: string[] = [];
  let promises = [];
  for (let i = 0; i < addresses.length; i++) {
    log(i, contracts);
    promises.push(scan(contracts, addresses[i]));
    if (promises.length >= 50) {
      await Promise.all(promises);
      promises = [];
    }
  }
  console.log(contracts.length);
  fs.outputJSONSync('tmp/mainnet-addressIsContract.json', contracts);
})();

function log(i: number, contracts: string[]): void {
  if (i % 100 === 0) {
    console.log('--------------------------------------------------');
    console.log('current', i);
    console.log('contracts', contracts.length);
  }
}

async function scan(contracts: string[], address: string) {
  const result = await isContract(address);
  if (result) contracts.push(address);
}
