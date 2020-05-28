const {assert} = require("chai-local");
const {expectRevert} = require("testUtils");
const {setupLandSaleWithReferral} = require("./fixtures");

describe("testLandSaleWithReferral", function () {
  let initialSetUp;
  describe("--> ETH tests", function () {
    beforeEach(async function () {
      initialSetUp = await setupLandSaleWithReferral();
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

      // isETHEnabled is set to TRUE as default in LandSaleWithReferral.sol
      // others[1] account is not admin
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

    it("ETH cannot be enabled if not admin", async function () {
      const {landSaleWithReferralContract, others} = initialSetUp;
      await expectRevert(
        landSaleWithReferralContract
          .connect(landSaleWithReferralContract.provider.getSigner(others[1]))
          .functions.setETHEnabled(true),
        "only admin can enable/disable ETH"
      );
    });

    it("can buy LAND with ETH (empty referral)", async function () {});

    it("can buy LAND with ETH and referral", async function () {});

    it("cannot buy LAND with ETH if not enabled (empty referral)", async function () {});

    it("cannot buy LAND without enough ETH (empty referral)", async function () {});

    it("can buy LAND from a reserved Land if matching address (empty referral)", async function () {});

    it("can buy LAND from a reserved Land and send it to another address (empty referral)", async function () {});

    it("CANNOT buy LAND when minter rights revoked (empty referral)", async function () {});

    it("CANNOT buy LAND twice (empty referral)", async function () {});

    it("CANNOT generate proof for Land not on sale", async function () {});

    it("CANNOT buy LAND with invalid proof (empty referral)", async function () {});

    it("CANNOT buy LAND with wrong proof (empty referral)", async function () {});

    it("after buying user own all LAND bought (empty referral)", async function () {});

    it("can buy all LANDs specified in json except reserved lands (empty referral)", async function () {});

    it("check the expiry time of the sale", async function () {});
  });

  describe("--> SAND tests", function () {});
  // before --> set SAND enabled

  describe("--> DAI tests", function () {});
  // before --> set DAI enabled
});
