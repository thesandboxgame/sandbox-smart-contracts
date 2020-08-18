const {setupStarterPack, supplyStarterPack} = require("./fixtures");
const {assert, expect} = require("local-chai");
const {waitFor, expectRevert, increaseTime} = require("local-utils");
const ethers = require("ethers");
const {BigNumber} = ethers;
const {findEvents} = require("../../../lib/findEvents.js");
const {signPurchaseMessage} = require("../../../lib/purchaseMessageSigner");
const {privateKey} = require("./_testHelper");
const {starterPackPrices} = require("../../../data/starterPack");

function runDaiTests() {
  describe("StarterPack:PurchaseWithDAIEmptyStarterPack", function () {
    let setUp;
    let Message;

    const TestMessage = {
      catalystIds: [0, 1, 2, 3],
      catalystQuantities: [1, 1, 1, 1],
      gemIds: [0, 1, 2, 3, 4],
      gemQuantities: [2, 2, 2, 2, 2],
      nonce: 0,
    };

    beforeEach(async function () {
      setUp = await setupStarterPack();
      const {starterPackContractAsAdmin} = setUp;
      await starterPackContractAsAdmin.setDAIEnabled(true);
      Message = {...TestMessage};
    });

    it("should revert if the user does not have enough DAI", async function () {
      const {userWithoutDAI, daiContract} = setUp;
      const balance = await daiContract.balanceOf(userWithoutDAI.address);
      const dummySignature = signPurchaseMessage(privateKey, Message, userWithoutDAI.address);
      assert.ok(balance.eq(BigNumber.from(0)));
      await expectRevert(
        userWithoutDAI.StarterPack.purchaseWithDAI(userWithoutDAI.address, Message, dummySignature),
        "not enough fund"
      );
    });

    it("purchase should revert if StarterpackV1.sol does not own any Catalysts & Gems", async function () {
      const {userWithDAI} = setUp;
      const dummySignature = signPurchaseMessage(privateKey, Message, userWithDAI.address);
      await expectRevert(
        userWithDAI.StarterPack.purchaseWithDAI(userWithDAI.address, Message, dummySignature),
        "can't substract more than there is"
      );
    });

    it("should throw if DAI is not enabled", async function () {
      const {userWithDAI, starterPackContractAsAdmin} = setUp;
      const dummySignature = signPurchaseMessage(privateKey, Message, userWithDAI.address);
      await starterPackContractAsAdmin.setDAIEnabled(false);
      await expectRevert(
        userWithDAI.StarterPack.purchaseWithDAI(userWithDAI.address, Message, dummySignature),
        "DAI_IS_NOT_ENABLED"
      );
    });

    it("cannot enable/disable DAI if not admin", async function () {
      const {userWithoutDAI, starterPackContractAsAdmin} = setUp;
      await starterPackContractAsAdmin.setDAIEnabled(false);
      await expectRevert(userWithoutDAI.StarterPack.setDAIEnabled(true), "NOT_AUTHORIZED");
    });

    it("should revert if msg sender is not from or metaTX contract: DAI", async function () {
      const {userWithDAI, userWithoutDAI} = setUp;
      const dummySignature = signPurchaseMessage(privateKey, Message, userWithDAI.address);
      await expectRevert(
        userWithoutDAI.StarterPack.purchaseWithSand(userWithDAI.address, Message, dummySignature),
        "INVALID_SENDER"
      );
    });
  });

  describe("StarterPack:PurchaseWithDAISuppliedStarterPack", function () {
    let setUp;
    let Message;

    const TestMessage = {
      catalystIds: [0, 1, 2, 3],
      catalystQuantities: [1, 1, 1, 1],
      gemIds: [0, 1, 2, 3, 4],
      gemQuantities: [2, 2, 2, 2, 2],
      nonce: 0,
    };

    beforeEach(async function () {
      setUp = await supplyStarterPack();
      const {starterPackContractAsAdmin} = setUp;
      await starterPackContractAsAdmin.setDAIEnabled(true);
      Message = {...TestMessage};
    });

    it("if StarterpackV1.sol owns Catalysts & Gems then listed purchasers should be able to purchase with DAI with 1 Purchase event", async function () {
      const {
        userWithDAI,
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
        daiContract,
      } = await setUp;

      const dummySignature = signPurchaseMessage(privateKey, Message, userWithDAI.address);

      const receipt = await waitFor(
        userWithDAI.StarterPack.purchaseWithDAI(userWithDAI.address, Message, dummySignature)
      );
      const eventsMatching = receipt.events.filter((event) => event.event === "Purchase");
      assert.equal(eventsMatching.length, 1);

      // buyer
      expect(eventsMatching[0].args[0]).to.equal(userWithDAI.address);

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

      // nonce
      expect(eventsMatching[0].args[1][4]).to.equal(0);

      // token
      expect(eventsMatching[0].args[3]).to.equal(daiContract.address);

      // catalyst Transfer events
      const transferEventsMatchingCommon = await findEvents(ERC20SubTokenCommon, "Transfer", receipt.blockHash); // one Transfer event per subtoken
      const transferEventCommonCatalyst = transferEventsMatchingCommon[0];
      expect(transferEventCommonCatalyst.args[0]).to.equal(starterPackContract.address);
      expect(transferEventCommonCatalyst.args[1]).to.equal(userWithDAI.address);
      expect(transferEventCommonCatalyst.args[2]).to.equal(1);

      const transferEventsMatchingRare = await findEvents(ERC20SubTokenRare, "Transfer", receipt.blockHash); // one Transfer event per subtoken
      const transferEventRareCatalyst = transferEventsMatchingRare[0];
      expect(transferEventRareCatalyst.args[0]).to.equal(starterPackContract.address);
      expect(transferEventRareCatalyst.args[1]).to.equal(userWithDAI.address);
      expect(transferEventRareCatalyst.args[2]).to.equal(1);

      const transferEventsMatchingEpic = await findEvents(ERC20SubTokenEpic, "Transfer", receipt.blockHash); // one Transfer event per subtoken
      const transferEventEpicCatalyst = transferEventsMatchingEpic[0];
      expect(transferEventEpicCatalyst.args[0]).to.equal(starterPackContract.address);
      expect(transferEventEpicCatalyst.args[1]).to.equal(userWithDAI.address);
      expect(transferEventEpicCatalyst.args[2]).to.equal(1);

      const transferEventsMatchingLegendary = await findEvents(ERC20SubTokenLegendary, "Transfer", receipt.blockHash); // one Transfer event per subtoken
      const transferEventLegendaryCatalyst = transferEventsMatchingLegendary[0];
      expect(transferEventLegendaryCatalyst.args[0]).to.equal(starterPackContract.address);
      expect(transferEventLegendaryCatalyst.args[1]).to.equal(userWithDAI.address);
      expect(transferEventLegendaryCatalyst.args[2]).to.equal(1);

      // gem Transfer events
      const transferEventsMatchingPower = await findEvents(ERC20SubTokenPower, "Transfer", receipt.blockHash); // one Transfer event per subtoken
      const transferEventPowerGem = transferEventsMatchingPower[0];
      expect(transferEventPowerGem.args[0]).to.equal(starterPackContract.address);
      expect(transferEventPowerGem.args[1]).to.equal(userWithDAI.address);
      expect(transferEventPowerGem.args[2]).to.equal(2);

      const transferEventsMatchingDefense = await findEvents(ERC20SubTokenDefense, "Transfer", receipt.blockHash); // one Transfer event per subtoken
      const transferEventDefenseGem = transferEventsMatchingDefense[0];
      expect(transferEventDefenseGem.args[0]).to.equal(starterPackContract.address);
      expect(transferEventDefenseGem.args[1]).to.equal(userWithDAI.address);
      expect(transferEventDefenseGem.args[2]).to.equal(2);

      const transferEventsMatchingSpeed = await findEvents(ERC20SubTokenSpeed, "Transfer", receipt.blockHash); // one Transfer event per subtoken
      const transferEventSpeedGem = transferEventsMatchingSpeed[0];
      expect(transferEventSpeedGem.args[0]).to.equal(starterPackContract.address);
      expect(transferEventSpeedGem.args[1]).to.equal(userWithDAI.address);
      expect(transferEventSpeedGem.args[2]).to.equal(2);

      const transferEventsMatchingMagic = await findEvents(ERC20SubTokenMagic, "Transfer", receipt.blockHash); // one Transfer event per subtoken
      const transferEventMagicGem = transferEventsMatchingMagic[0];
      expect(transferEventMagicGem.args[0]).to.equal(starterPackContract.address);
      expect(transferEventMagicGem.args[1]).to.equal(userWithDAI.address);
      expect(transferEventMagicGem.args[2]).to.equal(2);

      const transferEventsMatchingLuck = await findEvents(ERC20SubTokenLuck, "Transfer", receipt.blockHash); // one Transfer event per subtoken
      const transferEventLuckGem = transferEventsMatchingLuck[0];
      expect(transferEventLuckGem.args[0]).to.equal(starterPackContract.address);
      expect(transferEventLuckGem.args[1]).to.equal(userWithDAI.address);
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
      const balanceCommonCatalyst = await catalystContract.balanceOf(userWithDAI.address, 0);
      const balanceRareCatalyst = await catalystContract.balanceOf(userWithDAI.address, 1);
      const balanceEpicCatalyst = await catalystContract.balanceOf(userWithDAI.address, 2);
      const balanceLegendaryCatalyst = await catalystContract.balanceOf(userWithDAI.address, 3);
      expect(balanceCommonCatalyst).to.equal(1);
      expect(balanceRareCatalyst).to.equal(1);
      expect(balanceEpicCatalyst).to.equal(1);
      expect(balanceLegendaryCatalyst).to.equal(1);
      const balancePowerGem = await gemContract.balanceOf(userWithDAI.address, 0);
      const balanceDefenseGem = await gemContract.balanceOf(userWithDAI.address, 1);
      const balanceSpeedGem = await gemContract.balanceOf(userWithDAI.address, 2);
      const balanceMagicGem = await gemContract.balanceOf(userWithDAI.address, 3);
      const balanceLuckGem = await gemContract.balanceOf(userWithDAI.address, 4);
      expect(balancePowerGem).to.equal(2);
      expect(balanceDefenseGem).to.equal(2);
      expect(balanceSpeedGem).to.equal(2);
      expect(balanceMagicGem).to.equal(2);
      expect(balanceLuckGem).to.equal(2);
    });

    it("purchase should invalidate the nonce after 1 use", async function () {
      const {userWithDAI, starterPackContract} = await setUp;

      const dummySignature = signPurchaseMessage(privateKey, Message, userWithDAI.address);
      const nonceBeforePurchase = await starterPackContract.getNonceByBuyer(userWithDAI.address, 0);
      expect(nonceBeforePurchase).to.equal(0);
      await userWithDAI.StarterPack.purchaseWithDAI(userWithDAI.address, Message, dummySignature);
      const nonceAfterPurchase = await starterPackContract.getNonceByBuyer(userWithDAI.address, 0);
      expect(nonceAfterPurchase).to.equal(1);
    });

    it("purchase should fail if the nonce is reused", async function () {
      const {userWithDAI} = await setUp;

      const dummySignature = signPurchaseMessage(privateKey, Message, userWithDAI.address);

      await userWithDAI.StarterPack.purchaseWithDAI(userWithDAI.address, Message, dummySignature);
      await expectRevert(
        userWithDAI.StarterPack.purchaseWithDAI(userWithDAI.address, Message, dummySignature),
        "INVALID_NONCE"
      );
    });

    it("sequential purchases should succeed with new nonce (as long as there are enough catalysts and gems)", async function () {
      const {userWithDAI} = await setUp;

      let dummySignature = signPurchaseMessage(privateKey, Message, userWithDAI.address);

      await userWithDAI.StarterPack.purchaseWithDAI(userWithDAI.address, Message, dummySignature);

      Message.nonce++;

      dummySignature = signPurchaseMessage(privateKey, Message, userWithDAI.address);

      await userWithDAI.StarterPack.purchaseWithDAI(userWithDAI.address, Message, dummySignature);
    });

    it("price change should be implemented after a delay", async function () {
      const {starterPackContractAsAdmin, userWithDAI, users} = setUp;
      const dummySignature = signPurchaseMessage(privateKey, Message, userWithDAI.address);
      await starterPackContractAsAdmin.setDAIEnabled(true);
      const newPrices = [
        BigNumber.from(300).mul("1000000000000000000"),
        BigNumber.from(500).mul("1000000000000000000"),
        BigNumber.from(800).mul("1000000000000000000"),
        BigNumber.from(1300).mul("1000000000000000000"),
      ];
      await starterPackContractAsAdmin.setPrices(newPrices);
      // buyer should still pay the old price for 1 hour
      const receipt = await waitFor(
        userWithDAI.StarterPack.purchaseWithDAI(userWithDAI.address, Message, dummySignature)
      );
      const eventsMatching = receipt.events.filter((event) => event.event === "Purchase");
      const totalExpectedPrice = starterPackPrices.reduce((p, v) => p.add(v), BigNumber.from(0));
      expect(eventsMatching[0].args[2]).to.equal(totalExpectedPrice);

      // prices are set but the new prices do not take effect for purchases yet
      const prices = await users[0].StarterPack.getStarterPackPrices();
      const expectedPrices = newPrices;
      expect(prices[0]).to.equal(expectedPrices[0]);
      expect(prices[1]).to.equal(expectedPrices[1]);
      expect(prices[2]).to.equal(expectedPrices[2]);
      expect(prices[3]).to.equal(expectedPrices[3]);

      const previousPrices = await users[0].StarterPack.getPreviousStarterPackPrices();
      const expectedPreviousPrices = starterPackPrices;
      expect(previousPrices[0]).to.equal(expectedPreviousPrices[0]);
      expect(previousPrices[1]).to.equal(expectedPreviousPrices[1]);
      expect(previousPrices[2]).to.equal(expectedPreviousPrices[2]);
      expect(previousPrices[3]).to.equal(expectedPreviousPrices[3]);

      // fast-forward 1 hour. now buyer should pay the new price
      await increaseTime(60 * 60);
      Message.nonce++;
      const dummySignature2 = signPurchaseMessage(privateKey, Message, userWithDAI.address);
      const receipt2 = await waitFor(
        userWithDAI.StarterPack.purchaseWithDAI(userWithDAI.address, Message, dummySignature2)
      );
      const eventsMatching2 = receipt2.events.filter((event) => event.event === "Purchase");
      const newTotalExpectedPrice = BigNumber.from(2900).mul("1000000000000000000");
      expect(eventsMatching2[0].args[2]).to.equal(newTotalExpectedPrice);

      // the set prices remain the same after the delay has occurred
      const pricesAfterDelay = await users[0].StarterPack.getStarterPackPrices();
      const expectedPricesAfterDelay = newPrices;
      expect(pricesAfterDelay[0]).to.equal(expectedPricesAfterDelay[0]);
      expect(pricesAfterDelay[1]).to.equal(expectedPricesAfterDelay[1]);
      expect(pricesAfterDelay[2]).to.equal(expectedPricesAfterDelay[2]);
      expect(pricesAfterDelay[3]).to.equal(expectedPricesAfterDelay[3]);

      const previousPricesAfterDelay = await users[0].StarterPack.getPreviousStarterPackPrices();
      const expectedPreviousPricesAfterDelay = starterPackPrices;
      expect(previousPricesAfterDelay[0]).to.equal(expectedPreviousPricesAfterDelay[0]);
      expect(previousPricesAfterDelay[1]).to.equal(expectedPreviousPricesAfterDelay[1]);
      expect(previousPricesAfterDelay[2]).to.equal(expectedPreviousPricesAfterDelay[2]);
      expect(previousPricesAfterDelay[3]).to.equal(expectedPreviousPricesAfterDelay[3]);
    });

    it("withdrawAll withdraws all remaining tokens after purchases have occurred", async function () {
      const {
        userWithDAI,
        starterPackContractAsAdmin,
        starterPackAdmin,
        catalystContract,
        gemContract,
        starterPackContract,
      } = setUp;

      const dummySignature = signPurchaseMessage(privateKey, Message, userWithDAI.address);

      await userWithDAI.StarterPack.purchaseWithDAI(userWithDAI.address, Message, dummySignature);

      await starterPackContractAsAdmin.withdrawAll(starterPackAdmin, [0, 1, 2, 3], [0, 1, 2, 3, 4]);

      // catalyst remaining balances
      const balanceCommonCatalystRemaining = await catalystContract.balanceOf(starterPackContract.address, 0);
      expect(balanceCommonCatalystRemaining).to.equal(0);
      const balanceRareCatalystRemaining = await catalystContract.balanceOf(starterPackContract.address, 1);
      expect(balanceRareCatalystRemaining).to.equal(0);
      const balanceRareEpicRemaining = await catalystContract.balanceOf(starterPackContract.address, 2);
      expect(balanceRareEpicRemaining).to.equal(0);
      const balanceLegendaryCatalystRemaining = await catalystContract.balanceOf(starterPackContract.address, 3);
      expect(balanceLegendaryCatalystRemaining).to.equal(0);

      // gem remaining balances
      const balancePowerGemRemaining = await gemContract.balanceOf(starterPackContract.address, 0);
      expect(balancePowerGemRemaining).to.equal(0);
      const balanceDefenseGemRemaining = await gemContract.balanceOf(starterPackContract.address, 1);
      expect(balanceDefenseGemRemaining).to.equal(0);
      const balanceSpeedGemRemaining = await gemContract.balanceOf(starterPackContract.address, 2);
      expect(balanceSpeedGemRemaining).to.equal(0);
      const balanceMagicGemRemaining = await gemContract.balanceOf(starterPackContract.address, 3);
      expect(balanceMagicGemRemaining).to.equal(0);
      const balanceLuckGemRemaining = await gemContract.balanceOf(starterPackContract.address, 4);
      expect(balanceLuckGemRemaining).to.equal(0);

      // admin balances
      const balanceCommonCatalyst = await catalystContract.balanceOf(starterPackAdmin, 0);
      const balanceRareCatalyst = await catalystContract.balanceOf(starterPackAdmin, 1);
      const balanceEpicCatalyst = await catalystContract.balanceOf(starterPackAdmin, 2);
      const balanceLegendaryCatalyst = await catalystContract.balanceOf(starterPackAdmin, 3);
      expect(balanceCommonCatalyst).to.equal(7);
      expect(balanceRareCatalyst).to.equal(5);
      expect(balanceEpicCatalyst).to.equal(3);
      expect(balanceLegendaryCatalyst).to.equal(1);
      const balancePowerGem = await gemContract.balanceOf(starterPackAdmin, 0);
      const balanceDefenseGem = await gemContract.balanceOf(starterPackAdmin, 1);
      const balanceSpeedGem = await gemContract.balanceOf(starterPackAdmin, 2);
      const balanceMagicGem = await gemContract.balanceOf(starterPackAdmin, 3);
      const balanceLuckGem = await gemContract.balanceOf(starterPackAdmin, 4);
      expect(balancePowerGem).to.equal(98);
      expect(balanceDefenseGem).to.equal(98);
      expect(balanceSpeedGem).to.equal(98);
      expect(balanceMagicGem).to.equal(98);
      expect(balanceLuckGem).to.equal(98);
    });

    it("cannot withdrawAll after purchase if not admin", async function () {
      const {users, userWithDAI} = setUp;

      const dummySignature = signPurchaseMessage(privateKey, Message, userWithDAI.address);

      await userWithDAI.StarterPack.purchaseWithDAI(userWithDAI.address, Message, dummySignature);

      await expectRevert(
        users[1].StarterPack.withdrawAll(users[1].address, [0, 1, 2, 3], [0, 1, 2, 3, 4]),
        "NOT_AUTHORIZED"
      );
    });
  });
}

module.exports = {
  runDaiTests,
};
