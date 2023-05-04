/**
 * How to use:
 *  - yarn execute <NETWORK> ./scripts/gathering/presale-date.ts <LAND_PRESALE_NAME>
 *
 * LAND_PRESALE_NAME: ie: Land_PreSale_11_30
 */
import hre from 'hardhat';
import {BigNumber} from '@ethersproject/bignumber';

const {deployments} = hre;
const {read} = deployments;

const args = process.argv.slice(2);
const landSaleName = args[0];

void (async () => {
  const deadline: BigNumber = await read(landSaleName, 'getExpiryTime()');
  const date: Date = new Date(deadline.toNumber() * 1000);
  if (hre.network.tags.testnet) {
    date.setUTCFullYear(date.getUTCFullYear() - 1);
  }
  console.log(date.toISOString());
})();
