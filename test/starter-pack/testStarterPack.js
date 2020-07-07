const {setupStarterPack, supplyStarterPack} = require("./fixtures");
const {assert} = require("chai");
const {getNamedAccounts} = require("@nomiclabs/buidler");
const {waitFor, expectRevert, emptyBytes, mine} = require("local-utils");
const ethers = require("ethers");
const {BigNumber} = ethers;
const {findEvents} = require("../../lib/findEvents.js");

const emptySignature = emptyBytes;

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

describe("StarterPack:PurchaseWithSandEmptyStarterPack", function () {
  let setUp;
  const Message = {
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
    Message.buyer = userWithoutSAND.address;
    const balance = await sandContract.balanceOf(userWithoutSAND.address);
    assert.ok(balance.eq(BigNumber.from(0)));
    await expectRevert(
      userWithoutSAND.StarterPack.purchaseWithSand(userWithoutSAND.address, Message, emptySignature),
      "not enough fund"
    );
  });

  it("purchase should revert if StarterpackV1.sol does not own any Catalysts & Gems", async function () {
    const {userWithSAND} = setUp;
    Message.buyer = userWithSAND.address;
    await expectRevert(
      userWithSAND.StarterPack.purchaseWithSand(userWithSAND.address, Message, emptySignature),
      "can't substract more than there is"
    );
  });

  it("should throw if SAND is not enabled", async function () {
    const {userWithSAND, starterPackContractAsAdmin} = setUp;
    Message.buyer = userWithSAND.address;
    await starterPackContractAsAdmin.setSANDEnabled(false);
    await expectRevert(
      userWithSAND.StarterPack.purchaseWithSand(userWithSAND.address, Message, emptySignature),
      "sand payments not enabled"
    );
  });

  it("cannot enable/disable SAND if not admin", async function () {
    const {userWithoutSAND, starterPackContractAsAdmin} = setUp;
    await starterPackContractAsAdmin.setSANDEnabled(false);
    await expectRevert(userWithoutSAND.StarterPack.setSANDEnabled(true), "only admin can enable/disable SAND");
  });
});

