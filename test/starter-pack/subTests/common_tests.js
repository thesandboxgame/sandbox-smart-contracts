const {setupStarterPack, supplyStarterPack} = require("./fixtures");
const {assert, expect} = require("local-chai");
const {getNamedAccounts} = require("@nomiclabs/buidler");
const ethers = require("ethers");
const {BigNumber} = ethers;
const {waitFor, expectRevert} = require("local-utils");

function runCommonTests() {
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

  describe("StarterPack:SuppliedStarterPack", function () {
    let setUp;

    beforeEach(async function () {
      setUp = await supplyStarterPack();
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

    it("user can check the balance of a catalyst ID owned by StarterPackV1", async function () {
      const {userWithSAND} = await setUp;
      const balance = await userWithSAND.StarterPack.checkCatalystBalance(0);
      expect(balance).to.equal(8);
    });

    it("user can check the balance of a gem ID owned by StarterPackV1", async function () {
      const {userWithSAND} = await setUp;
      const balance = await userWithSAND.StarterPack.checkGemBalance(1);
      expect(balance).to.equal(100);
    });

    it("user can check batch balances of catalyst IDs owned by StarterPackV1", async function () {
      const {userWithSAND} = await setUp;
      const balances = await userWithSAND.StarterPack.checkCatalystBatchBalances([0, 1, 2, 3]);
      expect(balances[0]).to.equal(BigNumber.from(8));
      expect(balances[1]).to.equal(BigNumber.from(6));
      expect(balances[2]).to.equal(BigNumber.from(4));
      expect(balances[3]).to.equal(BigNumber.from(2));
    });

    it("user can check batch balances of gem IDs owned by StarterPackV1", async function () {
      const {users} = await setUp;
      const balances = await users[0].StarterPack.checkGemBatchBalances([0, 1, 2, 3]);
      expect(balances[0]).to.equal(BigNumber.from(100));
      expect(balances[1]).to.equal(BigNumber.from(100));
      expect(balances[2]).to.equal(BigNumber.from(100));
      expect(balances[3]).to.equal(BigNumber.from(100));
    });

    it("cannot set prices if not admin", async function () {
      const {users} = setUp;
      await expectRevert(users[0].StarterPack.setPrices([50, 60, 70, 80]), "ONLY_ADMIN_CAN_CHANGE_STARTERPACK_PRICES");
    });

    it("can set prices if admin", async function () {
      const {starterPackContractAsAdmin, starterPackContract} = setUp;
      const receipt = await waitFor(starterPackContractAsAdmin.setPrices([50, 60, 70, 80]));

      const eventsMatching = receipt.events.filter((event) => event.event === "SetPrices");
      expect(eventsMatching).to.have.lengthOf(1);
      const priceEvent = eventsMatching[0];
      expect(priceEvent.args[0][0]).to.equal(50);
      expect(priceEvent.args[0][1]).to.equal(60);
      expect(priceEvent.args[0][2]).to.equal(70);
      expect(priceEvent.args[0][3]).to.equal(80);

      const latestPrices = await starterPackContract.getStarterPackPrices();
      expect(latestPrices[0]).to.equal(50);
      expect(latestPrices[1]).to.equal(60);
      expect(latestPrices[2]).to.equal(70);
      expect(latestPrices[3]).to.equal(80);
    });
  });
}

module.exports = {
  runCommonTests,
};
