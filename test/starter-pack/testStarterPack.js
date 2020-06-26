const {setupStarterPack} = require("./fixtures");
const {assert} = require("chai");
const {ethers, getNamedAccounts} = require("@nomiclabs/buidler");

const starterPackJSON = require("../../artifacts/StarterPack.json");
const starterPackABI = starterPackJSON.abi;
const starterPackbytecode = starterPackJSON.bytecode;

describe("StarterPack: Setup", function () {
  it.only("Returns a starterPack contract", async function () {
    const {starterPackContract: starterPack} = await setupStarterPack();
    assert.notEqual(starterPack.address, undefined);
  });

  it("should set the admin address correctly", async function () {
    const {starterPackContract: starterPack} = await setupStarterPack();
    const {starterPackAdmin} = await getNamedAccounts();
    const returnedAdmin = await starterPack.getAdmin();
    assert.equal(returnedAdmin, starterPackAdmin);
  });

  it.skip("should set the beneficiary address correctly", async function () {
    const {starterPackContract: starterPack} = await setupStarterPack();
    const {starterPackSaleBeneficiary} = await getNamedAccounts();
    // not implemented yet
    const returnedBeneficiary = await starterPack.beneficiary();
    assert.equal(returnedAdmin, starterPackSaleBeneficiary);
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
