const {assert} = require("chai-local");
const {setupLandSaleWithReferral} = require("./fixtures");
const {calculateLandHash} = require("../../../lib/merkleTreeHelper");

function runCommonTests() {
  describe("LandSaleWithReferral:Common", function () {
    it("the expiry time of the sale is correct", async function () {
      const {contracts, saleEnd} = await setupLandSaleWithReferral("lands");
      const expiryTime = await contracts.landSaleWithReferral.getExpiryTime();
      assert.equal(expiryTime, saleEnd, "Expiry time is wrong");
    });

    it("CANNOT generate proof for Land not on sale", async function () {
      const {lands, tree} = initialSetUp;
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
