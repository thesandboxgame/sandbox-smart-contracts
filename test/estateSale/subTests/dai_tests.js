const {assert} = require("local-chai");
const {utils, BigNumber} = require("ethers");
const {expectRevert, zeroAddress, increaseTime} = require("local-utils");
const {setupEstateSale} = require("./fixtures");
const {calculateLandHash} = require("../../../lib/merkleTreeHelper");
const {createReferral} = require("../../../lib/referralValidator");

function sandToUSD(sand) {
  return BigNumber.from(sand).mul(BigNumber.from("14400000000000000")).div(BigNumber.from("1000000000000000000"));
}

function runDaiTests(landSaleName) {
  describe(landSaleName + ":DAI", function () {
    let initialSetUp;
    const emptyReferral = "0x";
    const privateKey = "0x96aa38e97d1d0d19e0f1d5215ff9dad66dc5d99225b1657205d124d00d2de177";
    const referralLinkValidity = 60 * 60 * 24 * 30;

    describe("--> Tests with real LANDs", function () {
      beforeEach(async function () {
        initialSetUp = await setupEstateSale(landSaleName, "lands");
        const {LandSaleAdmin} = initialSetUp;
        await LandSaleAdmin.EstateSale.setDAIEnabled(true);
      });

      it("DAI is enabled", async function () {
        const {contracts} = initialSetUp;
        const isDAIEnabled = await contracts.estateSale.isDAIEnabled();
        assert.ok(isDAIEnabled, "DAI should be enabled");
      });

      it("DAI can be disabled", async function () {
        const {LandSaleAdmin} = initialSetUp;
        await LandSaleAdmin.EstateSale.functions.setDAIEnabled(false);
        const isDAIEnabled = await LandSaleAdmin.EstateSale.functions.isDAIEnabled();
        assert.ok(!isDAIEnabled, "DAI should not be enabled");
      });

      it("DAI cannot be enabled if not admin", async function () {
        const {userWithDAI} = initialSetUp;
        await expectRevert(userWithDAI.EstateSale.functions.setDAIEnabled(true), "only admin can enable/disable DAI");
      });

      it("can buy LAND with DAI (empty referral)", async function () {
        const {tree, userWithDAI, lands, contracts} = initialSetUp;
        const land = lands.find((l) => l.size === 6);
        const proof = tree.getProof(calculateLandHash(land));
        await userWithDAI.EstateSale.functions.buyLandWithDAI(
          userWithDAI.address,
          userWithDAI.address,
          zeroAddress,
          land.x,
          land.y,
          land.size,
          land.price,
          land.salt,
          proof,
          emptyReferral,
          {gasLimit: 1000000}
        );

        for (let sx = 0; sx < land.size; sx++) {
          for (let sy = 0; sy < land.size; sy++) {
            const id = land.x + sx + (land.y + sy) * 408;
            const landOwner = await contracts.land.ownerOf(id);
            assert.equal(landOwner, contracts.estate.address);
          }
        }
        const estateOwner = await contracts.estate.ownerOf(1);
        assert.equal(estateOwner, userWithDAI.address);
      });

      it("can buy estate with DAI and referral", async function () {
        const {tree, userWithDAI, userWithoutDAI, LandSaleBeneficiary, lands, contracts} = initialSetUp;
        const land = lands.find((l) => l.size === 6);
        const proof = tree.getProof(calculateLandHash(land));

        const referral = {
          referrer: userWithoutDAI.address,
          referee: userWithDAI.address,
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

        const isReferralValid = await contracts.estateSale.isReferralValid(
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

        const tx = await userWithDAI.EstateSale.functions.buyLandWithDAI(
          userWithDAI.address,
          userWithDAI.address,
          zeroAddress,
          land.x,
          land.y,
          land.size,
          land.price,
          land.salt,
          proof,
          encodedReferral
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
        assert.equal(token, contracts.dai.address, "Token is wrong");
        assert.isOk(amount.eq(sandToUSD(land.price)), "Amount is wrong");
        assert.equal(commissionRate, referral.commissionRate, "Amount is wrong");

        const referrerBalance = await contracts.dai.balanceOf(userWithoutDAI.address);

        const expectedCommission = BigNumber.from(amount)
          .mul(BigNumber.from(commissionRate))
          .div(BigNumber.from("10000"));

        assert.isOk(commission.eq(expectedCommission), "Commission is wrong");
        assert.isOk(commission.eq(referrerBalance), "Referrer balance is wrong");

        const landSaleBeneficiaryBalance = await contracts.dai.balanceOf(LandSaleBeneficiary.address);
        const expectedLandSaleBeneficiaryBalance = BigNumber.from(amount).sub(BigNumber.from(commission));
        assert.isOk(landSaleBeneficiaryBalance.eq(expectedLandSaleBeneficiaryBalance), "Balance is wrong");

        for (let sx = 0; sx < land.size; sx++) {
          for (let sy = 0; sy < land.size; sy++) {
            const id = land.x + sx + (land.y + sy) * 408;
            const landOwner = await contracts.land.ownerOf(id);
            assert.equal(landOwner, contracts.estate.address);
          }
        }
        const estateOwner = await contracts.estate.ownerOf(1);
        assert.equal(estateOwner, userWithDAI.address);
      });

      it("CANNOT buy LAND (size === 1) with DAI if not enabled (empty referral)", async function () {
        const {LandSaleAdmin, tree, userWithDAI, lands} = initialSetUp;

        await LandSaleAdmin.EstateSale.functions.setDAIEnabled(false);

        const land = lands[0];
        const proof = tree.getProof(calculateLandHash(land));

        await expectRevert(
          userWithDAI.EstateSale.functions.buyLandWithDAI(
            userWithDAI.address,
            userWithDAI.address,
            zeroAddress,
            land.x,
            land.y,
            land.size,
            land.price,
            land.salt,
            proof,
            emptyReferral
          ),
          "dai payments not enabled"
        );
      });

      it("CANNOT buy LAND (size > 1) with DAI if not enabled (empty referral)", async function () {
        const {LandSaleAdmin, tree, userWithDAI, lands} = initialSetUp;

        await LandSaleAdmin.EstateSale.functions.setDAIEnabled(false);

        const land = lands.find((l) => l.size === 6);
        const proof = tree.getProof(calculateLandHash(land));

        await expectRevert(
          userWithDAI.EstateSale.functions.buyLandWithDAI(
            userWithDAI.address,
            userWithDAI.address,
            zeroAddress,
            land.x,
            land.y,
            land.size,
            land.price,
            land.salt,
            proof,
            emptyReferral
          ),
          "dai payments not enabled"
        );
      });

      it("can buy Land with DAI and an invalid referral", async function () {
        const {tree, userWithDAI, userWithoutDAI, LandSaleBeneficiary, lands, contracts} = initialSetUp;
        const land = lands.find((l) => l.size === 6);
        const proof = tree.getProof(calculateLandHash(land));

        const referral = {
          referrer: userWithoutDAI.address,
          referee: userWithDAI.address,
          expiryTime: Math.floor(Date.now() / 1000) + referralLinkValidity,
          commissionRate: "10000",
        };

        const sig = await createReferral(
          privateKey,
          referral.referrer,
          referral.referee,
          referral.expiryTime,
          referral.commissionRate
        );

        const isReferralValid = await contracts.estateSale.isReferralValid(
          sig,
          referral.referrer,
          referral.referee,
          referral.expiryTime,
          referral.commissionRate
        );

        assert.equal(isReferralValid, false, "Referral should be invalid");

        const encodedReferral = utils.defaultAbiCoder.encode(
          ["bytes", "address", "address", "uint256", "uint256"],
          [sig, referral.referrer, referral.referee, referral.expiryTime, referral.commissionRate]
        );

        const tx = await userWithDAI.EstateSale.functions.buyLandWithDAI(
          userWithDAI.address,
          userWithDAI.address,
          zeroAddress,
          land.x,
          land.y,
          land.size,
          land.price,
          land.salt,
          proof,
          encodedReferral
        );

        const receipt = await tx.wait();
        const event = receipt.events[0];
        assert.equal(event.event, undefined, "Event should be undefined");

        const referrerBalance = await contracts.dai.balanceOf(userWithoutDAI.address);

        assert.equal(referrerBalance, 0, "Referrer balance is wrong");

        const landSaleBeneficiaryBalance = await contracts.dai.balanceOf(LandSaleBeneficiary.address);
        assert.isOk(landSaleBeneficiaryBalance.eq(sandToUSD(land.price)), "Balance is wrong");

        for (let sx = 0; sx < land.size; sx++) {
          for (let sy = 0; sy < land.size; sy++) {
            const id = land.x + sx + (land.y + sy) * 408;
            const landOwner = await contracts.land.ownerOf(id);
            assert.equal(landOwner, contracts.estate.address);
          }
        }
        const estateOwner = await contracts.estate.ownerOf(1);
        assert.equal(estateOwner, userWithDAI.address);
      });

      it("CANNOT buy Land without DAI", async function () {
        const {tree, userWithoutDAI, lands} = initialSetUp;
        const land = lands.find((l) => l.size === 6);
        const proof = tree.getProof(calculateLandHash(land));

        await expectRevert(
          userWithoutDAI.EstateSale.functions.buyLandWithDAI(
            userWithoutDAI.address,
            userWithoutDAI.address,
            zeroAddress,
            land.x,
            land.y,
            land.size,
            land.price,
            land.salt,
            proof,
            emptyReferral,
            {gasLimit: 1000000}
          ),
          "not enough fund"
        );
      });

      it("CANNOT buy Land without just enough tokens", async function () {
        const {userWithoutDAI, tree, lands, DaiAdmin} = initialSetUp;
        const land = lands.find((l) => l.size === 6);
        const proof = tree.getProof(calculateLandHash(land));

        await DaiAdmin.Dai.transfer(
          userWithoutDAI.address,
          BigNumber.from(sandToUSD(lands[5].price)).sub(BigNumber.from(1))
        );

        await expectRevert(
          userWithoutDAI.EstateSale.functions.buyLandWithDAI(
            userWithoutDAI.address,
            userWithoutDAI.address,
            zeroAddress,
            land.x,
            land.y,
            land.size,
            land.price,
            land.salt,
            proof,
            emptyReferral,
            {gasLimit: 1000000}
          ),
          "not enough fund"
        );
      });

      it("can buy Land with just enough tokens", async function () {
        const {userWithoutDAI, tree, lands, DaiAdmin} = initialSetUp;
        const land = lands.find((l) => l.size === 6);
        const proof = tree.getProof(calculateLandHash(land));

        await DaiAdmin.Dai.transfer(userWithoutDAI.address, BigNumber.from(sandToUSD(land.price)));

        await userWithoutDAI.EstateSale.functions.buyLandWithDAI(
          userWithoutDAI.address,
          userWithoutDAI.address,
          zeroAddress,
          land.x,
          land.y,
          land.size,
          land.price,
          land.salt,
          proof,
          emptyReferral
        );
      });

      it("CANNOT buy Land from a non reserved Land with reserved param (empty referral)", async function () {
        const {tree, userWithDAI, lands} = initialSetUp;
        const land = lands.find((l) => l.size === 6);
        const proof = tree.getProof(calculateLandHash(land));

        await expectRevert(
          userWithDAI.EstateSale.functions.buyLandWithDAI(
            userWithDAI.address,
            userWithDAI.address,
            userWithDAI.address,
            land.x,
            land.y,
            land.size,
            land.price,
            land.salt,
            proof,
            emptyReferral
          ),
          "Invalid land provided"
        );
      });

      it("CANNOT buy LAND when minter rights revoked (empty referral)", async function () {
        const {LandAdmin, tree, userWithDAI, lands, contracts} = initialSetUp;

        await LandAdmin.Land.functions.setMinter(contracts.estateSale.address, false).then((tx) => tx.wait());

        const land = lands[5];
        const proof = tree.getProof(calculateLandHash(land));

        await expectRevert(
          userWithDAI.EstateSale.functions.buyLandWithDAI(
            userWithDAI.address,
            userWithDAI.address,
            zeroAddress,
            land.x,
            land.y,
            land.size,
            land.price,
            land.salt,
            proof,
            emptyReferral
          ),
          "Only a minter can mint"
        );
      });

      it("CANNOT buy LAND twice (empty referral)", async function () {
        const {tree, userWithDAI, lands} = initialSetUp;
        const land = lands.find((l) => l.size === 6);
        const proof = tree.getProof(calculateLandHash(land));

        await userWithDAI.EstateSale.functions.buyLandWithDAI(
          userWithDAI.address,
          userWithDAI.address,
          zeroAddress,
          land.x,
          land.y,
          land.size,
          land.price,
          land.salt,
          proof,
          emptyReferral
        );

        await expectRevert(
          userWithDAI.EstateSale.functions.buyLandWithDAI(
            userWithDAI.address,
            userWithDAI.address,
            zeroAddress,
            land.x,
            land.y,
            land.size,
            land.price,
            land.salt,
            proof,
            emptyReferral
          ),
          "Already minted"
        );
      });

      it("CANNOT buy LAND with invalid proof (empty referral)", async function () {
        const {userWithDAI, lands} = initialSetUp;
        const proof = [
          "0x0000000000000000000000000000000000000000000000000000000000000001",
          "0x0000000000000000000000000000000000000000000000000000000000000002",
          "0x0000000000000000000000000000000000000000000000000000000000000003",
        ];
        const land = lands.find((l) => l.size === 6);

        await expectRevert(
          userWithDAI.EstateSale.functions.buyLandWithDAI(
            userWithDAI.address,
            userWithDAI.address,
            userWithDAI.address,
            land.x,
            land.y,
            land.size,
            land.price,
            land.salt,
            proof,
            emptyReferral
          ),
          "Invalid land provided"
        );
      });

      it("CANNOT buy LAND with wrong proof (empty referral)", async function () {
        const {tree, userWithDAI, lands} = initialSetUp;
        const land = lands.find((l) => l.size === 6);
        const proof = tree.getProof(calculateLandHash(lands[2]));

        await expectRevert(
          userWithDAI.EstateSale.functions.buyLandWithDAI(
            userWithDAI.address,
            userWithDAI.address,
            userWithDAI.address,
            land.x,
            land.y,
            land.size,
            land.price,
            land.salt,
            proof,
            emptyReferral
          ),
          "Invalid land provided"
        );
      });

      it("after buying user owns an Estate token and the Estate contract owns all LANDs (empty referral)", async function () {
        const {tree, userWithDAI, lands, contracts} = initialSetUp;
        const land = lands.find((l) => l.size === 6);
        const proof = tree.getProof(calculateLandHash(land));
        await userWithDAI.EstateSale.functions.buyLandWithDAI(
          userWithDAI.address,
          userWithDAI.address,
          zeroAddress,
          land.x,
          land.y,
          land.size,
          land.price,
          land.salt,
          proof,
          emptyReferral
        );
        for (let x = land.x; x < land.x + land.size; x++) {
          for (let y = land.y; y < land.y + lands.size; y++) {
            const owner = await contracts.land.ownerOf(x + y * 408);
            assert.equal(owner, contracts.estate.address);
            const balance = await contracts.land.balanceOf(userWithDAI.address);
            assert.isOk(balance.eq(BigNumber.from(land.size ** 2)));
          }
        }
        const estateOwner = await contracts.estate.ownerOf(1);
        assert.equal(estateOwner, userWithDAI.address);
      });

      // TODO investigate
      it.skip("CANNOT buy a land after the expiry time (empty referral)", async function () {
        const {lands, userWithDAI, tree} = initialSetUp;
        const land = lands.find((l) => l.size === 6);
        const proof = tree.getProof(calculateLandHash(land));
        await increaseTime(60 * 60);
        await expectRevert(
          userWithDAI.EstateSale.functions.buyLandWithDAI(
            userWithDAI.address,
            userWithDAI.address,
            zeroAddress,
            land.x,
            land.y,
            land.size,
            land.price,
            land.salt,
            proof,
            emptyReferral
          ),
          "sale is over"
        );
      });
    });

    describe("--> Tests with test LANDs for reserved addresses", function () {
      beforeEach(async function () {
        initialSetUp = await setupEstateSale(landSaleName, "testLands");
        const {LandSaleAdmin} = initialSetUp;
        await LandSaleAdmin.EstateSale.setDAIEnabled(true);
      });

      it("CANNOT buy Land from a reserved Land of a different address (empty referral)", async function () {
        const {lands, userWithDAI, tree} = initialSetUp;
        const land = lands[0];
        const proof = tree.getProof(calculateLandHash(land));

        await expectRevert(
          userWithDAI.EstateSale.functions.buyLandWithDAI(
            userWithDAI.address,
            userWithDAI.address,
            userWithDAI.address,
            land.x,
            land.y,
            land.size,
            land.price,
            land.salt,
            proof,
            emptyReferral
          ),
          "Invalid land provided"
        );
      });

      it("can buy land (size === 1) from a reserved Land if matching address (empty referral)", async function () {
        const {lands, secondUserWithDAI, tree, contracts} = initialSetUp;
        const land = lands[0];
        const proof = tree.getProof(calculateLandHash(land));
        await secondUserWithDAI.EstateSale.functions.buyLandWithDAI(
          secondUserWithDAI.address,
          secondUserWithDAI.address,
          secondUserWithDAI.address,
          land.x,
          land.y,
          land.size,
          land.price,
          land.salt,
          proof,
          emptyReferral
        );
        const owner = await contracts.land.ownerOf(400 + 106 * 408);
        assert.equal(owner, secondUserWithDAI.address);
      });

      it("can buy lands (size > 1) from a reserved Land if matching address (empty referral)", async function () {
        const {lands, secondUserWithDAI, tree, contracts} = initialSetUp;
        const land = lands[3];
        const proof = tree.getProof(calculateLandHash(land));
        await secondUserWithDAI.EstateSale.functions.buyLandWithDAI(
          secondUserWithDAI.address,
          secondUserWithDAI.address,
          secondUserWithDAI.address,
          land.x,
          land.y,
          land.size,
          land.price,
          land.salt,
          proof,
          emptyReferral
        );
        for (let sx = 0; sx < land.size; sx++) {
          for (let sy = 0; sy < land.size; sy++) {
            const id = land.x + sx + (land.y + sy) * 408;
            const landOwner = await contracts.land.ownerOf(id);
            assert.equal(landOwner, contracts.estate.address);
          }
        }
        const estateOwner = await contracts.estate.ownerOf(1);
        assert.equal(estateOwner, secondUserWithDAI.address);
      });

      it("can buy land (size === 1) from a reserved Land and send it to another address (empty referral)", async function () {
        const {lands, secondUserWithDAI, userWithoutDAI, tree, contracts} = initialSetUp;
        const land = lands[0];
        const proof = tree.getProof(calculateLandHash(land));
        await secondUserWithDAI.EstateSale.functions.buyLandWithDAI(
          secondUserWithDAI.address,
          userWithoutDAI.address,
          secondUserWithDAI.address,
          land.x,
          land.y,
          land.size,
          land.price,
          land.salt,
          proof,
          emptyReferral
        );
        const owner = await contracts.land.ownerOf(400 + 106 * 408);
        assert.equal(owner, userWithoutDAI.address);
      });

      it("can buy lands (size > 1) from a reserved Land and send it to another address (empty referral)", async function () {
        const {lands, secondUserWithDAI, userWithoutDAI, tree, contracts} = initialSetUp;
        const land = lands[3];
        const proof = tree.getProof(calculateLandHash(land));
        await secondUserWithDAI.EstateSale.functions.buyLandWithDAI(
          secondUserWithDAI.address,
          userWithoutDAI.address,
          secondUserWithDAI.address,
          land.x,
          land.y,
          land.size,
          land.price,
          land.salt,
          proof,
          emptyReferral
        );
        for (let sx = 0; sx < land.size; sx++) {
          for (let sy = 0; sy < land.size; sy++) {
            const id = land.x + sx + (land.y + sy) * 408;
            const landOwner = await contracts.land.ownerOf(id);
            assert.equal(landOwner, contracts.estate.address);
          }
        }
        const estateOwner = await contracts.estate.ownerOf(1);
        assert.equal(estateOwner, userWithoutDAI.address);
      });

      it("can buy all LANDs specified in json except reserved lands (empty referral)", async function () {
        const {lands, userWithDAI, tree} = initialSetUp;
        for (const land of lands) {
          const proof = tree.getProof(calculateLandHash(land));
          if (land.reserved) {
            await expectRevert(
              userWithDAI.EstateSale.functions.buyLandWithDAI(
                userWithDAI.address,
                userWithDAI.address,
                land.reserved,
                land.x,
                land.y,
                land.size,
                land.price,
                land.salt,
                proof,
                emptyReferral
              ),
              "cannot buy reserved Land"
            );
          } else {
            try {
              await userWithDAI.EstateSale.functions.buyLandWithDAI(
                userWithDAI.address,
                userWithDAI.address,
                zeroAddress,
                land.x,
                land.y,
                land.size,
                land.price,
                land.salt,
                proof,
                emptyReferral
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
  runDaiTests,
};
