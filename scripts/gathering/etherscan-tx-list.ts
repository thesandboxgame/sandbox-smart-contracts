/**
 * How to use:
 *  - yarn execute <NETWORK> ./scripts/gathering/etherscan-tx-list.ts <CONTRACT_ADDRESS> <FROM_DATE> [<TO_DATE>]
 * DATE should be an ISO string (ie: 2021-08-08T00:00:00.000Z)
 * TO_DATE is optional
 *
 * output will be found in ./tmp/transactions_<CONTRACT_ADDRESS>.json
 */
import 'dotenv/config';
import {BigNumber} from 'ethers';
import fs from 'fs-extra';
import {ethers} from 'hardhat';
import {Etherscan} from '../utils/etherscan';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const EthDater = require('ethereum-block-by-date');

const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;
const args = process.argv.slice(2);
const contractAddress = args[0];
const fromDate = args[1];
const toDate = args[2] || new Date().toISOString();

async function getBlockNumber(date: string) {
  const dater = new EthDater(ethers.provider);
  const {block} = await dater.getDate(date, false);
  return block;
}

void (async () => {
  if (!fromDate) throw new Error('From date must be provided');
  const fromBlock = await getBlockNumber(fromDate);
  const toBlock = await getBlockNumber(toDate);
  const etherscan = new Etherscan(ETHERSCAN_API_KEY || '');
  const txs = await etherscan.transactionsFrom(
    contractAddress,
    parseInt(fromBlock),
    parseInt(toBlock)
  );
  // approve and call to specific land sale contract
  // .then((txs) =>
  //   txs.filter(
  //     (tx) =>
  //       tx.isError === '1' &&
  //       tx.input.startsWith('0xcae9ca51') &&
  //       tx.input.includes('79d8964087ef6c2d935331c493ace87a933ccda4')
  //   )
  // );
  let totalGas = BigNumber.from(0);
  const expenders: {
    [address: string]: {txCount: number; totalGas: BigNumber};
  } = {};
  const mappedExpenders: Array<{
    address: string;
    txCount: number;
    totalGas: string;
  }> = [];
  txs.forEach((tx) => {
    const gasPaid = BigNumber.from(tx.gasUsed).mul(BigNumber.from(tx.gasPrice));
    totalGas = totalGas.add(gasPaid);
    if (!expenders[tx.from])
      expenders[tx.from] = {txCount: 0, totalGas: BigNumber.from(0)};
    expenders[tx.from] = {
      txCount: expenders[tx.from].txCount + 1,
      totalGas: expenders[tx.from].totalGas.add(gasPaid),
    };
  });
  console.log('Total gas (ETH):', ethers.utils.formatEther(totalGas));
  for (const address in expenders) {
    mappedExpenders.push({
      address,
      ...expenders[address],
      totalGas: ethers.utils.formatEther(expenders[address].totalGas),
    });
  }
  await fs.outputJSON(`tmp/transactions_${contractAddress}.json`, txs);
  await fs.outputJSON(
    `tmp/transactions_${contractAddress}_expenders.json`,
    mappedExpenders.sort((a, b) => a.txCount - b.txCount)
  );
})();
