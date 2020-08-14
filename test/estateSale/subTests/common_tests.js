const {assert, expect} = require("local-chai");
const {expectRevert} = require("local-utils");
const {setupEstateSale} = require("./fixtures");
const {calculateLandHash} = require("../../../lib/merkleTreeHelper");

function runCommonTests(landSaleName) {
  describe(landSaleName + ":Common", function () {
    it("the expiry time of the sale is correct", async function () {
      const {contracts, saleEnd} = await setupEstateSale(landSaleName, "lands");
      const expiryTime = await contracts.estateSale.getExpiryTime();
      assert.equal(expiryTime, saleEnd, "Expiry time is wrong");
    });

    it("CANNOT generate proof for Land not on sale", async function () {
      const {lands, tree} = await setupEstateSale(landSaleName, "lands");
      assert.throws(
        () =>
          tree.getProof(
            calculateLandHash({
              x: lands[5].x,
              y: lands[5].y,
              size: lands[5].size === 1 ? 3 : lands[5].size / 3,
              price: lands[5].price,
              salt: lands[5].salt,
            })
          ),
        "Leaf not found"
      );
    });

    it("admin can set a SAND price multiplier", async function () {
      const {SandAdmin, users} = await setupEstateSale(landSaleName, "lands");
      await SandAdmin.EstateSale.rebalanceSand("1432");
      const result = await users[0].EstateSale.getSandMultiplier();
      expect(result).to.equal("1432");
    });

    it("CANNOT set a SAND price multiplier if not admin", async function () {
      const {users} = await setupEstateSale(landSaleName, "lands");
      await expectRevert(users[0].EstateSale.rebalanceSand("1432"), "NOT_AUTHORIZED");
    });

    it("can get the SAND price multiplier", async function () {
      const {users} = await setupEstateSale(landSaleName, "lands");
      const result = await users[0].EstateSale.getSandMultiplier();
      expect(result).to.equal("1000");
    });
  });
}

module.exports = {
  runCommonTests,
};