describe("StarterPack:PurchaseWithSandSuppliedStarterPack", function () {
  let setUp;
  const Message = {
    catalystIds: [0, 1, 2, 3],
    catalystQuantities: [1, 1, 1, 1],
    gemIds: [0, 1, 2, 3, 4],
    gemQuantities: [2, 2, 2, 2, 2],
    buyer: "",
    nonce: 1,
  };

  beforeEach(async function () {
    setUp = await supplyStarterPack();
    const {starterPackContractAsAdmin} = setUp;
    await starterPackContractAsAdmin.setSANDEnabled(true);
  });

  it("StarterPackV1 can receive Catalysts and Gems", async function () {
    // TODO: change to use assertion with better error message for BigNumber comparisons

    // Mint Catalysts & Gems in fixture
    const {starterPackContract, catalystContract, gemContract} = setUp;

    // Catalyst ERC20SubToken contracts: "Common", "Rare", "Epic", "Legendary"
    const balanceCommonCatalyst = await catalystContract.balanceOf(starterPackContract.address, 0);
    const balanceRareCatalyst = await catalystContract.balanceOf(starterPackContract.address, 1);
    const balanceEpicCatalyst = await catalystContract.balanceOf(starterPackContract.address, 2);
    const balanceLegendaryCatalyst = await catalystContract.balanceOf(starterPackContract.address, 3);
    assert.ok(balanceCommonCatalyst.eq(BigNumber.from(8)));
    assert.ok(balanceRareCatalyst.eq(BigNumber.from(6)));
    assert.ok(balanceEpicCatalyst.eq(BigNumber.from(4)));
    assert.ok(balanceLegendaryCatalyst.eq(BigNumber.from(2)));

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

  it("if StarterpackV1.sol owns Catalysts & Gems then listed purchasers should be able to purchase with SAND with 1 Purchase event", async function () {
    const {
      userWithSAND,
      catalystContract,
      gemContract,
      ERC20SubTokenCommon,
      ERC20SubTokenPower,
      starterPackContract,
    } = await setUp;
    Message.buyer = userWithSAND.address;
    const receipt = await waitFor(
      userWithSAND.StarterPack.purchaseWithSand(userWithSAND.address, Message, emptySignature)
    );
    const eventsMatching = receipt.events.filter((event) => event.event === "Purchase");
    assert.equal(eventsMatching.length, 1);

    // from
    assert.equal(eventsMatching[0].args[0], userWithSAND.address);

    // catalystIds
    assert.ok(eventsMatching[0].args[1][0][0].eq(BigNumber.from(0)));
    assert.ok(eventsMatching[0].args[1][0][1].eq(BigNumber.from(1)));
    assert.ok(eventsMatching[0].args[1][0][2].eq(BigNumber.from(2)));
    assert.ok(eventsMatching[0].args[1][0][3].eq(BigNumber.from(3)));

    // catalystQuantities
    assert.ok(eventsMatching[0].args[1][1][0].eq(BigNumber.from(1)));
    assert.ok(eventsMatching[0].args[1][1][1].eq(BigNumber.from(1)));
    assert.ok(eventsMatching[0].args[1][1][2].eq(BigNumber.from(1)));
    assert.ok(eventsMatching[0].args[1][1][3].eq(BigNumber.from(1)));

    // gemIds
    assert.ok(eventsMatching[0].args[1][2][0].eq(BigNumber.from(0)));
    assert.ok(eventsMatching[0].args[1][2][1].eq(BigNumber.from(1)));
    assert.ok(eventsMatching[0].args[1][2][2].eq(BigNumber.from(2)));
    assert.ok(eventsMatching[0].args[1][2][3].eq(BigNumber.from(3)));
    assert.ok(eventsMatching[0].args[1][2][4].eq(BigNumber.from(4)));

    // gemQuantities
    assert.ok(eventsMatching[0].args[1][3][0].eq(BigNumber.from(2)));
    assert.ok(eventsMatching[0].args[1][3][1].eq(BigNumber.from(2)));
    assert.ok(eventsMatching[0].args[1][3][2].eq(BigNumber.from(2)));
    assert.ok(eventsMatching[0].args[1][3][3].eq(BigNumber.from(2)));
    assert.ok(eventsMatching[0].args[1][3][4].eq(BigNumber.from(2)));

    // buyer
    assert.equal(eventsMatching[0].args[1][4], userWithSAND.address);

    // nonce
    assert.ok(eventsMatching[0].args[1][5].eq(BigNumber.from(1)));

    // transfer events

    // one of the catalyst Transfer events
    const transferEventsMatching = await findEvents(ERC20SubTokenCommon, "Transfer", receipt.blockHash); // one Transfer event per subtoken
    const transferEventCommonCatalyst = transferEventsMatching[0];
    assert.equal(transferEventCommonCatalyst.args[0], starterPackContract.address, starterPackContract.address);
    assert.equal(transferEventCommonCatalyst.args[1], userWithSAND.address);
    assert.ok(transferEventCommonCatalyst.args[2].eq(BigNumber.from(1)));
    // one of the gem Transfer events
    const secondTransferEventsMatching = await findEvents(ERC20SubTokenPower, "Transfer", receipt.blockHash); // one Transfer event per subtoken
    const transferEventPowerGem = secondTransferEventsMatching[0];
    assert.equal(transferEventPowerGem.args[0], starterPackContract.address, starterPackContract.address);
    assert.equal(transferEventPowerGem.args[1], userWithSAND.address);
    assert.ok(transferEventPowerGem.args[2].eq(BigNumber.from(2)));

    // user balances TODO: fix user balances

    // const balanceCommonCatalystRemaining = await catalystContract.balanceOf(starterPackContract.address, 0);
    // assert.ok(balanceCommonCatalystRemaining.eq(BigNumber.from(7)));

    // const balancePowerGemRemaining = await gemContract.balanceOf(starterPackContract.address, 0);
    // assert.ok(balancePowerGemRemaining.eq(BigNumber.from(98)));

    // const balanceRareCatalyst = await catalystContract.balanceOf(userWithSAND.address, 1);
    // const balanceEpicCatalyst = await catalystContract.balanceOf(userWithSAND.address, 2);
    // const balanceLegendaryCatalyst = await catalystContract.balanceOf(userWithSAND.address, 3);
    // assert.ok(balanceCommonCatalyst.eq(BigNumber.from(1)));
    // assert.ok(balanceRareCatalyst.eq(BigNumber.from(1)));
    // assert.ok(balanceEpicCatalyst.eq(BigNumber.from(1)));
    // assert.ok(balanceLegendaryCatalyst.eq(BigNumber.from(1)));
    // const balancePowerGem = await gemContract.balanceOf(userWithSAND.address, 0);
    // const balanceDefenseGem = await gemContract.balanceOf(userWithSAND.address, 1);
    // const balanceSpeedGem = await gemContract.balanceOf(userWithSAND.address, 2);
    // const balanceMagicGem = await gemContract.balanceOf(userWithSAND.address, 3);
    // const balanceLuckGem = await gemContract.balanceOf(userWithSAND.address, 4);
    // assert.ok(balancePowerGem.eq(BigNumber.from(2)));
    // assert.ok(balanceDefenseGem.eq(BigNumber.from(2)));
    // assert.ok(balanceSpeedGem.eq(BigNumber.from(2)));
    // assert.ok(balanceMagicGem.eq(BigNumber.from(2)));
    // assert.ok(balanceLuckGem.eq(BigNumber.from(2)));
  });

  // it("should invalidate the nonce after 1 use", async function () {});
  // it("should fail if the nonce is reused", async function () {});
});

// describe("SetPrices"...
// it("should fail if called by other than the admin address", async function () {});

// describe("WithdrawAll"...
// it("should fail if called by other than the admin address", async function () {});
