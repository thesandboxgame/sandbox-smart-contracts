const {assert} = require("chai");
const {setupStarterPack} = require("./fixtures");
const {expectRevert} = require("local-utils");
const {getMsgAndSignature} = require("./_testHelper");
const {getNamedAccounts} = require("@nomiclabs/buidler");

describe("ValidatingPurchaseMessages", function () {
  let starterPack;
  let message;
  let signature;
  let roles;

  beforeEach(async function () {
    ({starterPackContract: starterPack} = await setupStarterPack());
    ({message, signature} = await getMsgAndSignature());
    roles = await getNamedAccounts();
  });

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

  it("should fail if the from address does not match", async function () {
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

  it("should fail if the nonce is re-used", async function () {
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
    const {starterPackContract: starterPack} = await setupStarterPack();
    const {others} = await getNamedAccounts();
    const starterPackBuyer = others[0];
    purchaseMessage.catalystQuantities = [1, 1, 1, 1];
    // total gems allowed is max 10
    purchaseMessage.gemQuantities = [3, 2, 4, 2, 3];
    purchaseMessage.buyer = starterPackBuyer;
    const sig = await signPurchaseMessage(privateKey, purchaseMessage);
    await expectRevert(starterPack.isPurchaseValid(starterPackBuyer, purchaseMessage, sig), "INVALID_GEMS");
  });
});
