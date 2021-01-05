import 'dotenv/config';
import fs from 'fs';
import {Etherscan} from '../utils/etherscan';

const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;
const args = process.argv.slice(2);
const contractAddress = args[0];
const fromBlockNumber = args[1];

(async () => {
  const etherscan = new Etherscan(ETHERSCAN_API_KEY || '');
  const txs = await etherscan.transactionsFrom(
    contractAddress,
    parseInt(fromBlockNumber)
  );
  fs.writeFileSync(
    `tmp/transactions_${contractAddress}.json`,
    JSON.stringify(txs, null, '  ')
  );
})();
