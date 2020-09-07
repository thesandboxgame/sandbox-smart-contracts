const {assert, expect} = require("local-chai");
const {utils, BigNumber} = require("ethers");
const {expectRevert, zeroAddress, increaseTime} = require("local-utils");
const {setupEstateSale} = require("./fixtures");
const {calculateLandHash} = require("../../../lib/merkleTreeHelper");
const {createReferral} = require("../../../lib/referralValidator");

function runSandTests(landSaleName) {
  describe(landSaleName + ":SAND", function () {
    let initialSetUp;
    const emptyReferral = "0x";
    const privateKey = "0x96aa38e97d1d0d19e0f1d5215ff9dad66dc5d99225b1657205d124d00d2de177";
    const referralLinkValidity = 60 * 60 * 24 * 30;

    describe("--> Tests with real LANDs", function () {
      beforeEach(async function () {
        initialSetUp = await setupEstateSale(landSaleName, "lands");
      });

      it("can buy estate with SAND (empty referral)", async function () {
        const {tree, userWithSAND, lands, contracts} = initialSetUp;
        const land = lands.filter((l) => l.size === 6).find((l) => !l.reserved);
        const proof = tree.getProof(calculateLandHash(land));

        await userWithSAND.EstateSale.functions.buyLandWithSand(
          userWithSAND.address,
          userWithSAND.address,
          zeroAddress,
          land.x,
          land.y,
          land.size,
          land.price,
          land.price,
          land.salt,
          [],
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
        assert.equal(estateOwner, userWithSAND.address);
      });

      it("can buy estate with SAND and referral", async function () {
        const {tree, userWithSAND, userWithoutSAND, LandSaleBeneficiary, lands, contracts} = initialSetUp;
        const land = lands.filter((l) => l.size === 6).find((l) => !l.reserved);
        const proof = tree.getProof(calculateLandHash(land));

        const referral = {
          referrer: userWithoutSAND.address,
          referee: userWithSAND.address,
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

        const tx = await userWithSAND.EstateSale.functions.buyLandWithSand(
          userWithSAND.address,
          userWithSAND.address,
          zeroAddress,
          land.x,
          land.y,
          land.size,
          land.price,
          land.price,
          land.salt,
          [],
          proof,
          encodedReferral
        );

        const receipt = await tx.wait();
        const event = receipt.events[1];
        assert.equal(event.event, "ReferralUsed", "Event name is wrong");

        const referrer = event.args[0];
        const referree = event.args[1];
        const token = event.args[2];
        const amount = event.args[3];
        const commission = event.args[4];
        const commissionRate = event.args[5];

        assert.equal(referrer, referral.referrer, "Referrer is wrong");
        assert.equal(referree, referral.referee, "Referee is wrong");
        assert.equal(token, contracts.sand.address, "Token is wrong");
        expect(amount).to.equal(BigNumber.from(land.price).mul(95).div(100)); // Referral calculated on 95% of the land sale price (after 5% fee has been deducted)
        assert.equal(commissionRate, referral.commissionRate, "Amount is wrong");

        const referrerBalance = await contracts.sand.balanceOf(userWithoutSAND.address);

        const expectedCommission = BigNumber.from(amount)
          .mul(BigNumber.from(commissionRate))
          .div(BigNumber.from("10000"));

        assert.isOk(commission.eq(expectedCommission), "Commission is wrong");
        assert.isOk(commission.eq(referrerBalance), "Referrer balance is wrong");

        const landSaleBeneficiaryBalance = await contracts.sand.balanceOf(LandSaleBeneficiary.address);
        const expectedLandSaleBeneficiaryBalance = BigNumber.from(amount).sub(BigNumber.from(commission)).add(BigNumber.from(land.price).mul(5).div(100)); // Note: LandSaleBeneficiary currently the same as 5% fee recipient
        assert.isOk(landSaleBeneficiaryBalance.eq(expectedLandSaleBeneficiaryBalance), "Balance is wrong");

        for (let sx = 0; sx < land.size; sx++) {
          for (let sy = 0; sy < land.size; sy++) {
            const id = land.x + sx + (land.y + sy) * 408;
            const landOwner = await contracts.land.ownerOf(id);
            assert.equal(landOwner, contracts.estate.address);
          }
        }
        const estateOwner = await contracts.estate.ownerOf(1);
        assert.equal(estateOwner, userWithSAND.address);
      });

      it("can buy estate with adjusted SAND price and referral", async function () {
        const {tree, userWithSAND, userWithoutSAND, LandSaleBeneficiary, lands, contracts, SandAdmin} = initialSetUp;
        const land = lands.filter((l) => l.size === 6).find((l) => !l.reserved);
        const proof = tree.getProof(calculateLandHash(land));

        const adjustedLandPrice = BigNumber.from(land.price).mul(12).div(10);

        await SandAdmin.EstateSale.rebalanceSand("1200");

        const referral = {
          referrer: userWithoutSAND.address,
          referee: userWithSAND.address,
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

        const tx = await userWithSAND.EstateSale.functions.buyLandWithSand(
          userWithSAND.address,
          userWithSAND.address,
          zeroAddress,
          land.x,
          land.y,
          land.size,
          land.price,
          adjustedLandPrice,
          land.salt,
          [],
          proof,
          encodedReferral
        );

        const receipt = await tx.wait();
        const event = receipt.events[1];
        assert.equal(event.event, "ReferralUsed", "Event name is wrong");

        const referrer = event.args[0];
        const referree = event.args[1];
        const token = event.args[2];
        const amount = event.args[3];
        const commission = event.args[4];
        const commissionRate = event.args[5];

        assert.equal(referrer, referral.referrer, "Referrer is wrong");
        assert.equal(referree, referral.referee, "Referee is wrong");
        assert.equal(token, contracts.sand.address, "Token is wrong");
        expect(amount).to.equal(adjustedLandPrice.mul(95).div(100));
        assert.equal(commissionRate, referral.commissionRate, "Amount is wrong");

        const referrerBalance = await contracts.sand.balanceOf(userWithoutSAND.address);

        const expectedCommission = BigNumber.from(amount)
          .mul(BigNumber.from(commissionRate))
          .div(BigNumber.from("10000"));

        assert.isOk(commission.eq(expectedCommission), "Commission is wrong");
        assert.isOk(commission.eq(referrerBalance), "Referrer balance is wrong");

        const landSaleBeneficiaryBalance = await contracts.sand.balanceOf(LandSaleBeneficiary.address);
        const expectedLandSaleBeneficiaryBalance = BigNumber.from(amount).sub(BigNumber.from(commission)).add(BigNumber.from(adjustedLandPrice).mul(5).div(100)); // Note: LandSaleBeneficiary currently the same as 5% fee recipient
        assert.isOk(landSaleBeneficiaryBalance.eq(expectedLandSaleBeneficiaryBalance), "Balance is wrong");

        for (let sx = 0; sx < land.size; sx++) {
          for (let sy = 0; sy < land.size; sy++) {
            const id = land.x + sx + (land.y + sy) * 408;
            const landOwner = await contracts.land.ownerOf(id);
            assert.equal(landOwner, contracts.estate.address);
          }
        }
        const estateOwner = await contracts.estate.ownerOf(1);
        assert.equal(estateOwner, userWithSAND.address);
      });

      it("correct fee is taken when estate is purchased with SAND and referral", async function () {
        const {tree, userWithSAND, userWithoutSAND, lands, contracts, LandSaleFeeRecipient} = initialSetUp;
        const land = lands.filter((l) => l.size === 6).find((l) => !l.reserved);
        const proof = tree.getProof(calculateLandHash(land));

        const referral = {
          referrer: userWithoutSAND.address,
          referee: userWithSAND.address,
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

        await userWithSAND.EstateSale.functions.buyLandWithSand(
          userWithSAND.address,
          userWithSAND.address,
          zeroAddress,
          land.x,
          land.y,
          land.size,
          land.price,
          land.price,
          land.salt,
          [],
          proof,
          encodedReferral
        );

        const feeAmount = BigNumber.from(land.price).mul(5).div(100);
        const salePrice = BigNumber.from(land.price).mul(95).div(100);
        const commission = salePrice.mul(5).div(100);

        const feeBeneficiaryBalance = await contracts.sand.balanceOf(LandSaleFeeRecipient.address);
        expect(feeBeneficiaryBalance).to.equal(feeAmount.add(salePrice).sub(commission)); // 5% fee + land sale price net of commission, as LandSaleBeneficiary currently the same as 5% fee recipient
      });

      it("correct fee is taken when estate is purchased with adjusted SAND price and referral", async function () {
        const {tree, userWithSAND, userWithoutSAND, lands, contracts, LandSaleFeeRecipient, SandAdmin} = initialSetUp;
        const land = lands.filter((l) => l.size === 6).find((l) => !l.reserved);
        const proof = tree.getProof(calculateLandHash(land));

        await SandAdmin.EstateSale.rebalanceSand("1200");

        const referral = {
          referrer: userWithoutSAND.address,
          referee: userWithSAND.address,
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

        const adjustedLandPrice = BigNumber.from(land.price).mul(12).div(10);

        await userWithSAND.EstateSale.functions.buyLandWithSand(
          userWithSAND.address,
          userWithSAND.address,
          zeroAddress,
          land.x,
          land.y,
          land.size,
          land.price,
          adjustedLandPrice,
          land.salt,
          [],
          proof,
          encodedReferral
        );

        const feeAmount = BigNumber.from(adjustedLandPrice).mul(5).div(100);
        const salePrice = BigNumber.from(adjustedLandPrice).mul(95).div(100);
        const commission = salePrice.mul(5).div(100);

        const feeBeneficiaryBalance = await contracts.sand.balanceOf(LandSaleFeeRecipient.address);
        expect(feeBeneficiaryBalance).to.equal(feeAmount.add(salePrice).sub(commission)); // 5% fee + land sale price net of commission, as LandSaleBeneficiary currently the same as 5% fee recipient
      });

      it("can buy Land with SAND and an invalid referral", async function () {
        const {tree, userWithSAND, userWithoutSAND, LandSaleBeneficiary, lands, contracts} = initialSetUp;
        const land = lands.filter((l) => l.size === 6).find((l) => !l.reserved);
        const proof = tree.getProof(calculateLandHash(land));

        const referral = {
          referrer: userWithoutSAND.address,
          referee: userWithSAND.address,
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

        const tx = await userWithSAND.EstateSale.functions.buyLandWithSand(
          userWithSAND.address,
          userWithSAND.address,
          zeroAddress,
          land.x,
          land.y,
          land.size,
          land.price,
          land.price,
          land.salt,
          [],
          proof,
          encodedReferral
        );

        const receipt = await tx.wait();
        const event = receipt.events[1];
        assert.equal(event.event, undefined, "Event should be undefined");

        const referrerBalance = await contracts.sand.balanceOf(userWithoutSAND.address);

        assert.equal(referrerBalance, 0, "Referrer balance is wrong");

        const landSaleBeneficiaryBalance = await contracts.sand.balanceOf(LandSaleBeneficiary.address);
        expect(landSaleBeneficiaryBalance).to.equal(BigNumber.from(land.price)); // land sale beneficiary receives 95% of the land sale price; LandSaleBeneficiary currently the same as 5% fee recipient

        for (let sx = 0; sx < land.size; sx++) {
          for (let sy = 0; sy < land.size; sy++) {
            const id = land.x + sx + (land.y + sy) * 408;
            const landOwner = await contracts.land.ownerOf(id);
            assert.equal(landOwner, contracts.estate.address);
          }
        }
        const estateOwner = await contracts.estate.ownerOf(1);
        assert.equal(estateOwner, userWithSAND.address);
      });

      it("correct fee is taken when estate is purchased with SAND and invalid referral", async function () {
        const {tree, userWithSAND, userWithoutSAND, lands, contracts, LandSaleFeeRecipient} = initialSetUp;
        const land = lands.filter((l) => l.size === 6).find((l) => !l.reserved);
        const proof = tree.getProof(calculateLandHash(land));

        const referral = {
          referrer: userWithoutSAND.address,
          referee: userWithSAND.address,
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

        await userWithSAND.EstateSale.functions.buyLandWithSand(
          userWithSAND.address,
          userWithSAND.address,
          zeroAddress,
          land.x,
          land.y,
          land.size,
          land.price,
          land.price,
          land.salt,
          [],
          proof,
          encodedReferral
        );

        const feeBeneficiaryBalance = await contracts.sand.balanceOf(LandSaleFeeRecipient.address);
        expect(feeBeneficiaryBalance).to.equal(BigNumber.from(land.price)); // 5% fee; LandSaleBeneficiary currently the same as 5% fee recipient
      });

      it("correct fee is taken when estate is purchased with adjusted SAND price and invalid referral", async function () {
        const {tree, userWithSAND, userWithoutSAND, lands, contracts, LandSaleFeeRecipient, SandAdmin} = initialSetUp;
        const land = lands.filter((l) => l.size === 6).find((l) => !l.reserved);
        const proof = tree.getProof(calculateLandHash(land));

        await SandAdmin.EstateSale.rebalanceSand("1200");

        const referral = {
          referrer: userWithoutSAND.address,
          referee: userWithSAND.address,
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

        const adjustedLandPrice = BigNumber.from(land.price).mul(12).div(10);

        await userWithSAND.EstateSale.functions.buyLandWithSand(
          userWithSAND.address,
          userWithSAND.address,
          zeroAddress,
          land.x,
          land.y,
          land.size,
          land.price,
          adjustedLandPrice,
          land.salt,
          [],
          proof,
          encodedReferral
        );

        const feeBeneficiaryBalance = await contracts.sand.balanceOf(LandSaleFeeRecipient.address);
        expect(feeBeneficiaryBalance).to.equal(BigNumber.from(adjustedLandPrice)); // 5% fee; LandSaleBeneficiary currently the same as 5% fee recipient
      });

      it("CANNOT buy Land without SAND", async function () {
        const {tree, userWithoutSAND, lands} = initialSetUp;
        const land = lands.filter((l) => l.size === 6).find((l) => !l.reserved);
        const proof = tree.getProof(calculateLandHash(land));

        await expectRevert(
          userWithoutSAND.EstateSale.functions.buyLandWithSand(
            userWithoutSAND.address,
            userWithoutSAND.address,
            zeroAddress,
            land.x,
            land.y,
            land.size,
            land.price,
            land.price,
            land.salt,
            [],
            proof,
            emptyReferral
          ),
          "not enough fund"
        );
      });

      it("CANNOT buy Land without enough tokens", async function () {
        const {userWithoutSAND, tree, lands, SandAdmin} = initialSetUp;
        const land = lands.filter((l) => l.size === 6).find((l) => !l.reserved);
        const proof = tree.getProof(calculateLandHash(land));

        await SandAdmin.Sand.transfer(userWithoutSAND.address, "4046");

        await expectRevert(
          userWithoutSAND.EstateSale.functions.buyLandWithSand(
            userWithoutSAND.address,
            userWithoutSAND.address,
            zeroAddress,
            land.x,
            land.y,
            land.size,
            land.price,
            land.price,
            land.salt,
            [],
            proof,
            emptyReferral
          ),
          "not enough fund"
        );
      });

      it("CANNOT buy Land without enough tokens for adjusted SAND price", async function () {
        const {userWithoutSAND, tree, lands, SandAdmin} = initialSetUp;
        const land = lands.filter((l) => l.size === 6).find((l) => !l.reserved);
        const proof = tree.getProof(calculateLandHash(land));
        const adjustedLandPrice = BigNumber.from(land.price).mul(12).div(10);

        await SandAdmin.Sand.transfer(userWithoutSAND.address, "4854");
        await SandAdmin.EstateSale.rebalanceSand("1200");

        await expectRevert(
          userWithoutSAND.EstateSale.functions.buyLandWithSand(
            userWithoutSAND.address,
            userWithoutSAND.address,
            zeroAddress,
            land.x,
            land.y,
            land.size,
            land.price,
            adjustedLandPrice,
            land.salt,
            [],
            proof,
            emptyReferral
          ),
          "not enough fund"
        );
      });

      it("CANNOT buy Land with an adjusted price in SAND that does not match with the multiplier set", async function () {
        const {userWithoutSAND, tree, lands, SandAdmin} = initialSetUp;
        const land = lands.filter((l) => l.size === 6).find((l) => !l.reserved);
        const proof = tree.getProof(calculateLandHash(land));
        const adjustedLandPrice = BigNumber.from(land.price).mul(11).div(10);

        await SandAdmin.Sand.transfer(userWithoutSAND.address, "4854");
        await SandAdmin.EstateSale.rebalanceSand("1200");

        await expectRevert(
          userWithoutSAND.EstateSale.functions.buyLandWithSand(
            userWithoutSAND.address,
            userWithoutSAND.address,
            zeroAddress,
            land.x,
            land.y,
            land.size,
            land.price,
            adjustedLandPrice,
            land.salt,
            [],
            proof,
            emptyReferral
          ),
          "INVALID_PRICE"
        );
      });

      it("CANNOT buy lands without just enough tokens", async function () {
        const {userWithoutSAND, tree, lands, SandAdmin} = initialSetUp;
        const land = lands.filter((l) => l.size === 6).find((l) => !l.reserved);
        const proof = tree.getProof(calculateLandHash(land));

        await SandAdmin.Sand.transfer(userWithoutSAND.address, BigNumber.from(land.price).sub(BigNumber.from(1)));

        await expectRevert(
          userWithoutSAND.EstateSale.functions.buyLandWithSand(
            userWithoutSAND.address,
            userWithoutSAND.address,
            zeroAddress,
            land.x,
            land.y,
            land.size,
            land.price,
            land.price,
            land.salt,
            [],
            proof,
            emptyReferral
          ),
          "not enough fund"
        );
      });

      it("can buy Land with just enough tokens", async function () {
        const {userWithoutSAND, tree, lands, SandAdmin} = initialSetUp;
        const land = lands.filter((l) => l.size === 6).find((l) => !l.reserved);
        const proof = tree.getProof(calculateLandHash(land));

        await SandAdmin.Sand.transfer(userWithoutSAND.address, BigNumber.from(land.price));

        await userWithoutSAND.EstateSale.functions.buyLandWithSand(
          userWithoutSAND.address,
          userWithoutSAND.address,
          zeroAddress,
          land.x,
          land.y,
          land.size,
          land.price,
          land.price,
          land.salt,
          [],
          proof,
          emptyReferral
        );
      });

      it("can buy Land with just enough tokens for adjusted land price", async function () {
        const {userWithoutSAND, tree, lands, SandAdmin} = initialSetUp;
        const land = lands.filter((l) => l.size === 6).find((l) => !l.reserved);
        const proof = tree.getProof(calculateLandHash(land));
        const adjustedLandPrice = BigNumber.from(land.price).mul(12).div(10);

        await SandAdmin.Sand.transfer(userWithoutSAND.address, BigNumber.from(adjustedLandPrice));
        await SandAdmin.EstateSale.rebalanceSand("1200");

        await userWithoutSAND.EstateSale.functions.buyLandWithSand(
          userWithoutSAND.address,
          userWithoutSAND.address,
          zeroAddress,
          land.x,
          land.y,
          land.size,
          land.price,
          adjustedLandPrice,
          land.salt,
          [],
          proof,
          emptyReferral
        );
      });

      it("CANNOT buy Land from a non reserved Land with reserved param (empty referral)", async function () {
        const {tree, userWithSAND, lands} = initialSetUp;
        const land = lands.find((l) => l.size === 6);
        const proof = tree.getProof(calculateLandHash(land));

        await expectRevert(
          userWithSAND.EstateSale.functions.buyLandWithSand(
            userWithSAND.address,
            userWithSAND.address,
            userWithSAND.address,
            land.x,
            land.y,
            land.size,
            land.price,
            land.price,
            land.salt,
            [],
            proof,
            emptyReferral
          ),
          "INVALID_LAND"
        );
      });

      it("CANNOT buy LAND when minter rights revoked (empty referral)", async function () {
        const {LandAdmin, tree, userWithSAND, lands, contracts} = initialSetUp;

        await LandAdmin.Land.functions.setMinter(contracts.estateSale.address, false).then((tx) => tx.wait());

        const land = lands.filter((l) => l.size === 6).find((l) => !l.reserved);
        const proof = tree.getProof(calculateLandHash(land));

        await expectRevert(
          userWithSAND.EstateSale.functions.buyLandWithSand(
            userWithSAND.address,
            userWithSAND.address,
            zeroAddress,
            land.x,
            land.y,
            land.size,
            land.price,
            land.price,
            land.salt,
            [],
            proof,
            emptyReferral
          ),
          "Only a minter can mint"
        );
      });

      it("CANNOT buy LAND twice (empty referral)", async function () {
        const {tree, userWithSAND, lands} = initialSetUp;
        const land = lands.filter((l) => l.size === 6).find((l) => !l.reserved);
        const proof = tree.getProof(calculateLandHash(land));

        await userWithSAND.EstateSale.functions.buyLandWithSand(
          userWithSAND.address,
          userWithSAND.address,
          zeroAddress,
          land.x,
          land.y,
          land.size,
          land.price,
          land.price,
          land.salt,
          [],
          proof,
          emptyReferral
        );

        await expectRevert(
          userWithSAND.EstateSale.functions.buyLandWithSand(
            userWithSAND.address,
            userWithSAND.address,
            zeroAddress,
            land.x,
            land.y,
            land.size,
            land.price,
            land.price,
            land.salt,
            [],
            proof,
            emptyReferral
          ),
          "Already minted"
        );
      });

      it("CANNOT buy LAND with invalid proof (empty referral)", async function () {
        const {userWithSAND, lands} = initialSetUp;
        const proof = [
          "0x0000000000000000000000000000000000000000000000000000000000000001",
          "0x0000000000000000000000000000000000000000000000000000000000000002",
          "0x0000000000000000000000000000000000000000000000000000000000000003",
        ];
        const land = lands.filter((l) => l.size === 6).find((l) => !l.reserved);
        await expectRevert(
          userWithSAND.EstateSale.functions.buyLandWithSand(
            userWithSAND.address,
            userWithSAND.address,
            userWithSAND.address,
            land.x,
            land.y,
            land.size,
            land.price,
            land.price,
            land.salt,
            [],
            proof,
            emptyReferral
          ),
          "INVALID_LAND"
        );
      });

      it("CANNOT buy LAND with wrong proof (empty referral)", async function () {
        const {tree, userWithSAND, lands} = initialSetUp;
        const land = lands.filter((l) => l.size === 6).find((l) => !l.reserved);
        const proof = tree.getProof(calculateLandHash(lands[2]));

        await expectRevert(
          userWithSAND.EstateSale.functions.buyLandWithSand(
            userWithSAND.address,
            userWithSAND.address,
            userWithSAND.address,
            land.x,
            land.y,
            land.size,
            land.price,
            land.price,
            land.salt,
            [],
            proof,
            emptyReferral
          ),
          "INVALID_LAND"
        );
      });

      it("after buying user owns an Estate token and the Estate contract owns all LANDs (empty referral)", async function () {
        const {tree, userWithSAND, lands, contracts} = initialSetUp;
        const land = lands.filter((l) => l.size === 6).find((l) => !l.reserved);
        const proof = tree.getProof(calculateLandHash(land));
        await userWithSAND.EstateSale.functions.buyLandWithSand(
          userWithSAND.address,
          userWithSAND.address,
          zeroAddress,
          land.x,
          land.y,
          land.size,
          land.price,
          land.price,
          land.salt,
          [],
          proof,
          emptyReferral
        );
        for (let x = land.x; x < land.x + land.size; x++) {
          for (let y = land.y; y < land.y + lands.size; y++) {
            const owner = await contracts.land.ownerOf(x + y * 408);
            assert.equal(owner, contracts.estate.address);
            const balance = await contracts.land.balanceOf(userWithSAND.address);
            assert.isOk(balance.eq(BigNumber.from(land.size ** 2)));
          }
        }
        const estateOwner = await contracts.estate.ownerOf(1);
        assert.equal(estateOwner, userWithSAND.address);
      });

      // TODO investigate
      it.skip("CANNOT buy a land after the expiry time (empty referral)", async function () {
        const {lands, userWithSAND, tree} = initialSetUp;
        const land = lands.filter((l) => l.size === 6).find((l) => !l.reserved);
        const proof = tree.getProof(calculateLandHash(land));
        await increaseTime(60 * 60);
        await expectRevert(
          userWithSAND.EstateSale.functions.buyLandWithSand(
            userWithSAND.address,
            userWithSAND.address,
            zeroAddress,
            land.x,
            land.y,
            land.size,
            land.price,
            land.price,
            land.salt,
            [],
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
      });

      it("CANNOT buy Land from a reserved Land of a different address (empty referral)", async function () {
        const {lands, userWithSAND, tree} = initialSetUp;
        const land = lands[0];
        const proof = tree.getProof(calculateLandHash(land));

        await expectRevert(
          userWithSAND.EstateSale.functions.buyLandWithSand(
            userWithSAND.address,
            userWithSAND.address,
            userWithSAND.address,
            land.x,
            land.y,
            land.size,
            land.price,
            land.price,
            land.salt,
            [],
            proof,
            emptyReferral
          ),
          "INVALID_LAND"
        );
      });

      it("can buy land (size === 1) from a reserved Land if matching address (empty referral)", async function () {
        const {lands, secondUserWithSAND, tree, contracts} = initialSetUp;
        const land = lands[0];
        const proof = tree.getProof(calculateLandHash(land));
        await secondUserWithSAND.EstateSale.functions.buyLandWithSand(
          secondUserWithSAND.address,
          secondUserWithSAND.address,
          secondUserWithSAND.address,
          land.x,
          land.y,
          land.size,
          land.price,
          land.price,
          land.salt,
          [],
          proof,
          emptyReferral
        );
        const owner = await contracts.land.ownerOf(400 + 106 * 408);
        assert.equal(owner, secondUserWithSAND.address);
      });

      it("can buy lands (size > 1) from a reserved Land if matching address (empty referral)", async function () {
        const {lands, secondUserWithSAND, tree, contracts} = initialSetUp;
        const land = lands[3];
        const proof = tree.getProof(calculateLandHash(land));
        await secondUserWithSAND.EstateSale.functions.buyLandWithSand(
          secondUserWithSAND.address,
          secondUserWithSAND.address,
          secondUserWithSAND.address,
          land.x,
          land.y,
          land.size,
          land.price,
          land.price,
          land.salt,
          [],
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
        assert.equal(estateOwner, secondUserWithSAND.address);
      });

      it("can buy land (size === 1) from a reserved Land and send it to another address (empty referral)", async function () {
        const {lands, secondUserWithSAND, userWithoutSAND, tree, contracts} = initialSetUp;
        const land = lands[0];
        const proof = tree.getProof(calculateLandHash(land));
        await secondUserWithSAND.EstateSale.functions.buyLandWithSand(
          secondUserWithSAND.address,
          userWithoutSAND.address,
          secondUserWithSAND.address,
          land.x,
          land.y,
          land.size,
          land.price,
          land.price,
          land.salt,
          [],
          proof,
          emptyReferral
        );
        const owner = await contracts.land.ownerOf(400 + 106 * 408);
        assert.equal(owner, userWithoutSAND.address);
      });

      it("can buy lands (size > 1) from a reserved Land and send it to another address (empty referral)", async function () {
        const {lands, secondUserWithSAND, userWithoutSAND, tree, contracts} = initialSetUp;
        const land = lands[3];
        const proof = tree.getProof(calculateLandHash(land));
        await secondUserWithSAND.EstateSale.functions.buyLandWithSand(
          secondUserWithSAND.address,
          userWithoutSAND.address,
          secondUserWithSAND.address,
          land.x,
          land.y,
          land.size,
          land.price,
          land.price,
          land.salt,
          [],
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
        assert.equal(estateOwner, userWithoutSAND.address);
      });

      it("can buy all LANDs specified in json except reserved lands (empty referral)", async function () {
        const {lands, userWithSAND, tree} = initialSetUp;
        for (const land of lands) {
          const proof = tree.getProof(calculateLandHash(land));
          if (land.reserved) {
            await expectRevert(
              userWithSAND.EstateSale.functions.buyLandWithSand(
                userWithSAND.address,
                userWithSAND.address,
                land.reserved,
                land.x,
                land.y,
                land.size,
                land.price,
                land.price,
                land.salt,
                land.assetIds,
                proof,
                emptyReferral
              ),
              "RESERVED_LAND"
            );
          } else {
            try {
              await userWithSAND.EstateSale.functions.buyLandWithSand(
                userWithSAND.address,
                userWithSAND.address,
                zeroAddress,
                land.x,
                land.y,
                land.size,
                land.price,
                land.price,
                land.salt,
                land.assetIds,
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

    describe("--> Tests with test LANDs for assets bundle", function () {
      beforeEach(async function () {
        initialSetUp = await setupEstateSale(landSaleName, "testLands");
      });

      it("can buy Land with assets", async function () {
        const {lands, userWithSAND, tree, contracts} = initialSetUp;
        const land = lands[5];
        const proof = tree.getProof(calculateLandHash(land));

        await userWithSAND.EstateSale.functions.buyLandWithSand(
          userWithSAND.address,
          userWithSAND.address,
          zeroAddress,
          land.x,
          land.y,
          land.size,
          land.price,
          land.price,
          land.salt,
          land.assetIds,
          proof,
          emptyReferral
        );

        const {asset} = contracts;
        const balances = await asset.callStatic.balanceOfBatch(
          land.assetIds.map(() => userWithSAND.address),
          land.assetIds
        );
        expect(balances[0]).to.equal(1);
      });

      it("can buy Land with zero assets", async function () {
        const {lands, userWithSAND, tree} = initialSetUp;
        const land = lands[4];
        const proof = tree.getProof(calculateLandHash(land));

        await userWithSAND.EstateSale.functions.buyLandWithSand(
          userWithSAND.address,
          userWithSAND.address,
          zeroAddress,
          land.x,
          land.y,
          land.size,
          land.price,
          land.price,
          land.salt,
          land.assetIds,
          proof,
          emptyReferral
        );
      });

      it("CANNOT buy Land with assets using zero asset", async function () {
        const {lands, userWithSAND, tree} = initialSetUp;
        const land = lands[5];
        const proof = tree.getProof(calculateLandHash(land));

        await expectRevert(
          userWithSAND.EstateSale.functions.buyLandWithSand(
            userWithSAND.address,
            userWithSAND.address,
            zeroAddress,
            land.x,
            land.y,
            land.size,
            land.price,
            land.price,
            land.salt,
            [],
            proof,
            emptyReferral
          ),
          "INVALID_LAND"
        );
      });

      it("can withdraw asset token post sale from admin", async function () {
        const {lands, userWithSAND, contracts} = initialSetUp;
        const {asset, estateSale} = contracts;
        const land = lands[5];
        await increaseTime(60 * 60 + 1);
        await estateSale.functions.withdrawAssets(
          userWithSAND.address,
          land.assetIds,
          land.assetIds.map(() => 1)
        );

        const balances = await asset.callStatic.balanceOfBatch(
          land.assetIds.map(() => userWithSAND.address),
          land.assetIds
        );
        expect(balances[0]).to.equal(1);
      });

      it("CANNOT withdraw asset token post sale if not admin", async function () {
        const {lands, userWithSAND} = initialSetUp;
        const land = lands[5];
        await increaseTime(60 * 60 + 1);
        await expectRevert(
          userWithSAND.EstateSale.functions.withdrawAssets(
            userWithSAND.address,
            land.assetIds,
            land.assetIds.map(() => 1)
          ),
          "NOT_AUTHORIZED"
        );
      });
    });
  });
}

module.exports = {
  runSandTests,
};
