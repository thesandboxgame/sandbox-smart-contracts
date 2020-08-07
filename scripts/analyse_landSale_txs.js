const fs = require("fs");
const {BigNumber} = require("@ethersproject/bignumber");
const {defaultAbiCoder} = require("@ethersproject/abi");
const stringify = require("csv-stringify/lib/sync");

const args = process.argv.slice(2);
const fileName = args[0];

const txs = JSON.parse(fs.readFileSync(fileName).toString());

const gas = {};

for (const tx of txs) {
  if (!tx.input || !tx.input.startsWith("0xc2bddf26")) {
    continue;
  }
  const data = defaultAbiCoder.decode(
    ["address", "address", "address", "uint256", "uint256", "uint256", "uint256", "bytes32", "bytes32[]", "bytes"],
    "0x" + tx.input.slice(10)
  );
  const size = data[5];
  const referral = data[9];
  const isReferral = referral && referral != "0x";
  const gasUsed = parseInt(tx.gasUsed, 10);
  const id = (isReferral ? "referral" : "") + size;
  if (tx.isError === "1" || tx.txreceipt_status === "0") {
  } else {
    const g = (gas[id] = gas[id] || {total: 0, num: 0, average: 0, max: 0, min: 0});
    g.total += gasUsed;
    g.num++;
    g.average = g.total / g.num;
    g.max = Math.max(g.max, gasUsed);
    const min = g.min === 0 ? gasUsed + 1 : g.min;
    g.min = Math.min(min, gasUsed);
  }
}

console.log(JSON.stringify(gas, null, "  "));
