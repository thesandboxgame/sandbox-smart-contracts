const {setupStarterPack} = require("./fixtures");
const {assert} = require("chai");
const {getNamedAccounts} = require("@nomiclabs/buidler");
const {waitFor, expectRevert} = require("local-utils");
const ethers = require("ethers");
const {BigNumber} = ethers;

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
  const SignedMessage = {
    catalystIds: [0, 1, 2, 3],
    catalystQuantities: [1, 1, 1, 1],
    gemIds: [0, 1, 2, 3, 4],
    gemQuantities: [2, 2, 2, 2, 2],
    buyer: "",
    nonce: 1,
  };

  beforeEach(async function () {
    setUp = await setupStarterPack();
    const {starterPackContractAsAdmin} = setUp;
    await starterPackContractAsAdmin.setSANDEnabled(true);
  });

  it("should revert if the user does not have enough SAND", async function () {
    const {userWithoutSAND, sandContract} = setUp;
    SignedMessage.buyer = userWithoutSAND.address;
    const balance = await sandContract.balanceOf(userWithoutSAND.address);
    assert.ok(balance.eq(BigNumber.from(0)));
    await expectRevert(
      userWithoutSAND.StarterPack.purchaseWithSand(userWithoutSAND.address, SignedMessage, emptySignature),
      "not enough fund"
    );
  });

  it("purchase should revert if StarterpackV1.sol does not own any Catalysts & Gems", async function () {
    const {userWithSAND} = setUp;
    SignedMessage.buyer = userWithSAND.address;
    await expectRevert(
      userWithSAND.StarterPack.purchaseWithSand(userWithSAND.address, SignedMessage, emptySignature),
      "can't substract more than there is"
    );
  });

  it("should throw if SAND is not enabled", async function () {
    const {userWithSAND, starterPackContractAsAdmin} = setUp;
    SignedMessage.buyer = userWithSAND.address;
    await starterPackContractAsAdmin.setSANDEnabled(false);
    await expectRevert(
      userWithSAND.StarterPack.purchaseWithSand(userWithSAND.address, SignedMessage, emptySignature),
      "sand payments not enabled"
    );
  });

  it("cannot enable/disable SAND if not admin", async function () {
    const {userWithoutSAND, starterPackContractAsAdmin} = setUp;
    await starterPackContractAsAdmin.setSANDEnabled(false);
    await expectRevert(userWithoutSAND.StarterPack.setSANDEnabled(true), "only admin can enable/disable SAND");
  });

  // it("if StarterpackV1.sol owns Catalysts & Gems then listed purchasers should be able to purchase with SAND", async function () {
  //   // Mint Catalysts & Gems and send to StarterPackV1
  //   // Check Purchase event
  // });

  // it("should invalidate the nonce after 1 use", async function () {});
  // it("should fail if the nonce is reused", async function () {});
});

// describe("SetPrices"...
// it("should fail if called by other than the admin address", async function () {});

// describe("WithdrawAll"...
// it("should fail if called by other than the admin address", async function () {});
