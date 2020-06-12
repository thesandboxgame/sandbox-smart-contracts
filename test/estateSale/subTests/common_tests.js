const {assert} = require("chai-local");
const {setupEstateSale} = require("./fixtures");
const {calculateLandHash} = require("../../../lib/merkleTreeHelper");

function runCommonTests() {
  describe("EstateSale:Common", function () {
    it("the expiry time of the sale is correct", async function () {
      const {contracts, saleEnd} = await setupEstateSale("lands");
      const expiryTime = await contracts.estateSale.getExpiryTime();
      assert.equal(expiryTime, saleEnd, "Expiry time is wrong");
    });

    it("CANNOT generate proof for Land not on sale", async function () {
      const {lands, tree} = await setupEstateSale("lands");
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
  });
}

module.exports = {
  runCommonTests,
};
