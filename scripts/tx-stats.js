const fs = require("fs");
const parse = require("csv-parse/lib/sync");
const {ethers} = require("@nomiclabs/buidler");

const fetch = require("node-fetch");
const {createClient} = require("@urql/core");
// const {pipe, subscribe} = require("wonka");

const client = createClient({url: "https://api.thegraph.com/subgraphs/name/pixowl/sandbox-stats", fetch});

const provider = ethers.provider;

const args = process.argv.slice(2);
const csvData = fs.readFileSync(args[0]).toString();

const records = parse(csvData, {
  columns: true,
  skip_empty_lines: true,
});

let counter = 0;
let numFound = 0;
let numReplaced = 0;
(async () => {
  for (const record of records) {
    // console.log(record.transactionHash);
    const txReceipt = await provider.getTransaction(record.transactionHash);
    if (txReceipt) {
      // TODO check success ?
      numFound++;
      record.txReceipt = txReceipt;
      // console.log(txReceipt);
    } else {
      const topLeftX = parseInt(record.X, 10) + 204;
      const topLeftY = parseInt(record.Y, 10) + 204;
      const id = topLeftX + topLeftY * 408;
      // console.log(`checking purchase of (${topLeftX}, ${topLeftY}) (id: ${id}) (size : ${record.size})`);
      // or with toPromise, which also limits this to one result
      const result = await client
        .query(
          `
        {

          landPurchases(where: {id: ${id}}) {
            buyer
            timestamp
            to
          }
        }        
        `,
          {
            /* vars */
          }
        )
        .toPromise();
      const landPurchases = result.data.landPurchases;
      const landPurchase = landPurchases[0];
      if (landPurchases.length == 0) {
        console.log(`no purchase of (${topLeftX}, ${topLeftY}) (id: ${id}) (size : ${record.size})`);
      } else if (landPurchases.length > 1) {
        console.log("multiple purchase ?", {landPurchases});
      }
      if (landPurchase) {
        if (
          landPurchase.buyer.toLowerCase() === record.address.toLowerCase() ||
          landPurchase.to.toLowerCase() === record.address.toLowerCase() // accept to
        ) {
          record.replaced = true;
          record.txReceipt = "replaced"; // TODO
          numFound++;
          numReplaced++;
        } else {
          console.log(
            `diff purchase of (${topLeftX}, ${topLeftY}) (id: ${id}) (size : ${record.size}) ${record.transactionHash}`
          );
          console.log({landPurchase});
          const date = new Date();
          date.setTime(landPurchase.timestamp * 1000);
          console.log({date});
          const timeDiff =
            parseInt(landPurchase.timestamp, 10) - new Date(record.createdAt + "  GMT+00:00").getTime() / 1000;
          console.log(
            `diferent buyer ${record.address} VS ${landPurchase.buyer} timeDiff : ${timeDiff} s (${
              Math.floor((timeDiff / 60) * 100) / 100
            } min)`
          );
        }
      }
    }
    counter++;
    print(`${numFound} / ${counter} (${numReplaced})`);
  }

  console.log("num tx : ", records.length);
  console.log("num tx with receipt : ", records.filter((v) => v.txReceipt).length);
})();

function print(msg) {
  process.stdout.clearLine();
  process.stdout.cursorTo(0);
  process.stdout.write(msg);
}
