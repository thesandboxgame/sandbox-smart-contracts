import hre from 'hardhat';
import {BigNumber} from '@ethersproject/bignumber';

const {deployments} = hre;
const {read} = deployments;

const args = process.argv.slice(2);
const landSaleName = args[0];

(async () => {
  const deadline: BigNumber = await read(landSaleName, 'getExpiryTime()');
  const date: Date = new Date(deadline.toNumber() * 1000);
  if (hre.network.tags.testnet) {
    date.setUTCFullYear(date.getUTCFullYear() - 1);
  }
  console.log(date.toISOString());
})();
