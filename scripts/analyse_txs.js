const fs = require("fs");
const {BigNumber} = require("@ethersproject/bignumber");
const stringify = require("csv-stringify/lib/sync");

const fileName = ".transactions_0x1a802826F12D5b0128AA2E21689fcA84E8F57132.json";

const txs = JSON.parse(fs.readFileSync(fileName).toString());

const froms = {};
let numBuyers = 0;
const failedFroms = {};
let numFailedBuyers = 0;

let numFailure = 0;
let numFailurePreSuccess = 0;
let firsSuccessBlockNumber = 0;
let numSuccess = 0;
let totalGasFailedPreSuccess = 0;
let totalGasFailed = 0;
let totalGasSuccess = 0;
let totalETHGasFailedPreSuccess = BigNumber.from(0);
let totalETHGasFailed = BigNumber.from(0);
let totalETHGasSuccess = BigNumber.from(0);
for (const tx of txs) {
  const blockNumber = parseInt(tx.blockNumber, 10);
  const gasUsed = parseInt(tx.gasUsed, 10);
  const ETHGasUsed = BigNumber.from(gasUsed).mul(tx.gasPrice);
  let currentTotalPerUser = froms[tx.from];
  if (!currentTotalPerUser) {
    currentTotalPerUser = BigNumber.from(0);
    numBuyers++;
  }
  froms[tx.from] = currentTotalPerUser.add(ETHGasUsed);
  if (tx.isError === "1" || tx.txreceipt_status === "0") {
    numFailure++;
    totalGasFailed += gasUsed;
    totalETHGasFailed = totalETHGasFailed.add(ETHGasUsed);
    if (firsSuccessBlockNumber == 0 || blockNumber < firsSuccessBlockNumber) {
      numFailurePreSuccess++;
      totalGasFailedPreSuccess += gasUsed;
      totalETHGasFailedPreSuccess = totalETHGasFailedPreSuccess.add(ETHGasUsed);
    }
    let currentTotalPerUser = failedFroms[tx.from];
    if (!currentTotalPerUser) {
      currentTotalPerUser = BigNumber.from(0);
      numFailedBuyers++;
    }
    failedFroms[tx.from] = currentTotalPerUser.add(ETHGasUsed);
  } else {
    numSuccess++;
    totalGasSuccess += gasUsed;
    totalETHGasSuccess = totalETHGasSuccess.add(ETHGasUsed);
    if (firsSuccessBlockNumber === 0) {
      firsSuccessBlockNumber = blockNumber;
    }
  }
}

function $(wei) {
  return wei.mul(227).div("10000000000000000").toNumber() / 100;
}

function eth(wei) {
  return wei.div("1000000000000000").toNumber() / 1000;
}

console.log({
  numBuyers,
  numFailedBuyers,
  numFailure,
  numFailurePreSuccess,
  firsSuccessBlockNumber,
  numSuccess,
  totalGasFailed,
  totalGasFailedPreSuccess,
  totalGasSuccess,
  totalETHGasFailed: eth(totalETHGasFailed),
  totalETHGasFailedPreSuccess: eth(totalETHGasFailedPreSuccess),
  totalETHGasSuccess: eth(totalETHGasSuccess),
  totalETHGasFailed$: $(totalETHGasFailed),
  totalETHGasFailedPreSuccess$: $(totalETHGasFailedPreSuccess),
  totalETHGasSuccess$: $(totalETHGasSuccess),
});

const refundList = Object.entries(failedFroms).map((a) => [a[0], a[1].toString()]);
console.log({
  refundList,
});

const result = stringify(refundList, {
  columns: [
    {key: "0", header: "address"},
    {key: "1", header: "wei"},
  ],
  header: true,
});
fs.writeFileSync("refund_list.csv", result);

const check = refundList.reduce((p, a) => BigNumber.from(a[1]).add(p), 0);
console.log({check: check.toString()});
