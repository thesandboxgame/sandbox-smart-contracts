const {assert} = require("chai-local");
const {ethers} = require("@nomiclabs/buidler");
const {utils, BigNumber} = require("ethers");
const {expectRevert, zeroAddress, increaseTime} = require("testUtils");
const {setupLandSaleWithReferral} = require("./fixtures");
const {calculateLandHash} = require("../../../lib/merkleTreeHelper");
const {createReferral} = require("../../../lib/referralValidator");

function runEtherTests() {
  describe("LandSaleWithReferral:ETH", function () {
    let initialSetUp;
    const emptyReferral = "0x";
    const privateKey = "0x96aa38e97d1d0d19e0f1d5215ff9dad66dc5d99225b1657205d124d00d2de177";
    const referralLinkValidity = 60 * 60 * 24 * 30;

    describe("--> Tests with real LANDs", function () {
      beforeEach(async function () {
        initialSetUp = await setupLandSaleWithReferral("lands");
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
          "only admin can enable/disable ETH"
        );
      });

      it("can buy LAND with ETH (empty referral)", async function () {
        const {tree, users, lands, contracts} = initialSetUp;
        const land = lands[5];
        const proof = tree.getProof(calculateLandHash(land));
        const value = await contracts.landSaleWithReferral.getEtherAmountWithSAND(land.price);

        await users[0].LandSaleWithReferral.functions.buyLandWithETH(
          users[0].address,
          users[0].address,
          zeroAddress,
          land.x,
          land.y,
          land.size,
          land.price,
          land.salt,
          proof,
          emptyReferral,
          {value: value}
        );
      });

      it("can buy LAND with ETH and referral", async function () {
        const {tree, users, lands} = initialSetUp;
        const land = lands[5];
        const proof = tree.getProof(calculateLandHash(land));
        const value = await users[0].LandSaleWithReferral.functions.getEtherAmountWithSAND(land.price);

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
          land.x,
          land.y,
          land.size,
          land.price,
          land.salt,
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

        assert.isOk(commission.eq(expectedCommission), "Commission is wrong");
        assert.isOk(commission.eq(referrerBalance), "Referrer balance is wrong");
      });

      it("CANNOT buy LAND with ETH if not enabled (empty referral)", async function () {
        const {LandSaleAdmin, tree, users, lands, contracts} = initialSetUp;

        await LandSaleAdmin.LandSaleWithReferral.functions.setETHEnabled(false);

        const land = lands[5];
        const proof = tree.getProof(calculateLandHash(land));
        const value = await contracts.landSaleWithReferral.getEtherAmountWithSAND(land.price);

        await expectRevert(
          users[0].LandSaleWithReferral.functions.buyLandWithETH(
            users[0].address,
            users[0].address,
            zeroAddress,
            land.x,
            land.y,
            land.size,
            land.price,
            land.salt,
            proof,
            emptyReferral,
            {value: value}
          ),
          "ether payments not enabled"
        );
      });

      it("CANNOT buy LAND without enough ETH (empty referral)", async function () {
        const {tree, users, lands} = initialSetUp;
        const land = lands[5];
        const proof = tree.getProof(calculateLandHash(land));

        await expectRevert(
          users[0].LandSaleWithReferral.functions.buyLandWithETH(
            users[0].address,
            users[0].address,
            zeroAddress,
            land.x,
            land.y,
            land.size,
            land.price,
            land.salt,
            proof,
            emptyReferral,
            {value: 0}
          ),
          "not enough ether sent"
        );
      });

      it("CANNOT buy Land from a non reserved Land with reserved param (empty referral)", async function () {
        const {tree, users, lands, contracts} = initialSetUp;
        const land = lands[5];
        const proof = tree.getProof(calculateLandHash(land));
        const value = await contracts.landSaleWithReferral.getEtherAmountWithSAND(land.price);

        await expectRevert(
          users[0].LandSaleWithReferral.functions.buyLandWithETH(
            users[0].address,
            users[0].address,
            users[0].address,
            land.x,
            land.y,
            land.size,
            land.price,
            land.salt,
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

        const land = lands[5];
        const proof = tree.getProof(calculateLandHash(land));
        const value = await contracts.landSaleWithReferral.getEtherAmountWithSAND(land.price);

        await expectRevert(
          users[0].LandSaleWithReferral.functions.buyLandWithETH(
            users[0].address,
            users[0].address,
            zeroAddress,
            land.x,
            land.y,
            land.size,
            land.price,
            land.salt,
            proof,
            emptyReferral,
            {value: value}
          ),
          "Only a minter can mint"
        );
      });

      it("CANNOT buy LAND twice (empty referral)", async function () {
        const {tree, users, lands} = initialSetUp;
        const land = lands[5];
        const value = await users[0].LandSaleWithReferral.functions.getEtherAmountWithSAND(land.price);
        const proof = tree.getProof(calculateLandHash(land));

        await users[0].LandSaleWithReferral.functions.buyLandWithETH(
          users[0].address,
          users[0].address,
          zeroAddress,
          land.x,
          land.y,
          land.size,
          land.price,
          land.salt,
          proof,
          emptyReferral,
          {value: value}
        );

        await expectRevert(
          users[0].LandSaleWithReferral.functions.buyLandWithETH(
            users[0].address,
            users[0].address,
            zeroAddress,
            land.x,
            land.y,
            land.size,
            land.price,
            land.salt,
            proof,
            emptyReferral,
            {value: value}
          ),
          "Already minted"
        );
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
          "Cannot read property 'parent' of undefined" // TODO check this is the correct error message
        );
      });

      it("CANNOT buy LAND with invalid proof (empty referral)", async function () {
        const {users, lands, contracts} = initialSetUp;
        const proof = [
          "0x0000000000000000000000000000000000000000000000000000000000000001",
          "0x0000000000000000000000000000000000000000000000000000000000000002",
          "0x0000000000000000000000000000000000000000000000000000000000000003",
        ];
        const land = lands[5];
        const value = await contracts.landSaleWithReferral.getEtherAmountWithSAND(land.price);

        await expectRevert(
          users[0].LandSaleWithReferral.functions.buyLandWithETH(
            users[0].address,
            users[0].address,
            users[0].address,
            land.x,
            land.y,
            land.size,
            land.price,
            land.salt,
            proof,
            emptyReferral,
            {value: value}
          ),
          "Invalid land provided"
        );
      });

      it("CANNOT buy LAND with wrong proof (empty referral)", async function () {
        const {tree, users, lands, contracts} = initialSetUp;
        const land = lands[5];
        const value = await contracts.landSaleWithReferral.getEtherAmountWithSAND(land.price);
        const proof = tree.getProof(calculateLandHash(lands[2]));

        await expectRevert(
          users[0].LandSaleWithReferral.functions.buyLandWithETH(
            users[0].address,
            users[0].address,
            users[0].address,
            land.x,
            land.y,
            land.size,
            land.price,
            land.salt,
            proof,
            emptyReferral,
            {value: value}
          ),
          "Invalid land provided"
        );
      });

      it("after buying user owns all LAND bought (empty referral)", async function () {
        const {tree, users, lands, contracts} = initialSetUp;
        const land = lands[3];
        const proof = tree.getProof(calculateLandHash(land));
        const value = await contracts.landSaleWithReferral.getEtherAmountWithSAND(land.price);
        await users[0].LandSaleWithReferral.functions.buyLandWithETH(
          users[0].address,
          users[0].address,
          zeroAddress,
          land.x,
          land.y,
          land.size,
          land.price,
          land.salt,
          proof,
          emptyReferral,
          {value: value}
        );
        for (let x = land.x; x < land.x + land.size; x++) {
          for (let y = land.y; y < land.y + lands.size; y++) {
            const owner = await contracts.land.ownerOf(x + y * 408);
            assert.equal(owner, users[0].address);
            const balance = await contracts.land.balanceOf(users[0].address);
            assert.isOk(balance.eq(BigNumber.from(land.size ** 2)));
          }
        }
      });

      it("CANNOT buy a land after the expiry time (empty referral)", async function () {
        const {lands, users, tree, contracts} = initialSetUp;
        const land = lands[0];
        const proof = tree.getProof(calculateLandHash(land));
        const value = await contracts.landSaleWithReferral.getEtherAmountWithSAND(land.price);
        await increaseTime(60 * 60);
        await expectRevert(
          users[0].LandSaleWithReferral.functions.buyLandWithETH(
            users[0].address,
            users[0].address,
            users[0].address,
            land.x,
            land.y,
            land.size,
            land.price,
            land.salt,
            proof,
            emptyReferral,
            {value: value}
          ),
          "sale is over"
        );
      });
    });

    describe("--> Tests with test LANDs for reserved addresses", function () {
      beforeEach(async function () {
        initialSetUp = await setupLandSaleWithReferral("testLands");
      });

      it("CANNOT buy Land from a reserved Land of a different address (empty referral)", async function () {
        const {lands, users, tree, contracts} = initialSetUp;
        const land = lands[0];
        const proof = tree.getProof(calculateLandHash(land));
        const value = await contracts.landSaleWithReferral.getEtherAmountWithSAND(land.price);

        await expectRevert(
          users[0].LandSaleWithReferral.functions.buyLandWithETH(
            users[0].address,
            users[0].address,
            users[0].address,
            land.x,
            land.y,
            land.size,
            land.price,
            land.salt,
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
        const {lands, users, tree, contracts} = initialSetUp;
        const land = lands[0];
        const value = await contracts.landSaleWithReferral.getEtherAmountWithSAND(land.price);
        const proof = tree.getProof(calculateLandHash(land));
        await users[1].LandSaleWithReferral.functions.buyLandWithETH(
          users[1].address,
          users[1].address,
          users[1].address,
          land.x,
          land.y,
          land.size,
          land.price,
          land.salt,
          proof,
          emptyReferral,
          {value: value}
        );
        const owner = await contracts.land.ownerOf(400 + 106 * 408);
        assert.equal(owner, users[1].address);
      });

      it("can buy LAND from a reserved Land and send it to another address (empty referral)", async function () {
        const {lands, users, tree, contracts} = initialSetUp;
        const land = lands[0];
        const proof = tree.getProof(calculateLandHash(land));
        const value = await contracts.landSaleWithReferral.getEtherAmountWithSAND(land.price);
        await users[1].LandSaleWithReferral.functions.buyLandWithETH(
          users[1].address,
          users[2].address,
          users[1].address,
          land.x,
          land.y,
          land.size,
          land.price,
          land.salt,
          proof,
          emptyReferral,
          {value: value}
        );
        const owner = await contracts.land.ownerOf(400 + 106 * 408);
        assert.equal(owner, users[2].address);
      });

      it("can buy all LANDs specified in json except reserved lands (empty referral)", async function () {
        const {lands, users, tree, contracts} = initialSetUp;
        for (const land of lands) {
          const value = await contracts.landSaleWithReferral.getEtherAmountWithSAND(land.price);
          const proof = tree.getProof(calculateLandHash(land));
          if (land.reserved) {
            await expectRevert(
              users[0].LandSaleWithReferral.functions.buyLandWithETH(
                users[0].address,
                users[0].address,
                land.reserved,
                land.x,
                land.y,
                land.size,
                land.price,
                land.salt,
                proof,
                emptyReferral,
                {value: value}
              ),
              "cannot buy reserved Land"
            );
          } else {
            try {
              await users[0].LandSaleWithReferral.functions.buyLandWithETH(
                users[0].address,
                users[0].address,
                zeroAddress,
                land.x,
                land.y,
                land.size,
                land.price,
                land.salt,
                proof,
                emptyReferral,
                {value: value}
              );
            } catch (e) {
              console.log(JSON.stringify(land));
              console.log(JSON.stringify(proof));
              throw e;
            }
          }
        }
      });
    });
  });
}

module.exports = {
  runEtherTests,
};
