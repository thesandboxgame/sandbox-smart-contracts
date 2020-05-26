const {assert} = require("local-chai");
const {setupCatalystUsers} = require("./fixtures");
const {expectRevert, emptyBytes, waitFor} = require("local-utils");

const dummyHash = "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF";

describe("Catalyst:Minting", function () {
  it("creator mint Epic Asset", async function () {
    const {creator, catalysts} = await setupCatalystUsers();
    const packId = 0;
    const gemIds = [0, 0, 0];
    const quantity = 11;
    await waitFor(
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
  });
});
