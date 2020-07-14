const {assert} = require("local-chai");
const {setupStarterPack} = require("./fixtures");
const {expectRevert} = require("local-utils");
const {getMsgAndSignature} = require("./_testHelper");
const {getNamedAccounts} = require("@nomiclabs/buidler");

describe("PurchaseValidator", function () {
  let starterPack;
  let message;
  let signature;
  let roles;

  beforeEach(async function () {
    ({starterPackContract: starterPack} = await setupStarterPack());
    ({message, signature} = await getMsgAndSignature());
    roles = await getNamedAccounts();
  });
  describe("Validation", function () {
    it("Purchase validator function exists", async function () {
      assert.ok(
        await starterPack.isPurchaseValid(
          message.buyer,
          message.catalystIds,
          message.catalystQuantities,
          message.gemIds,
          message.gemQuantities,
          message.buyer,
          message.nonce,
          signature
        )
      );
    });

    it("the order of catalystIds should't matter", async function () {
      message.catalystIds = [2, 3, 0, 1];
      message.gemQuantities = [0, 0, 1, 1, 0];
      assert.ok(
        await starterPack.isPurchaseValid(
          message.buyer,
          message.catalystIds,
          message.catalystQuantities,
          message.gemIds,
          message.gemQuantities,
          message.buyer,
          message.nonce,
          signature
        )
      );

      message.catalystIds = [3, 2, 1, 0];
      message.catalystQuantities = [2, 1, 0, 3];
      message.gemQuantities = [5, 2, 3, 1, 3];
      assert.ok(
        await starterPack.isPurchaseValid(
          message.buyer,
          message.catalystIds,
          message.catalystQuantities,
          message.gemIds,
          message.gemQuantities,
          message.buyer,
          message.nonce + 1,
          signature
        )
      );
    });

    it("Should be possible to get the nonce for a buyer", async function () {
      const nonce = await starterPack.getNonceByBuyer(message.buyer, 0);
      assert.equal(nonce, 0);
    });

    it("Should be possible to get the signing wallet", async function () {
      const {starterPackContract: starterPack} = await setupStarterPack();
      const {backendMessageSigner} = await getNamedAccounts();
      const wallet = await starterPack.getSigningWallet();
      assert.equal(wallet, backendMessageSigner);
    });

    it("Should be possible for Admin to update the signing wallet", async function () {
      const {starterPackContractAsAdmin: starterPackAsAdmin} = await setupStarterPack();
      const newSigner = roles.others[1];
      await starterPackAsAdmin.updateSigningWallet(newSigner);
      const wallet = await starterPackAsAdmin.getSigningWallet();
      assert.equal(wallet, newSigner);
    });
  });

  describe("Failures", function () {
    it("should fail if the from address does not match", async function () {
      ({starterPackContract: starterPack} = await setupStarterPack());
      const wrongFromAddress = roles.others[1];
      await expectRevert(
        starterPack.isPurchaseValid(
          wrongFromAddress,
          message.catalystIds,
          message.catalystQuantities,
          message.gemIds,
          message.gemQuantities,
          message.buyer,
          message.nonce,
          signature
        ),
        "INVALID_SENDER"
      );
    });
  });
  it("should fail if the nonce is re-used", async function () {
    ({starterPackContract: starterPack} = await setupStarterPack());
    assert.ok(
      await starterPack.isPurchaseValid(
        message.buyer,
        message.catalystIds,
        message.catalystQuantities,
        message.gemIds,
        message.gemQuantities,
        message.buyer,
        message.nonce,
        signature
      )
    );

    await expectRevert(
      starterPack.isPurchaseValid(
        message.buyer,
        message.catalystIds,
        message.catalystQuantities,
        message.gemIds,
        message.gemQuantities,
        message.buyer,
        message.nonce,
        signature
      ),
      "INVALID_NONCE"
    );
  });

  it("should fail if too many gems are requested", async function () {
    ({starterPackContract: starterPack} = await setupStarterPack());
    message.catalystQuantities = [1, 1, 1, 1];
    // total gems allowed is max 10
    message.gemQuantities = [3, 2, 4, 2, 3];
    await expectRevert(
      starterPack.isPurchaseValid(
        message.buyer,
        message.catalystIds,
        message.catalystQuantities,
        message.gemIds,
        message.gemQuantities,
        message.buyer,
        message.nonce,
        signature
      ),
      "INVALID_GEMS"
    );
  });
  it("Should fail if anyone but Admin tries to update signing wallet", async function () {
    const {starterPackContract: starterPack} = await setupStarterPack();
    const newSigner = roles.others[0];
    await expectRevert(starterPack.updateSigningWallet(newSigner), "SENDER_NOT_ADMIN");
  });
});
