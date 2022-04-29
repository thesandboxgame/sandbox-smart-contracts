/**
 * Script to filter quad owners that are contracts
 * How to use:
 *  - yarn execute <NETWORK> ./scripts/analysis/addressIsContract.ts
 */
import fs from 'fs-extra';
import { ethers } from 'hardhat';

const cachedCode: {[address: string]: string} = loadCached(
  'tmp/cachedCode.json'
);

(async () => {
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
      saveCached('tmp/cachedContracts.json', cachedCode);
      promises = [];
    }
  }
  console.log(contracts.length);
  fs.outputJSONSync('tmp/mainnet-addressIsContract.json', contracts);
})();

function loadCached(path: string) {
  const cached = fs.readJSONSync(path, {throws: false});
  return cached || {};
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function saveCached(path: string, data: any) {
  fs.outputJSONSync(path, data);
}

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

async function isContract(address: string): Promise<boolean> {
  try {
    const code = await getCode(address);
    const result = code !== '0x';
    return result;
  } catch (err) {
    return false;
  }
}

async function getCode(address: string, retries = 3): Promise<string> {
  try {
    if (cachedCode[address] !== undefined) {
      return cachedCode[address];
    }
    const code = await ethers.provider.getCode(address);
    cachedCode[address] = code;
    return code;
  } catch (err) {
    console.log(err);
    if (retries > 0) {
      console.log('retry for', address, retries);
      return getCode(address, retries - 1);
    }
    return '0x';
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function isGnosisSafe(address: string): Promise<boolean> {
  const code = await getCode(address);
  return code.length === 344 || code.length === 342;
}
