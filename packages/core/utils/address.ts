import fs from 'fs-extra';
import {ethers} from 'hardhat';

const cachedCode: {[address: string]: string} =
  fs.readJSONSync('tmp/cachedCode.json', {throws: false}) || {};

export async function isContract(address: string): Promise<boolean> {
  try {
    const code = await getCode(address);
    const result = code !== '0x';
    return result;
  } catch (err) {
    return false;
  }
}

export async function isGnosisSafe(address: string): Promise<boolean> {
  const code = await getCode(address);
  return code.length === 344 || code.length === 342;
}

export async function getCode(address: string, retries = 3): Promise<string> {
  try {
    if (cachedCode[address] !== undefined) {
      return cachedCode[address];
    }
    const code = await ethers.provider.getCode(address);
    cachedCode[address] = code;
    fs.outputJSONSync('tmp/cachedCode.json', cachedCode);
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
