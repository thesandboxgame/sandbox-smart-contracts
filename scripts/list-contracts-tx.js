require("dotenv");
const fs = require("fs");
const axios = require("axios");
const contractAddress = "0x1a802826F12D5b0128AA2E21689fcA84E8F57132";
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;

const fromBlockNumber = 10381489;
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
