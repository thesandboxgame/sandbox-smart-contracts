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
  while (more) {
    const response = await axios.get(
      `https://api.etherscan.io/api?module=account&action=txlist&address=${contractAddress}&startblock=${fromBlockNumber}&endblock=99999999&page=${page}&offset=${offset}&sort=asc&apikey=${ETHERSCAN_API_KEY}`
    );
    for (const tx of response.data.result) {
      txs.push(tx);
    }
    more = response.data.result.length > 0;
    page++;
  }
  fs.writeFileSync(`.transactions_${contractAddress}.json`, JSON.stringify(txs, null, "  "));
})();
