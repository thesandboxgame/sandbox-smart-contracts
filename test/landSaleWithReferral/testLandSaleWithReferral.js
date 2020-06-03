const {assert} = require("chai-local");
const {ethers} = require("@nomiclabs/buidler");
const {utils, BigNumber} = require("ethers");
const {expectRevert, zeroAddress} = require("testUtils");
const {setupLandSaleWithReferral, setupTestLandSaleWithReferral} = require("./fixtures");
const {calculateLandHash} = require("../../lib/merkleTreeHelper");
const {createReferral} = require("../../lib/referralValidator");

describe("testLandSaleWithReferral", function () {
  let initialSetUp;
  const emptyReferral = "0x";
  const privateKey = "0x96aa38e97d1d0d19e0f1d5215ff9dad66dc5d99225b1657205d124d00d2de177";
  const referralLinkValidity = 60 * 60 * 24 * 30;

  describe("--> Tests with real LANDs", function () {
    beforeEach(async function () {
      initialSetUp = await setupLandSaleWithReferral();
    });

    it("ETH is enabled", async function () {
      const {contracts} = initialSetUp;
      const isETHEnabled = await contracts.landSaleWithReferral.isETHEnabled(); // isETHEnabled is set to TRUE as default in LandSaleWithReferral.sol
      assert.ok(isETHEnabled, "ETH should be enabled");
    });

    it("ETH can be disabled", async function () {
      const {LandSaleAdmin} = initialSetUp;
      await LandSaleAdmin.LandSaleWithReferral.functions.setETHEnabled(false);
      const isETHEnabled = await LandSaleAdmin.LandSaleWithReferral.functions.isETHEnabled();
      assert.ok(!isETHEnabled, "ETH should not be enabled");
    });

    it("ETH cannot be enabled if not admin", async function () {
      const {users} = initialSetUp;
      await expectRevert(
        users[1].LandSaleWithReferral.functions.setETHEnabled(true),
        "only admin can enable/disable ETH" // check
      );
    });

    it("can buy LAND with ETH (empty referral)", async function () {
      const {tree, users, lands, contracts} = initialSetUp;
      const proof = tree.getProof(calculateLandHash(lands[5]));
      const sandPrice = lands[5].price;
      const value = await contracts.landSaleWithReferral.getEtherAmountWithSAND(sandPrice);

      await users[0].LandSaleWithReferral.functions.buyLandWithETH(
        users[0].address,
        users[0].address,
        zeroAddress,
        lands[5].x,
        lands[5].y,
        lands[5].size,
        lands[5].price,
        lands[5].salt,
        proof,
        emptyReferral,
        {value: value}
      );
    });

    it("can buy LAND with ETH and referral", async function () {
      const {tree, users, lands} = initialSetUp;
      const proof = tree.getProof(calculateLandHash(lands[5]));
      const sandPrice = lands[5].price;
      const value = await users[0].LandSaleWithReferral.functions.getEtherAmountWithSAND(sandPrice);

      const referral = {
        referrer: "0x80EdC2580F0c768cb5b2bb87b96049A13508C230",
        referee: users[0].address,
        expiryTime: Math.floor(Date.now() / 1000) + referralLinkValidity,
        commissionRate: "500",
      };

      const sig = await createReferral(
        privateKey,
        referral.referrer,
        referral.referee,
        referral.expiryTime,
        referral.commissionRate
      );

      const isReferralValid = await users[0].LandSaleWithReferral.functions.isReferralValid(
        sig,
        referral.referrer,
        referral.referee,
        referral.expiryTime,
        referral.commissionRate
      );

      assert.equal(isReferralValid, true, "Referral should be valid");

      const encodedReferral = utils.defaultAbiCoder.encode(
        ["bytes", "address", "address", "uint256", "uint256"],
        [sig, referral.referrer, referral.referee, referral.expiryTime, referral.commissionRate]
      );

      const tx = await users[0].LandSaleWithReferral.functions.buyLandWithETH(
        users[0].address,
        users[0].address,
        zeroAddress,
        lands[5].x,
        lands[5].y,
        lands[5].size,
        lands[5].price,
        lands[5].salt,
        proof,
        encodedReferral,
        {value: value}
      );

      const receipt = await tx.wait();
      const event = receipt.events[0];
      assert.equal(event.event, "ReferralUsed", "Event name is wrong");

      const referrer = event.args[0];
      const referree = event.args[1];
      const token = event.args[2];
      const amount = event.args[3];
      const commission = event.args[4];
      const commissionRate = event.args[5];

      assert.equal(referrer, referral.referrer, "Referrer is wrong");
      assert.equal(referree, referral.referee, "Referee is wrong");
      assert.equal(token, zeroAddress, "Token is wrong");
      assert.isOk(amount.eq(value), "Amount is wrong");
      assert.equal(commissionRate, referral.commissionRate, "Amount is wrong");

      const referrerBalance = await ethers.provider.getBalance(referral.referrer);

      const expectedCommission = BigNumber.from(amount)
        .mul(BigNumber.from(commissionRate))
        .div(BigNumber.from("10000"));

      assert.equal(commission, expectedCommission.toString(), "Commission is wrong");
      assert.isOk(commission.eq(referrerBalance), "Referrer balance is wrong");
    });

    it("cannot buy LAND with ETH if not enabled (empty referral)", async function () {
      const {LandSaleAdmin, tree, users, lands, contracts} = initialSetUp;
      await LandSaleAdmin.LandSaleWithReferral.functions.setETHEnabled(false);
      const proof = tree.getProof(calculateLandHash(lands[5]));
      const sandPrice = lands[5].price;
      const value = await contracts.landSaleWithReferral.getEtherAmountWithSAND(sandPrice);

      await expectRevert(
        users[0].LandSaleWithReferral.functions.buyLandWithETH(
          users[0].address,
          users[0].address,
          zeroAddress,
          lands[5].x,
          lands[5].y,
          lands[5].size,
          lands[5].price,
          lands[5].salt,
          proof,
          emptyReferral,
          {value: value}
        ),
        "ether payments not enabled"
      );
    });

    it("cannot buy LAND without enough ETH (empty referral)", async function () {
      const {tree, users, lands} = initialSetUp;
      const proof = tree.getProof(calculateLandHash(lands[5]));

      await expectRevert(
        users[0].LandSaleWithReferral.functions.buyLandWithETH(
          users[0].address,
          users[0].address,
          zeroAddress,
          lands[5].x,
          lands[5].y,
          lands[5].size,
          lands[5].price,
          lands[5].salt,
          proof,
          emptyReferral,
          {value: 0}
        ),
        "not enough ether sent"
      );
    });

    it("cannot buy Land from a non reserved Land with reserved param (empty referral)", async function () {
      const {tree, users, lands, contracts} = initialSetUp;
      const proof = tree.getProof(calculateLandHash(lands[5]));
      const sandPrice = lands[5].price;
      const value = await contracts.landSaleWithReferral.getEtherAmountWithSAND(sandPrice);

      await expectRevert(
        users[0].LandSaleWithReferral.functions.buyLandWithETH(
          users[0].address,
          users[0].address,
          users[0].address,
          lands[5].x,
          lands[5].y,
          lands[5].size,
          lands[5].price,
          lands[5].salt,
          proof,
          emptyReferral,
          {value: value}
        ),
        "Invalid land provided" // lands[5] has no reserved param
        // require(reserved == address(0) || reserved == buyer, "cannot buy reserved Land");
        // note: requirement passes because buyLandWithETH reserved param == buyer in this case
      );
    });

    it("CANNOT buy LAND when minter rights revoked (empty referral)", async function () {
      const {LandAdmin, tree, users, lands, contracts} = initialSetUp;

      await LandAdmin.Land.functions.setMinter(contracts.landSaleWithReferral.address, false).then((tx) => tx.wait());

      const proof = tree.getProof(calculateLandHash(lands[5]));
      const sandPrice = lands[5].price;
      const value = await contracts.landSaleWithReferral.getEtherAmountWithSAND(sandPrice);

      await expectRevert(
        users[0].LandSaleWithReferral.functions.buyLandWithETH(
          users[0].address,
          users[0].address,
          zeroAddress,
          lands[5].x,
          lands[5].y,
          lands[5].size,
          lands[5].price,
          lands[5].salt,
          proof,
          emptyReferral,
          {value: value}
        ),
        "Only a minter can mint"
      );
    });

    it("CANNOT buy LAND twice (empty referral)", async function () {
      const {tree, users, lands} = initialSetUp;
      const sandPrice = lands[5].price;
      const value = await users[0].LandSaleWithReferral.functions.getEtherAmountWithSAND(sandPrice);
      const proof = tree.getProof(calculateLandHash(lands[5]));

      await users[0].LandSaleWithReferral.functions.buyLandWithETH(
        users[0].address,
        users[0].address,
        zeroAddress,
        lands[5].x,
        lands[5].y,
        lands[5].size,
        lands[5].price,
        lands[5].salt,
        proof,
        emptyReferral,
        {value: value}
      );

      await expectRevert(
        users[0].LandSaleWithReferral.functions.buyLandWithETH(
          users[0].address,
          users[0].address,
          zeroAddress,
          lands[5].x,
          lands[5].y,
          lands[5].size,
          lands[5].price,
          lands[5].salt,
          proof,
          emptyReferral,
          {value: value}
        ),
        "Already minted"
      );
    });
  });

  describe("--> Tests with test LANDs", function () {
    beforeEach(async function () {
      initialSetUp = await setupTestLandSaleWithReferral();
    });

    it("cannot buy Land from a reserved Land of a different address (empty referral)", async function () {
      const {testLands, users, testTree, contracts} = initialSetUp;

      const proof = testTree.getProof(calculateLandHash(testLands[0]));
      const sandPrice = "4047";
      const value = await contracts.landSaleWithReferral.getEtherAmountWithSAND(sandPrice);

      await expectRevert(
        users[0].LandSaleWithReferral.functions.buyLandWithETH(
          users[0].address,
          users[0].address,
          users[0].address,
          400,
          106,
          1,
          "4047",
          "0x1111111111111111111111111111111111111111111111111111111111111111",
          proof,
          emptyReferral,
          {value: value}
        ),
        "Invalid land provided"
        // require(reserved == address(0) || reserved == buyer, "cannot buy reserved Land");
        // note: requirement passes because buyLandWithETH reserved param == buyer in this case
      );
    });

    it("can buy LAND from a reserved Land if matching address (empty referral)", async function () {
      const {testLands, users, testTree, contracts} = initialSetUp;
      const sandPrice = "4047";
      const value = await contracts.landSaleWithReferral.getEtherAmountWithSAND(sandPrice);
      const proof = testTree.getProof(calculateLandHash(testLands[0]));
      await users[1].LandSaleWithReferral.functions.buyLandWithETH(
        users[1].address,
        users[1].address,
        users[1].address,
        400,
        106,
        1,
        "4047",
        "0x1111111111111111111111111111111111111111111111111111111111111111",
        proof,
        emptyReferral,
        {value: value}
      );
      const owner = await contracts.land.ownerOf(400 + 106 * 408);
      assert.equal(owner, users[1].address);
    });

    it("can buy LAND from a reserved Land and send it to another address (empty referral)", async function () {
      const {testLands, users, testTree, contracts} = initialSetUp;
      const proof = testTree.getProof(calculateLandHash(testLands[0]));
      const sandPrice = "4047";
      const value = await contracts.landSaleWithReferral.getEtherAmountWithSAND(sandPrice);
      await users[1].LandSaleWithReferral.functions.buyLandWithETH(
        users[1].address,
        users[2].address,
        users[1].address,
        400,
        106,
        1,
        "4047",
        "0x1111111111111111111111111111111111111111111111111111111111111111",
        proof,
        emptyReferral,
        {value: value}
      );
      const owner = await contracts.land.ownerOf(400 + 106 * 408);
      assert.equal(owner, users[2].address);
    });

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
