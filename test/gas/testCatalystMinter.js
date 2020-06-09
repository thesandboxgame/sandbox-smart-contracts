const {setupCatalystUsers} = require("../catalyst/fixtures");
const {emptyBytes, waitFor} = require("local-utils");

const dummyHash = "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF";

describe("GAS:Catalyst:Minting", function () {
  const gasReport = {};
  function record(name, {gasUsed}) {
    gasReport[name] = gasUsed.toNumber(); // TODO average...
  }
  after(function () {
    console.log(JSON.stringify(gasReport, null, "  "));
  });

  it.skip("creator mint Asset", async function () {
    const {creator, catalysts} = await setupCatalystUsers();
    const packId = 0;
    const gemIds = [0, 0, 0];
    const quantity = 11;
    const receipt = await waitFor(
      creator.CatalystMinter.mint(
        creator.address,
        packId,
        dummyHash,
        catalysts.Epic.address,
        gemIds,
        quantity,
        creator.address,
        emptyBytes
      )
    );
    record("mintSingle EPIC", receipt);
  });

  it.skip("creator mint many Asset", async function () {
    const {creator, catalysts} = await setupCatalystUsers();
    const packId = 0;
    const assets = [];
    for (let i = 0; i < 16; i++) {
      assets.push({
        gemIds: [i % 5],
        quantity: 200 + i,
        catalystToken: catalysts.Common.address,
      });
    }
    for (let i = 0; i < 11; i++) {
      assets.push({
        gemIds: [(i + 1) % 5, (i + 3) % 5],
        quantity: 60 + i,
        catalystToken: catalysts.Rare.address,
      });
    }
    for (let i = 0; i < 5; i++) {
      assets.push({
        gemIds: [(i + 1) % 5, (i + 3) % 5, (i + 2) % 5],
        quantity: 10 + i,
        catalystToken: catalysts.Epic.address,
      });
    }
    const receipt = await waitFor(
      creator.CatalystMinter.mintMultiple(creator.address, packId, dummyHash, assets, creator.address, emptyBytes)
    );
    record("mintMultiple 16,11,5", receipt);
  });
});
