const {setupStarterPack, supplyStarterPack} = require("./fixtures");
const {assert, expect} = require("local-chai");
const {waitFor, expectRevert, zeroAddress, increaseTime} = require("local-utils");
const ethers = require("ethers");
const {BigNumber} = ethers;
const {findEvents} = require("../../../lib/findEvents.js");
const {signPurchaseMessage} = require("../../../lib/purchaseMessageSigner");
const {privateKey} = require("./_testHelper");

function runEtherTests() {
  describe("StarterPack:PurchaseWithETHEmptyStarterPack", function () {
    let setUp;

    const Message = {
      catalystIds: [0, 1, 2, 3],
      catalystQuantities: [10, 10, 10, 10],
      gemIds: [0, 1, 2, 3, 4],
      gemQuantities: [20, 20, 20, 20, 20],
      buyer: "",
      nonce: 0,
    };

    beforeEach(async function () {
      setUp = await setupStarterPack();
      const {starterPackContractAsAdmin} = setUp;
      await starterPackContractAsAdmin.setETHEnabled(true);
    });

    it("should revert if the user does not have enough ETH", async function () {
      const {users} = setUp;
      Message.buyer = users[0].address;
      const dummySignature = signPurchaseMessage(privateKey, Message);
      await expectRevert(
        users[0].StarterPack.purchaseWithETH(users[0].address, Message, dummySignature, {value: 0}),
        "NOT_ENOUGH_ETHER_SENT"
      );
    });

    it("purchase should revert if StarterpackV1.sol does not own any Catalysts & Gems", async function () {
      const {users} = setUp;
      Message.buyer = users[0].address;
      const dummySignature = signPurchaseMessage(privateKey, Message);
      await expectRevert(
        users[0].StarterPack.purchaseWithETH(users[0].address, Message, dummySignature, {value: 1000000}),
        "can't substract more than there is"
      );
    });

    it("should throw if ETH is not enabled", async function () {
      const {users, starterPackContractAsAdmin} = setUp;
      Message.buyer = users[0].address;
      const dummySignature = signPurchaseMessage(privateKey, Message);
      await starterPackContractAsAdmin.setETHEnabled(false);
      await expectRevert(
        users[0].StarterPack.purchaseWithETH(users[0].address, Message, dummySignature, {value: 1000000}),
        "ETHER_IS_NOT_ENABLED"
      );
    });

    it("cannot enable/disable ETH if not admin", async function () {
      const {users, starterPackContractAsAdmin} = setUp;
      await starterPackContractAsAdmin.setETHEnabled(false);
      await expectRevert(users[0].StarterPack.setETHEnabled(true), "ONLY_ADMIN_CAN_SET_ETH_ENABLED_OR_DISABLED");
    });
  });

  describe("StarterPack:PurchaseWithETHSuppliedStarterPack", function () {
    let setUp;

    const Message = {
      catalystIds: [0, 1, 2, 3],
      catalystQuantities: [1, 1, 1, 1],
      gemIds: [0, 1, 2, 3, 4],
      gemQuantities: [2, 2, 2, 2, 2],
      buyer: "",
      nonce: 0,
    };

    beforeEach(async function () {
      setUp = await supplyStarterPack();
      const {starterPackContractAsAdmin} = setUp;
      await starterPackContractAsAdmin.setETHEnabled(true);
    });

    it("if StarterpackV1.sol owns Catalysts & Gems then listed purchasers should be able to purchase with ETH with 1 Purchase event", async function () {
      const {
        users,
        catalystContract,
        gemContract,
        ERC20SubTokenCommon,
        ERC20SubTokenRare,
        ERC20SubTokenEpic,
        ERC20SubTokenLegendary,
        ERC20SubTokenPower,
        ERC20SubTokenDefense,
        ERC20SubTokenSpeed,
        ERC20SubTokenMagic,
        ERC20SubTokenLuck,
        starterPackContract,
      } = await setUp;
      Message.buyer = users[0].address;

      const dummySignature = signPurchaseMessage(privateKey, Message);

      const receipt = await waitFor(
        users[0].StarterPack.purchaseWithETH(users[0].address, Message, dummySignature, {value: 1000000})
      );
      const eventsMatching = receipt.events.filter((event) => event.event === "Purchase");
      assert.equal(eventsMatching.length, 1);

      // from
      expect(eventsMatching[0].args[0]).to.equal(users[0].address);

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
      expect(eventsMatching[0].args[1][4]).to.equal(users[0].address);

      // nonce
      expect(eventsMatching[0].args[1][5]).to.equal(0);

      // token
      expect(eventsMatching[0].args[3]).to.equal(zeroAddress);

      // catalyst Transfer events
      const transferEventsMatchingCommon = await findEvents(ERC20SubTokenCommon, "Transfer", receipt.blockHash); // one Transfer event per subtoken
      const transferEventCommonCatalyst = transferEventsMatchingCommon[0];
      expect(transferEventCommonCatalyst.args[0]).to.equal(starterPackContract.address);
      expect(transferEventCommonCatalyst.args[1]).to.equal(users[0].address);
      expect(transferEventCommonCatalyst.args[2]).to.equal(1);

      const transferEventsMatchingRare = await findEvents(ERC20SubTokenRare, "Transfer", receipt.blockHash); // one Transfer event per subtoken
      const transferEventRareCatalyst = transferEventsMatchingRare[0];
      expect(transferEventRareCatalyst.args[0]).to.equal(starterPackContract.address);
      expect(transferEventRareCatalyst.args[1]).to.equal(users[0].address);
      expect(transferEventRareCatalyst.args[2]).to.equal(1);

      const transferEventsMatchingEpic = await findEvents(ERC20SubTokenEpic, "Transfer", receipt.blockHash); // one Transfer event per subtoken
      const transferEventEpicCatalyst = transferEventsMatchingEpic[0];
      expect(transferEventEpicCatalyst.args[0]).to.equal(starterPackContract.address);
      expect(transferEventEpicCatalyst.args[1]).to.equal(users[0].address);
      expect(transferEventEpicCatalyst.args[2]).to.equal(1);

      const transferEventsMatchingLegendary = await findEvents(ERC20SubTokenLegendary, "Transfer", receipt.blockHash); // one Transfer event per subtoken
      const transferEventLegendaryCatalyst = transferEventsMatchingLegendary[0];
      expect(transferEventLegendaryCatalyst.args[0]).to.equal(starterPackContract.address);
      expect(transferEventLegendaryCatalyst.args[1]).to.equal(users[0].address);
      expect(transferEventLegendaryCatalyst.args[2]).to.equal(1);

      // gem Transfer events
      const transferEventsMatchingPower = await findEvents(ERC20SubTokenPower, "Transfer", receipt.blockHash); // one Transfer event per subtoken
      const transferEventPowerGem = transferEventsMatchingPower[0];
      expect(transferEventPowerGem.args[0]).to.equal(starterPackContract.address);
      expect(transferEventPowerGem.args[1]).to.equal(users[0].address);
      expect(transferEventPowerGem.args[2]).to.equal(2);

      const transferEventsMatchingDefense = await findEvents(ERC20SubTokenDefense, "Transfer", receipt.blockHash); // one Transfer event per subtoken
      const transferEventDefenseGem = transferEventsMatchingDefense[0];
      expect(transferEventDefenseGem.args[0]).to.equal(starterPackContract.address);
      expect(transferEventDefenseGem.args[1]).to.equal(users[0].address);
      expect(transferEventDefenseGem.args[2]).to.equal(2);

      const transferEventsMatchingSpeed = await findEvents(ERC20SubTokenSpeed, "Transfer", receipt.blockHash); // one Transfer event per subtoken
      const transferEventSpeedGem = transferEventsMatchingSpeed[0];
      expect(transferEventSpeedGem.args[0]).to.equal(starterPackContract.address);
      expect(transferEventSpeedGem.args[1]).to.equal(users[0].address);
      expect(transferEventSpeedGem.args[2]).to.equal(2);

      const transferEventsMatchingMagic = await findEvents(ERC20SubTokenMagic, "Transfer", receipt.blockHash); // one Transfer event per subtoken
      const transferEventMagicGem = transferEventsMatchingMagic[0];
      expect(transferEventMagicGem.args[0]).to.equal(starterPackContract.address);
      expect(transferEventMagicGem.args[1]).to.equal(users[0].address);
      expect(transferEventMagicGem.args[2]).to.equal(2);

      const transferEventsMatchingLuck = await findEvents(ERC20SubTokenLuck, "Transfer", receipt.blockHash); // one Transfer event per subtoken
      const transferEventLuckGem = transferEventsMatchingLuck[0];
      expect(transferEventLuckGem.args[0]).to.equal(starterPackContract.address);
      expect(transferEventLuckGem.args[1]).to.equal(users[0].address);
      expect(transferEventLuckGem.args[2]).to.equal(2);

      // catalyst remaining balances
      const balanceCommonCatalystRemaining = await catalystContract.balanceOf(starterPackContract.address, 0);
      expect(balanceCommonCatalystRemaining).to.equal(7);

      const balanceRareCatalystRemaining = await catalystContract.balanceOf(starterPackContract.address, 1);
      expect(balanceRareCatalystRemaining).to.equal(5);

      const balanceRareEpicRemaining = await catalystContract.balanceOf(starterPackContract.address, 2);
      expect(balanceRareEpicRemaining).to.equal(3);

      const balanceLegendaryCatalystRemaining = await catalystContract.balanceOf(starterPackContract.address, 3);
      expect(balanceLegendaryCatalystRemaining).to.equal(1);

      // gem remaining balances
      const balancePowerGemRemaining = await gemContract.balanceOf(starterPackContract.address, 0);
      expect(balancePowerGemRemaining).to.equal(98);

      const balanceDefenseGemRemaining = await gemContract.balanceOf(starterPackContract.address, 1);
      expect(balanceDefenseGemRemaining).to.equal(98);

      const balanceSpeedGemRemaining = await gemContract.balanceOf(starterPackContract.address, 2);
      expect(balanceSpeedGemRemaining).to.equal(98);

      const balanceMagicGemRemaining = await gemContract.balanceOf(starterPackContract.address, 3);
      expect(balanceMagicGemRemaining).to.equal(98);

      const balanceLuckGemRemaining = await gemContract.balanceOf(starterPackContract.address, 4);
      expect(balanceLuckGemRemaining).to.equal(98);

      // user balances
      const balanceCommonCatalyst = await catalystContract.balanceOf(users[0].address, 0);
      const balanceRareCatalyst = await catalystContract.balanceOf(users[0].address, 1);
      const balanceEpicCatalyst = await catalystContract.balanceOf(users[0].address, 2);
      const balanceLegendaryCatalyst = await catalystContract.balanceOf(users[0].address, 3);
      expect(balanceCommonCatalyst).to.equal(1);
      expect(balanceRareCatalyst).to.equal(1);
      expect(balanceEpicCatalyst).to.equal(1);
      expect(balanceLegendaryCatalyst).to.equal(1);
      const balancePowerGem = await gemContract.balanceOf(users[0].address, 0);
      const balanceDefenseGem = await gemContract.balanceOf(users[0].address, 1);
      const balanceSpeedGem = await gemContract.balanceOf(users[0].address, 2);
      const balanceMagicGem = await gemContract.balanceOf(users[0].address, 3);
      const balanceLuckGem = await gemContract.balanceOf(users[0].address, 4);
      expect(balancePowerGem).to.equal(2);
      expect(balanceDefenseGem).to.equal(2);
      expect(balanceSpeedGem).to.equal(2);
      expect(balanceMagicGem).to.equal(2);
      expect(balanceLuckGem).to.equal(2);
    });

    it("purchase should invalidate the nonce after 1 use", async function () {
      const {users, starterPackContract} = await setUp;
      Message.buyer = users[0].address;

      const dummySignature = signPurchaseMessage(privateKey, Message);
      const nonceBeforePurchase = await starterPackContract.getNonceByBuyer(users[0].address, 0);
      expect(nonceBeforePurchase).to.equal(0);
      await users[0].StarterPack.purchaseWithETH(users[0].address, Message, dummySignature, {value: 1000000});
      const nonceAfterPurchase = await starterPackContract.getNonceByBuyer(users[0].address, 0);
      expect(nonceAfterPurchase).to.equal(1);
    });

    it("purchase should fail if the nonce is reused", async function () {
      const {users} = await setUp;
      Message.buyer = users[0].address;

      const dummySignature = signPurchaseMessage(privateKey, Message);

      await users[0].StarterPack.purchaseWithETH(users[0].address, Message, dummySignature, {value: 1000000});
      await expectRevert(
        users[0].StarterPack.purchaseWithETH(users[0].address, Message, dummySignature, {value: 1000000}),
        "INVALID_NONCE"
      );
    });

    it("sequential purchases should succeed with new nonce (as long as there are enough catalysts and gems)", async function () {
      const {users} = await setUp;
      Message.buyer = users[0].address;

      let dummySignature = signPurchaseMessage(privateKey, Message);

      await users[0].StarterPack.purchaseWithETH(users[0].address, Message, dummySignature, {value: 1000000});

      Message.nonce++;

      dummySignature = signPurchaseMessage(privateKey, Message);

      await users[0].StarterPack.purchaseWithETH(users[0].address, Message, dummySignature, {value: 1000000});
    });

    it("price change should be implemented after a delay", async function () {
      const {starterPackContractAsAdmin, users} = setUp;
      Message.buyer = users[0].address;
      Message.nonce = 0;
      const dummySignature = signPurchaseMessage(privateKey, Message);
      await starterPackContractAsAdmin.setETHEnabled(true);
      const newPrices = [BigNumber.from(300), BigNumber.from(500), BigNumber.from(800), BigNumber.from(1300)];
      await starterPackContractAsAdmin.setPrices(newPrices);
      // buyer should still pay the old price for 1 hour
      const receipt = await waitFor(
        users[0].StarterPack.purchaseWithETH(users[0].address, Message, dummySignature, {value: 1000000})
      );
      const eventsMatching = receipt.events.filter((event) => event.event === "Purchase");
      const totalExpectedPrice = BigNumber.from(1600);
      expect(eventsMatching[0].args[2]).to.equal(totalExpectedPrice);

      // fast-forward 1 hour. now buyer should pay the new price
      await increaseTime(60 * 60);
      Message.nonce++;
      const dummySignature2 = signPurchaseMessage(privateKey, Message);
      const receipt2 = await waitFor(
        users[0].StarterPack.purchaseWithETH(users[0].address, Message, dummySignature2, {value: 1000000})
      );
      const eventsMatching2 = receipt2.events.filter((event) => event.event === "Purchase");
      const newTotalExpectedPrice = 2900;
      expect(eventsMatching2[0].args[2]).to.equal(newTotalExpectedPrice);
    });
  });
}

module.exports = {
  runEtherTests,
};
