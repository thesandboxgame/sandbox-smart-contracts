const {assert} = require("chai-local");
const {setupLandSaleWithReferral} = require("./fixtures");

function runCommonTests() {
  describe("LandSaleWithReferral:Common", function () {
    it("the expiry time of the sale is correct", async function () {
      const {contracts, saleEnd} = await setupLandSaleWithReferral("lands");
      const expiryTime = await contracts.landSaleWithReferral.getExpiryTime();
      assert.equal(expiryTime, saleEnd, "Expiry time is wrong");
    });
  });
}

module.exports = {
  runCommonTests,
};
