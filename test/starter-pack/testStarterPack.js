const {setupStarterPack, supplyStarterPack} = require("./fixtures");
const {assert, expect} = require("local-chai");
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
    // Mint Catalysts & Gems in fixture
    const {starterPackContract, catalystContract, gemContract} = setUp;

    // Catalyst ERC20SubToken contracts: "Common", "Rare", "Epic", "Legendary"
    const balanceCommonCatalyst = await catalystContract.balanceOf(starterPackContract.address, 0);
    const balanceRareCatalyst = await catalystContract.balanceOf(starterPackContract.address, 1);
    const balanceEpicCatalyst = await catalystContract.balanceOf(starterPackContract.address, 2);
    const balanceLegendaryCatalyst = await catalystContract.balanceOf(starterPackContract.address, 3);
    expect(balanceCommonCatalyst).to.equal(8);
    expect(balanceRareCatalyst).to.equal(6);
    expect(balanceEpicCatalyst).to.equal(4);
    expect(balanceLegendaryCatalyst).to.equal(2);

    // Gem ERC20SubToken contracts: "Power", "Defense", "Speed", "Magic", "Luck"
    const balancePowerGem = await gemContract.balanceOf(starterPackContract.address, 0);
    const balanceDefenseGem = await gemContract.balanceOf(starterPackContract.address, 1);
    const balanceSpeedGem = await gemContract.balanceOf(starterPackContract.address, 2);
    const balanceMagicGem = await gemContract.balanceOf(starterPackContract.address, 3);
    const balanceLuckGem = await gemContract.balanceOf(starterPackContract.address, 4);
    expect(balancePowerGem).to.equal(100);
    expect(balanceDefenseGem).to.equal(100);
    expect(balanceSpeedGem).to.equal(100);
    expect(balanceMagicGem).to.equal(100);
    expect(balanceLuckGem).to.equal(100);
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
    expect(eventsMatching[0].args[0]).to.equal(userWithSAND.address);

    // catalystIds
    expect(eventsMatching[0].args[1][0][0]).to.equal(0);
    expect(eventsMatching[0].args[1][0][1]).to.equal(1);
    expect(eventsMatching[0].args[1][0][2]).to.equal(2);
    expect(eventsMatching[0].args[1][0][3]).to.equal(3);

    // catalystQuantities
    expect(eventsMatching[0].args[1][1][0]).to.equal(1);
    expect(eventsMatching[0].args[1][1][1]).to.equal(1);
    expect(eventsMatching[0].args[1][1][2]).to.equal(1);
    expect(eventsMatching[0].args[1][1][3]).to.equal(1);

    // gemIds
    expect(eventsMatching[0].args[1][2][0]).to.equal(0);
    expect(eventsMatching[0].args[1][2][1]).to.equal(1);
    expect(eventsMatching[0].args[1][2][2]).to.equal(2);
    expect(eventsMatching[0].args[1][2][3]).to.equal(3);
    expect(eventsMatching[0].args[1][2][4]).to.equal(4);

    // gemQuantities
    expect(eventsMatching[0].args[1][3][0]).to.equal(2);
    expect(eventsMatching[0].args[1][3][1]).to.equal(2);
    expect(eventsMatching[0].args[1][3][2]).to.equal(2);
    expect(eventsMatching[0].args[1][3][3]).to.equal(2);
    expect(eventsMatching[0].args[1][3][4]).to.equal(2);

    // buyer
    expect(eventsMatching[0].args[1][4]).to.equal(userWithSAND.address);

    // nonce
    expect(eventsMatching[0].args[1][5]).to.equal(1);

    // transfer events

    // one of the catalyst Transfer events
    const transferEventsMatching = await findEvents(ERC20SubTokenCommon, "Transfer", receipt.blockHash); // one Transfer event per subtoken
    const transferEventCommonCatalyst = transferEventsMatching[0];
    expect(transferEventCommonCatalyst.args[0]).to.equal(starterPackContract.address);
    expect(transferEventCommonCatalyst.args[1]).to.equal(userWithSAND.address);
    expect(transferEventCommonCatalyst.args[2]).to.equal(1);
    // one of the gem Transfer events
    const secondTransferEventsMatching = await findEvents(ERC20SubTokenPower, "Transfer", receipt.blockHash); // one Transfer event per subtoken
    const transferEventPowerGem = secondTransferEventsMatching[0];
    expect(transferEventPowerGem.args[0]).to.equal(starterPackContract.address);
    expect(transferEventPowerGem.args[1]).to.equal(userWithSAND.address);
    expect(transferEventPowerGem.args[2]).to.equal(2);

    // user balances TODO: fix user balances
    // const balanceCommonCatalystRemaining = await catalystContract.balanceOf(starterPackContract.address, 0);
    // expect(balanceCommonCatalystRemaining).to.equal(7);

    // const balancePowerGemRemaining = await gemContract.balanceOf(starterPackContract.address, 0);
    // expect(balancePowerGemRemaining).to.equal(98);

    // const balanceCommonCatalyst = await catalystContract.balanceOf(userWithSAND.address, 0);
    // const balanceRareCatalyst = await catalystContract.balanceOf(userWithSAND.address, 1);
    // const balanceEpicCatalyst = await catalystContract.balanceOf(userWithSAND.address, 2);
    // const balanceLegendaryCatalyst = await catalystContract.balanceOf(userWithSAND.address, 3);
    // expect(balanceCommonCatalyst).to.equal(1);
    // expect(balanceRareCatalyst).to.equal(1);
    // expect(balanceEpicCatalyst).to.equal(1);
    // expect(balanceLegendaryCatalyst).to.equal(1);
    // const balancePowerGem = await gemContract.balanceOf(userWithSAND.address, 0);
    // const balanceDefenseGem = await gemContract.balanceOf(userWithSAND.address, 1);
    // const balanceSpeedGem = await gemContract.balanceOf(userWithSAND.address, 2);
    // const balanceMagicGem = await gemContract.balanceOf(userWithSAND.address, 3);
    // const balanceLuckGem = await gemContract.balanceOf(userWithSAND.address, 4);
    // expect(balancePowerGem).to.equal(2);
    // expect(balanceDefenseGem).to.equal(2);
    // expect(balanceSpeedGem).to.equal(2);
    // expect(balanceMagicGem).to.equal(2);
    // expect(balanceLuckGem).to.equal(2);
  });

  // it("should invalidate the nonce after 1 use", async function () {});
  // it("should fail if the nonce is reused", async function () {});
});

// describe("SetPrices"...
// it("should fail if called by other than the admin address", async function () {});

// describe("WithdrawAll"...
// it("should fail if called by other than the admin address", async function () {});
