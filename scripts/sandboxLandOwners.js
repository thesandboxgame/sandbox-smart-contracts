const fetch = require("node-fetch");
const {createClient} = require("@urql/core");
const client = createClient({url: "https://api.thegraph.com/subgraphs/name/wighawag/eip721-subgraph", fetch});

(async () => {
  let sandboxOwners = [];
  let moreResult = true;
  let page = 0;
  while (moreResult) {
    const skip = page * 1000;
    const result = await client
      .query(
        `
      {
        ownerPerTokenContracts(where: {numTokens_gt: 0, contractAddress: "0x50f5474724e0ee42d9a4e711ccfb275809fd6d4a"} first: 1000 skip: ${skip}) {
          id
          address
          numTokens
        }
      }
  `,
        {
          /* vars */
        }
      )
      .toPromise();
    console.log({ownerPerTokenContracts: result.data.ownerPerTokenContracts.length});
    if (result.data.ownerPerTokenContracts.length < 1000) {
      moreResult = false;
    }
    sandboxOwners = sandboxOwners.concat(result.data.ownerPerTokenContracts);
    page++;
  }

  const owners = {};

  for (const owner of sandboxOwners) {
    const address = owner.id.split("_")[1];
    const numTokens = (owners[address] || 0) + parseInt(owner.numTokens);
    owners[address] = numTokens;
  }

  console.log(Object.entries(owners).reduce((p, c) => p + c[1], 0));

  // require("fs").writeFileSync("landowners.json", JSON.stringify(owners, null, "  "));

  const entries = Object.entries(owners)
    .filter((v) => v[1] > 0)
    .map((v) => {
      const numTokens = v[1];
      // console.log({numTokens, type: typeof numTokens});
      let amount = 0;
      if (numTokens <= 1) {
        amount = 500;
      } else if (numTokens <= 5) {
        amount = 1000;
      } else if (numTokens <= 250) {
        amount = 5000;
      } else if (numTokens <= 1000) {
        amount = 25000;
      } else {
        amount = 60000;
      }
      return [v[0], amount];
    });

  console.log(entries.length);
  // console.log(entries);

  const {write} = require("../lib/spreadsheet");
  const sheetId = {
    document: "1T11jSZj_CalJbuPhbjFFi-cg9gome78iftl_HKMvqZk",
    sheet: "Sheet1",
  };
  write(sheetId, {values: [["ADDRESSES", "AMOUNTS"]], range: "C1:D1"});
  write(sheetId, {
    values: entries,
    range: "C2:D" + (entries.length + 2),
  });
})();
