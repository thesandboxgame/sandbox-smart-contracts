const {assert} = require("chai-local");
const {setupLandSaleWithReferral} = require("./fixtures");

describe("testLandSaleWithReferral", function () {
  let initialSetUp;
  describe("--> Eth tests", function () {
    beforeEach(async function () {
      initialSetUp = await setupLandSaleWithReferral();
      return initialSetUp;
    });

    // const {
    //   landSaleWithReferralContract,
    //   tree,
    //   landSaleContract,
    //   landContract,
    //   sandContract,
    //   fakeDAIContract,
    //   landSaleAdmin,
    //   landSaleBeneficiary,
    //   landAdmin,
    //   sandAdmin,
    //   others,
    // } = initialSetUp;

    it("ETH is enabled", async function () {
      const {landSaleWithReferralContract, others} = initialSetUp;

      // Ether is set to true as default in LandSaleWithReferral.sol
      // others[1] account is
      const isETHEnabled = await landSaleWithReferralContract
        .connect(landSaleWithReferralContract.provider.getSigner(others[1]))
        .functions.isETHEnabled();

      assert.ok(isETHEnabled, "ETH should be enabled");
    });

    it("ETH can be disabled", async function () {
      const {landSaleWithReferralContract, landSaleAdmin, others} = initialSetUp;
      await landSaleWithReferralContract
        .connect(landSaleWithReferralContract.provider.getSigner(landSaleAdmin))
        .functions.setETHEnabled(false);

      const isETHEnabled = await landSaleWithReferralContract
        .connect(landSaleWithReferralContract.provider.getSigner(others[1]))
        .functions.isETHEnabled();

      assert.ok(!isETHEnabled, "ETH should not be enabled");
    });
  });

  describe("--> SAND tests", function () {});
  // before --> set SAND enabled

  describe("--> DAI tests", function () {});
  // before --> set DAI enabled
});
