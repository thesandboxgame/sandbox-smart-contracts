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
})
  // .slice(0, 2) // TODO remove
  .map((record) => {
    const topLeftX = parseInt(record.X, 10) + 204;
    const topLeftY = parseInt(record.Y, 10) + 204;
    const landQuadId = topLeftX + topLeftY * 408;
    return {
      ...record,
      createdAt: new Date(record.createdAt + "  GMT+00:00").getTime() / 1000,
      topLeftX,
      topLeftY,
      landQuadId,
    };
  })
  .sort((a, b) => {
    a.createdAt - b.createdAt;
  });

let counter = 0;
let numNotFound = 0;
let numFound = 0;
let numReplaced = 0;
(async () => {
  const replacements = {};
  const failedAttempts = {};
  for (const record of records) {
    const id = record.landQuadId;

    const landString = `${record.topLeftX}, ${record.topLeftY}) (id: ${record.landQuadId}) (size : ${record.size}`;
    const txReceipt = await provider.getTransactionReceipt(record.transactionHash);
    if (!txReceipt) {
      numNotFound++;
      record.txNotFound = true;
    }
    record.txSuccess = txReceipt && txReceipt.status == 1;
    record.txReceipt = txReceipt;
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
      console.log(`no purchase of (${landString})`);
      if (record.txSuccess) {
        console.error("tx went through ?");
      }
    } else if (landPurchases.length > 1) {
      console.error("multiple purchase ?", {landPurchases});
    }
    if (landPurchase) {
      if (
        landPurchase.buyer.toLowerCase() === record.address.toLowerCase() ||
        landPurchase.to.toLowerCase() === record.address.toLowerCase() // accept to
      ) {
        if (!record.txSuccess) {
          record.replaced = true;
          numReplaced++;
        }
        numFound++;
      } else {
        if (record.txSuccess) {
          console.error("tx should have failed");
        }
        const date = new Date();
        date.setTime(landPurchase.timestamp * 1000);
        const timeDiff = parseInt(landPurchase.timestamp, 10) - record.createdAt;
        console.log(
          `${record.address} VS ${landPurchase.buyer} timeDiff : ${Math.floor((timeDiff / 60) * 100) / 100} min`
        );
        const replacement = {
          success: landPurchase.buyer.toLowerCase(),
          failure: record.address.toLowerCase(),
        };
        if (replacements[id]) {
          if (replacements[id].success !== replacement.success || replacements[id].failure !== replacement.failure) {
            console.error({replacement, replacementPresent: replacements[id]});
          }
        } else {
          replacements[id] = replacement;
        }
      }
    }

    if (record.txSuccess) {
      const failedAttempt = failedAttempts[id];
      if (failedAttempt) {
        console.log(`failed attempted ${failedAttempt.address} VS ${record.address}`);
        const replacement = {
          success: record.address.toLowerCase(),
          failure: failedAttempt.address.toLowerCase(),
        };
        if (replacements[id]) {
          if (replacements[id].success !== replacement.success || replacements[id].failure !== replacement.failure) {
            console.error({replacement, replacementPresent: replacements[id]});
          }
        } else {
          replacements[id] = replacement;
        }
      }
    } else {
      failedAttempts[id] = record;
    }

    counter++;
    print(`${numFound} / ${counter} (${numReplaced})`);
  }

  console.log("");
  console.log({numNotFound});
  console.log("num tx : ", records.length);
  console.log("num tx with receipt : ", records.filter((v) => v.txReceipt).length);
})();

function print(msg) {
  process.stdout.clearLine();
  process.stdout.cursorTo(0);
  process.stdout.write(msg);
}
