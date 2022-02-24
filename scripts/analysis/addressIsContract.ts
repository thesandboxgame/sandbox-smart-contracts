/**
 * Script to filter quad owners that are contracts
 * How to use:
 *  - yarn execute <NETWORK> ./scripts/analysis/addressIsContract.ts
 */
import {ethers} from 'hardhat';
import fs from 'fs-extra';

(async () => {
  const wallets: string[] = fs.readJSONSync('tmp/addressList.json');
  const contracts: string[] = [];
  const scanned: string[] = [];
  let promises = [];
  for (let i = 0; i < wallets.length; i++) {
    log(i, contracts, scanned);
    promises.push(scan(contracts, scanned, wallets[i]));
    if (promises.length >= 50) {
      await Promise.all(promises);
      promises = [];
    }
  }
  console.log(contracts.length);
  fs.outputJSONSync('tmp/mainnet-addressIsContract.json', contracts);
})();

function log(i: number, contracts: string[], scanned: string[]): void {
  if (i % 100 == 0) {
    console.log('--------------------------------------------------');
    console.log('current', i);
    console.log('contracts', contracts.length);
    console.log('scanned', scanned.length);
  }
}

async function scan(contracts: string[], scanned: string[], address: string) {
  if (scanned.includes(address)) return;
  scanned.push(address);
  const result = await isContract(address);
  if (result) contracts.push(address);
}

async function isContract(address: string, retries = 3): Promise<boolean> {
  try {
    const result = await ethers.provider.getCode(address);
    return result !== '0x';
  } catch (err) {
    console.log(err);
    if (retries > 0) {
      console.log('retry for', address, retries);
      return isContract(address, retries - 1);
    }
    return false;
  }
}
