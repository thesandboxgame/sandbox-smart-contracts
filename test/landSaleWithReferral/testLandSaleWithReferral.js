const {deployments} = require("@nomiclabs/buidler");
const {assert} = require("chai-local");
const {expectRevert, zeroAddress} = require("testUtils");
const {setupLandSaleWithReferral} = require("./fixtures");
const MerkleTree = require("../../lib/merkleTree");
const {createDataArray, calculateLandHash} = require("../../lib/merkleTreeHelper");

describe("testLandSaleWithReferral", function () {
  let initialSetUp;
  const emptyReferral = "0x";
  // const privateKey = "0x96aa38e97d1d0d19e0f1d5215ff9dad66dc5d99225b1657205d124d00d2de177";
  // const referralLinkValidity = 60 * 60 * 24 * 30;

  describe("--> ETH tests", function () {
    beforeEach(async function () {
      initialSetUp = await setupLandSaleWithReferral();
    });

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

    // TODO review LandSaleWithReferral relationship to a given presale
    it("can buy LAND with ETH (empty referral)", async function () {
      const {landSaleWithReferralContract, others} = initialSetUp;
      let tree; // new tree

      // get lands from deployed preSale contract linkedData
      const deployment = await deployments.get("LandPreSale_2");
      lands = deployment.linkedData;
      const landHashArray = createDataArray(lands);
      tree = new MerkleTree(landHashArray);

      const sandPrice = lands[5].price;

      const value = await landSaleWithReferralContract // should it be the "presale contract" ?
        .connect(landSaleWithReferralContract.provider.getSigner(others[0]))
        .functions.getEtherAmountWithSAND(sandPrice);

      const proof = tree.getProof(calculateLandHash(lands[5])); // need to deploy landSaleWithReferral with correct merkleRoot

      // address buyer,
      // address to,
      // address reserved,
      // uint256 x,
      // uint256 y,
      // uint256 size,
      // uint256 priceInSand,
      // bytes32 salt,
      // bytes32[] calldata proof,
      // bytes calldata referral

      // TODO send correct args - "Error: VM Exception while processing transaction: revert Invalid land provided"
      await landSaleWithReferralContract
        .connect(landSaleWithReferralContract.provider.getSigner(others[0]))
        .functions.buyLandWithETH(
          others[0],
          others[0],
          zeroAddress,
          lands[5].x,
          lands[5].y,
          lands[5].size,
          lands[5].price,
          lands[5].salt,
          proof,
          emptyReferral,
          {value: value} // TODO check value is in wei (value is given in ETH)
        );
    });

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

    it("after buying user owns all LAND bought (empty referral)", async function () {});

    it("can buy all LANDs specified in json except reserved lands (empty referral)", async function () {});

    it("check the expiry time of the sale", async function () {});
  });

  describe("--> SAND tests", function () {});
  // before --> set SAND enabled

  describe("--> DAI tests", function () {});
  // before --> set DAI enabled
});
