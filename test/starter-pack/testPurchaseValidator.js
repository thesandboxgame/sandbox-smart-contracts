const {setupStarterPack} = require("./fixtures");
const {expectRevert} = require("local-utils");
const {assert} = require("chai");
const {getNamedAccounts} = require("@nomiclabs/buidler");
const {signPurchaseMessage} = require("../../lib/purchaseMessageSigner");
const privateKey = "0x4242424242424242424242424242424242424242424242424242424242424242";

const catIds = [0, 1, 2, 3];
const catAmounts = [0, 0, 0, 1];
const gemIds = [0, 1, 2, 3, 4];
const gemAmounts = [0, 0, 0, 0, 4];

describe("Validating Purchase Messages", function () {
  it("Purchase validator function exists", async function () {
    const {starterPackContract: starterPack} = await setupStarterPack();
    const {others} = await getNamedAccounts();
    const starterPackBuyer = others[0];

    const purchaseMessage = {
      catalystIds: catIds,
      catalystQuantities: catAmounts,
      gemIds: gemIds,
      gemQuantities: gemAmounts,
      buyer: starterPackBuyer,
      nonce: 1,
    };

    const sig = await signPurchaseMessage(privateKey, purchaseMessage);

    assert.ok(await starterPack.isPurchaseValid(starterPackBuyer, purchaseMessage, sig));
  });

  it("should fail if the from address does not match", async function () {
    const {starterPackContract: starterPack} = await setupStarterPack();
    const {others} = await getNamedAccounts();
    const starterPackBuyer = others[0];
    const wrongFromAddress = others[1];
    const purchaseMessage = {
      catalystIds: catIds,
      catalystQuantities: catAmounts,
      gemIds: gemIds,
      gemQuantities: gemAmounts,
      buyer: starterPackBuyer,
      nonce: 1,
    };
    const sig = await signPurchaseMessage(privateKey, purchaseMessage);
    await expectRevert(starterPack.isPurchaseValid(wrongFromAddress, purchaseMessage, sig), "INVALID_SENDER");
  });

  it("should fail if the nonce is re-used", async function () {
    const {starterPackContract: starterPack} = await setupStarterPack();
    const {others} = await getNamedAccounts();
    const starterPackBuyer = others[0];
    const purchaseMessage = {
      catalystIds: catIds,
      catalystQuantities: catAmounts,
      gemIds: gemIds,
      gemQuantities: gemAmounts,
      buyer: starterPackBuyer,
      nonce: 1,
    };
    const sig = await signPurchaseMessage(privateKey, purchaseMessage);
    assert.ok(await starterPack.isPurchaseValid(starterPackBuyer, purchaseMessage, sig));

    await expectRevert(starterPack.isPurchaseValid(starterPackBuyer, purchaseMessage, sig), "INVALID_NONCE");
  });
});
