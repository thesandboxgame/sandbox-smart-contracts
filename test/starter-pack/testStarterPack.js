const {setupStarterPack} = require("./fixtures");
const {assert} = require("chai");
const {getNamedAccounts} = require("@nomiclabs/buidler");
const {waitFor, expectRevert} = require("local-utils");

const emptySignature = "0x";

describe("StarterPack:Setup", function () {
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

describe("StarterPack:PurchaseWithSand", function () {
  let setUp;
  beforeEach(async function () {
    setUp = await setupStarterPack();
    await setUp.starterPackContractAsAdmin.setSANDEnabled(true);
  });

  it("should revert if the user does not have enough SAND", async function () {
    const {users} = setUp;
    expectRevert(
      await users[0].StarterPack.purchaseWithSand(
        users[0].address,
        users[0].address,
        [0, 1, 2, 3],
        [1, 1, 1, 1],
        [0, 1, 2, 3, 4],
        [1, 1, 1, 1, 1],
        1,
        emptySignature
      ),
      "Not enough funds allowed"
    );
  });

  it("should throw if purchases are not enabled", async function () {
    const {users, starterPackContractAsAdmin} = setUp;
    await starterPackContractAsAdmin.setSANDEnabled(false);
    expectRevert(
      await users[0].StarterPack.purchaseWithSand(
        users[0].address,
        users[0].address,
        [0, 1, 2, 3],
        [1, 1, 1, 1],
        [0, 1, 2, 3, 4],
        [1, 1, 1, 1, 1],
        1,
        emptySignature
      ),
      "sand payments not enabled"
    );
  });

  it("should enable purchases for user with SAND", async function () {
    const {users} = setUp;
    const receipt = waitFor(
      await users[0].StarterPack.purchaseWithSand(
        users[0].address,
        users[0].address,
        [0, 1, 2, 3],
        [1, 1, 1, 1],
        [0, 1, 2, 3, 4],
        [1, 1, 1, 1, 1],
        1,
        emptySignature
      )
    );
    console.log(receipt);
  });

  // it("should throw if SAND is not enabled", async function () {});
  // it("cannot enable/disable SAND if not admin", async function () {});
  // it("should invalidate the nonce after 1 use", async function () {});
  // it("should emit the Purchase event", async function () {});
  // it("should fail if the nonce is reused", async function () {});
});

// describe("SetPrices"...
// it("should fail if called by other than the admin address", async function () {});

// describe("WithdrawAll"...
// it("should fail if called by other than the admin address", async function () {});
