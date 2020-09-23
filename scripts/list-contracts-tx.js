require("dotenv");
const fs = require("fs");
const axios = require("axios");

const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;
const args = process.argv.slice(2);
const contractAddress = args[0];
const fromBlockNumber = args[1];
const offset = 1000;
(async () => {
  const txs = [];
  let page = 1;
  let more = true;
  let startBlock = fromBlockNumber;
  let lastTransaction;
  let fromTransactionIndex = 0;
  while (more) {
    const response = await axios.get(
      `https://api.etherscan.io/api?module=account&action=txlist&address=${contractAddress}&startblock=${startBlock}&endblock=99999999&page=${page}&offset=${offset}&sort=asc&apikey=${ETHERSCAN_API_KEY}`
    );
    const transactions = response.data.result;
    if (transactions) {
      for (const tx of transactions) {
        if (fromTransactionIndex > 0) {
          if (tx.transactionIndex < fromTransactionIndex) {
            continue;
          }
        }
        txs.push(tx);
      }
      const numTransactions = transactions.length;
      more = numTransactions > 0; // TODO max
      page++;
      lastTransaction = transactions[numTransactions - 1];
      fromTransactionIndex = 0;
    } else {
      if (
        response.status === "0" &&
        response.message === "Result window is too large, PageNo x Offset size must be less than or equal to 10000"
      ) {
        startBlock = lastTransaction.blockNumber;
        fromTransactionIndex = lastTransaction.transactionIndex + 1;
      } else {
        console.log(response.data);
        more = false;
      }
    }
  }
  fs.writeFileSync(`.transactions_${contractAddress}.json`, JSON.stringify(txs, null, "  "));
})();
