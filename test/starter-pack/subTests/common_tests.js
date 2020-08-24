const {setupStarterPack, supplyStarterPack} = require("./fixtures");
const {assert, expect} = require("local-chai");
const {getNamedAccounts} = require("@nomiclabs/buidler");
const ethers = require("ethers");
const {BigNumber} = ethers;
const {waitFor, expectRevert, checERC20Balances} = require("local-utils");
const {starterPackPrices} = require("../../../data/starterPack");

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
      const {
        starterPackContract,
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
      } = setUp;

      await checERC20Balances(
        starterPackContract.address,
        {
          ERC20SubTokenCommon: [ERC20SubTokenCommon, 2],
          ERC20SubTokenRare: [ERC20SubTokenRare, 2],
          ERC20SubTokenEpic: [ERC20SubTokenEpic, 2],
          ERC20SubTokenLegendary: [ERC20SubTokenLegendary, 2],
          ERC20SubTokenPower: [ERC20SubTokenPower, 2],
          ERC20SubTokenDefense: [ERC20SubTokenDefense, 2],
          ERC20SubTokenSpeed: [ERC20SubTokenSpeed, 2],
          ERC20SubTokenMagic: [ERC20SubTokenMagic, 2],
          ERC20SubTokenLuck: [ERC20SubTokenLuck, 2],
        },
        async () => {
          await gemContract.batchMint(starterPackContract.address, [0, 1, 2, 3, 4], [2, 2, 2, 2, 2]);
          await catalystContract.batchMint(starterPackContract.address, [0, 1, 2, 3], [2, 2, 2, 2]);
        }
      );
    });

    it("user can check the balance of a catalyst ID owned by StarterPackV1", async function () {
      const {catalystContract, starterPackContract} = await setUp;
      const balance = await catalystContract.balanceOf(starterPackContract.address, 0);
      expect(balance).to.equal(8);
    });

    it("user can check the balance of a gem ID owned by StarterPackV1", async function () {
      const {gemContract, starterPackContract} = await setUp;
      const balance = await gemContract.balanceOf(starterPackContract.address, 1);
      expect(balance).to.equal(100);
    });

    it("user can check batch balances of catalyst IDs owned by StarterPackV1", async function () {
      const {catalystContract, starterPackContract} = await setUp;
      const balances = await catalystContract.balanceOfBatch(
        [
          starterPackContract.address,
          starterPackContract.address,
          starterPackContract.address,
          starterPackContract.address,
        ],
        [0, 1, 2, 3]
      );
      expect(balances[0]).to.equal(BigNumber.from(8));
      expect(balances[1]).to.equal(BigNumber.from(6));
      expect(balances[2]).to.equal(BigNumber.from(4));
      expect(balances[3]).to.equal(BigNumber.from(2));
    });

    it("user can check batch balances of gem IDs owned by StarterPackV1", async function () {
      const {gemContract, starterPackContract} = await setUp;
      const balances = await gemContract.balanceOfBatch(
        [
          starterPackContract.address,
          starterPackContract.address,
          starterPackContract.address,
          starterPackContract.address,
          starterPackContract.address,
        ],
        [0, 1, 2, 3, 4]
      );
      expect(balances[0]).to.equal(BigNumber.from(100));
      expect(balances[1]).to.equal(BigNumber.from(100));
      expect(balances[2]).to.equal(BigNumber.from(100));
      expect(balances[3]).to.equal(BigNumber.from(100));
      expect(balances[4]).to.equal(BigNumber.from(100));
    });

    it("cannot set prices if not admin", async function () {
      const {users} = setUp;
      await expectRevert(users[0].StarterPack.setPrices([50, 60, 70, 80], 42), "NOT_AUTHORIZED");
    });

    it("can set prices if admin", async function () {
      const {starterPackContractAsAdmin, starterPackContract} = setUp;
      const receipt = await waitFor(starterPackContractAsAdmin.setPrices([50, 60, 70, 80], 42));

      const eventsMatching = receipt.events.filter((event) => event.event === "SetPrices");
      expect(eventsMatching).to.have.lengthOf(1);
      const priceEvent = eventsMatching[0];
      expect(priceEvent.args[0][0]).to.equal(50);
      expect(priceEvent.args[0][1]).to.equal(60);
      expect(priceEvent.args[0][2]).to.equal(70);
      expect(priceEvent.args[0][3]).to.equal(80);
      expect(priceEvent.args[1]).to.equal(42);

      const latestPrices = await starterPackContract.getPrices();
      expect(latestPrices[1][0]).to.equal(50);
      expect(latestPrices[1][1]).to.equal(60);
      expect(latestPrices[1][2]).to.equal(70);
      expect(latestPrices[1][3]).to.equal(80);
      expect(latestPrices[3]).to.equal(42);
    });

    it("cannot withdrawAll if not admin", async function () {
      const {users} = setUp;
      await expectRevert(
        users[0].StarterPack.withdrawAll(users[0].address, [0, 1, 2, 3], [0, 1, 2, 3, 4]),
        "NOT_AUTHORIZED"
      );
    });

    it("can withdrawAll if admin", async function () {
      const {starterPackContractAsAdmin, starterPackAdmin, catalystContract, gemContract, starterPackContract} = setUp;

      // Catalyst ERC20SubToken contracts: "Common", "Rare", "Epic", "Legendary"
      const balanceCommonCatalyst = await catalystContract.balanceOf(starterPackAdmin, 0);
      const balanceRareCatalyst = await catalystContract.balanceOf(starterPackAdmin, 1);
      const balanceEpicCatalyst = await catalystContract.balanceOf(starterPackAdmin, 2);
      const balanceLegendaryCatalyst = await catalystContract.balanceOf(starterPackAdmin, 3);
      expect(balanceCommonCatalyst).to.equal(0);
      expect(balanceRareCatalyst).to.equal(0);
      expect(balanceEpicCatalyst).to.equal(0);
      expect(balanceLegendaryCatalyst).to.equal(0);

      // Gem ERC20SubToken contracts: "Power", "Defense", "Speed", "Magic", "Luck"
      const balancePowerGem = await gemContract.balanceOf(starterPackAdmin, 0);
      const balanceDefenseGem = await gemContract.balanceOf(starterPackAdmin, 1);
      const balanceSpeedGem = await gemContract.balanceOf(starterPackAdmin, 2);
      const balanceMagicGem = await gemContract.balanceOf(starterPackAdmin, 3);
      const balanceLuckGem = await gemContract.balanceOf(starterPackAdmin, 4);
      expect(balancePowerGem).to.equal(0);
      expect(balanceDefenseGem).to.equal(0);
      expect(balanceSpeedGem).to.equal(0);
      expect(balanceMagicGem).to.equal(0);
      expect(balanceLuckGem).to.equal(0);

      await starterPackContractAsAdmin.withdrawAll(starterPackAdmin, [0, 1, 2, 3], [0, 1, 2, 3, 4]);

      // Catalyst ERC20SubToken contracts: "Common", "Rare", "Epic", "Legendary"
      const balanceCommonCatalystAfterWithdrawal = await catalystContract.balanceOf(starterPackAdmin, 0);
      const balanceRareCatalystAfterWithdrawal = await catalystContract.balanceOf(starterPackAdmin, 1);
      const balanceEpicCatalystAfterWithdrawal = await catalystContract.balanceOf(starterPackAdmin, 2);
      const balanceLegendaryCatalystAfterWithdrawal = await catalystContract.balanceOf(starterPackAdmin, 3);
      expect(balanceCommonCatalystAfterWithdrawal).to.equal(8);
      expect(balanceRareCatalystAfterWithdrawal).to.equal(6);
      expect(balanceEpicCatalystAfterWithdrawal).to.equal(4);
      expect(balanceLegendaryCatalystAfterWithdrawal).to.equal(2);

      // Gem ERC20SubToken contracts: "Power", "Defense", "Speed", "Magic", "Luck"
      const balancePowerGemAfterWithdrawal = await gemContract.balanceOf(starterPackAdmin, 0);
      const balanceDefenseGemAfterWithdrawal = await gemContract.balanceOf(starterPackAdmin, 1);
      const balanceSpeedGemAfterWithdrawal = await gemContract.balanceOf(starterPackAdmin, 2);
      const balanceMagicGemAfterWithdrawal = await gemContract.balanceOf(starterPackAdmin, 3);
      const balanceLuckGemAfterWithdrawal = await gemContract.balanceOf(starterPackAdmin, 4);
      expect(balancePowerGemAfterWithdrawal).to.equal(100);
      expect(balanceDefenseGemAfterWithdrawal).to.equal(100);
      expect(balanceSpeedGemAfterWithdrawal).to.equal(100);
      expect(balanceMagicGemAfterWithdrawal).to.equal(100);
      expect(balanceLuckGemAfterWithdrawal).to.equal(100);

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
    });

    it("user can get the starterpack and Gem prices", async function () {
      const {users} = await setUp;
      const prices = await users[0].StarterPack.getPrices();
      const expectedPrices = starterPackPrices;
      expect(prices[0][0]).to.equal(expectedPrices[0]);
      expect(prices[0][1]).to.equal(expectedPrices[1]);
      expect(prices[0][2]).to.equal(expectedPrices[2]);
      expect(prices[0][3]).to.equal(expectedPrices[3]);
      expect(prices[1][0]).to.equal(expectedPrices[0]);
      expect(prices[1][1]).to.equal(expectedPrices[1]);
      expect(prices[1][2]).to.equal(expectedPrices[2]);
      expect(prices[1][3]).to.equal(expectedPrices[3]);
      expect(prices[2]).to.equal(BigNumber.from("42000000000000000000"));
    });
  });
}

module.exports = {
  runCommonTests,
};
