const {setupStarterPack} = require("./fixtures");
const {assert} = require("chai");
const {getNamedAccounts} = require("@nomiclabs/buidler");

describe("StarterPack: Setup", function () {
  it("Returns a starterPack contract", async function () {
    const {starterPackContract: starterPack} = await setupStarterPack();
    assert.notEqual(starterPack.address, undefined);
  });

  it("should set the admin address correctly", async function () {
    const {starterPackContract: starterPack} = await setupStarterPack();
    const {starterPackAdmin} = await getNamedAccounts();
    const returnedAdmin = await starterPack.getAdmin();
    assert.equal(returnedAdmin, starterPackAdmin);
  });
});

// describe("Purchase"...
// it("should invalidate the nonce after 1 use", async function () {});
// it("should emit the Purchase event", async function () {});
// it("should fail if the nonce is reused", async function () {});

// describe("SetPrices"...
// it("should fail if called by other than the admin address", async function () {});

// describe("WithdrawAll"...
// it("should fail if called by other than the admin address", async function () {});
