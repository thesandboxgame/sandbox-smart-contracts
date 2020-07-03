const {setupStarterPack, supplyStarterPack} = require("./fixtures");
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

  it("StarterPackV1 can receive Catalysts and Gems", async function () { // TODO: change to use proper assertion (see prev comment from Ronan)
    // Mint Catalysts & Gems in fixture
    const {starterPackContract, catalystContract, gemContract} = await supplyStarterPack();

    // Catalyst ERC20SubToken contracts: "Common", "Rare", "Epic", "Legendary"
    const balanceCommonCatalyst = await catalystContract.balanceOf(starterPackContract.address, 0);
    const balanceRareCatalyst = await catalystContract.balanceOf(starterPackContract.address, 1);
    const balanceEpicCatalyst = await catalystContract.balanceOf(starterPackContract.address, 2);
    const balanceLegendaryCatalyst = await catalystContract.balanceOf(starterPackContract.address, 3);
    assert.ok(balanceCommonCatalyst.eq(BigNumber.from(4)));
    assert.ok(balanceRareCatalyst.eq(BigNumber.from(3)));
    assert.ok(balanceEpicCatalyst.eq(BigNumber.from(2)));
    assert.ok(balanceLegendaryCatalyst.eq(BigNumber.from(1)));

    // Gem ERC20SubToken contracts: "Power", "Defense", "Speed", "Magic", "Luck"
    const balancePowerGem = await gemContract.balanceOf(starterPackContract.address, 0);
    const balanceDefenseGem = await gemContract.balanceOf(starterPackContract.address, 1);
    const balanceSpeedGem = await gemContract.balanceOf(starterPackContract.address, 2);
    const balanceMagicGem = await gemContract.balanceOf(starterPackContract.address, 3);
    const balanceLuckGem = await gemContract.balanceOf(starterPackContract.address, 4);
    assert.ok(balancePowerGem.eq(BigNumber.from(100)));
    assert.ok(balanceDefenseGem.eq(BigNumber.from(100)));
    assert.ok(balanceSpeedGem.eq(BigNumber.from(100)));
    assert.ok(balanceMagicGem.eq(BigNumber.from(100)));
    assert.ok(balanceLuckGem.eq(BigNumber.from(100)));
  });

  // it("if StarterpackV1.sol owns Catalysts & Gems then listed purchasers should be able to purchase with SAND", async function () {
  //   // Mint Catalysts & Gems in fixture
  //   const {starterPackContract} = await supplyStarterPack();
  //   // Check balance of StarterPack
  //   // Check Purchase event
  // });

  // it("should invalidate the nonce after 1 use", async function () {});
  // it("should fail if the nonce is reused", async function () {});
});

// describe("SetPrices"...
// it("should fail if called by other than the admin address", async function () {});

// describe("WithdrawAll"...
// it("should fail if called by other than the admin address", async function () {});
