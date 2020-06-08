const {assert} = require("chai-local");
const {setupEstateSale} = require("./fixtures");

function runCommonTests() {
  describe("EstateSale:Common", function () {
    it("the expiry time of the sale is correct", async function () {
      const {contracts, saleEnd} = await setupEstateSale("lands");
      const expiryTime = await contracts.estateSale.getExpiryTime();
      assert.equal(expiryTime, saleEnd, "Expiry time is wrong");
    });
  });
}

module.exports = {
  runCommonTests,
};
