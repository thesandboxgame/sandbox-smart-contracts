const {setupStarterPack, supplyStarterPack} = require("./fixtures");
const {assert, expect} = require("local-chai");
const {waitFor, expectRevert} = require("local-utils");
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
      catalystQuantities: [1, 1, 1, 1],
      gemIds: [0, 1, 2, 3, 4],
      gemQuantities: [2, 2, 2, 2, 2],
      buyer: "",
      nonce: 0,
    };

    beforeEach(async function () {
      setUp = await setupStarterPack();
      const {starterPackContractAsAdmin} = setUp;
      await starterPackContractAsAdmin.setETHEnabled(true);
    });

    it("should revert if the user does not have enough ETH", async function () {});

    it("purchase should revert if StarterpackV1.sol does not own any Catalysts & Gems", async function () {});

    it("should throw if ETH is not enabled", async function () {});

    it("cannot enable/disable ETH if not admin", async function () {});
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

    it("if StarterpackV1.sol owns Catalysts & Gems then listed purchasers should be able to purchase with ETH with 1 Purchase event", async function () {});

    it("purchase should invalidate the nonce after 1 use", async function () {});

    it("purchase should fail if the nonce is reused", async function () {});

    it("sequential purchases should succeed with new nonce (as long as there are enough catalysts and gems)", async function () {});
  });
}

module.exports = {
  runEtherTests,
};
