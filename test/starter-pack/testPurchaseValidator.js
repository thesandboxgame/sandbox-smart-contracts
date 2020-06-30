const {setupStarterPack} = require("./fixtures");
const {assert} = require("chai");
const {getNamedAccounts} = require("@nomiclabs/buidler");
const {createPurchase} = require("../../lib/purchaseValidator");

describe("Validating Purchase Messages", function () {
  it.skip("should fail if the nonce is reused", async function () {
    const {backendReferralWallet, others} = await getNamedAccounts();

    const catIds = [0, 1, 2, 3];
    const catAmounts = [0, 0, 0, 1];
    const gemIds = [0, 1, 2, 3, 4];
    const gemAmounts = [0, 0, 0, 0, 4];

    const purchase = {
      from: backendReferralWallet,
      to: others[0],
      catalystIds: catIds,
      catalystQuantities: catAmounts,
      gemIds: gemIds,
      gemQuantities: gemAmounts,
      nonce: 1,
      expiryTime: Math.floor(Date.now() / 1000) + 10000, // determine desired expiryTime
    };

    const sig = await createPurchase(
      privateKey,
      purchase.from,
      purchase.to,
      purchase.catalystIds,
      purchase.catalystQuantities,
      purchase.gemIds,
      purchase.gemQuantities,
      purchase.nonce,
      purchase.expiryTime
    );
  });

  it.only("Purchase validator function exists", async function () {
    const {starterPackContract: starterPack} = await setupStarterPack();
    const {backendReferralWallet, others} = await getNamedAccounts();
    const privateKey = "0x96aa38e97d1d0d19e0f1d5215ff9dad66dc5d99225b1657205d124d00d2de177";

    const catIds = [0, 1, 2, 3];
    const catAmounts = [0, 0, 0, 1];
    const gemIds = [0, 1, 2, 3, 4];
    const gemAmounts = [0, 0, 0, 0, 4];

    const purchase = {
      from: backendReferralWallet,
      to: others[0],
      catalystIds: catIds,
      catalystQuantities: catAmounts,
      gemIds: gemIds,
      gemQuantities: gemAmounts,
      nonce: 1,
      expiryTime: Math.floor(Date.now() / 1000) + 10000, // determine desired expiryTime
    };

    const sig = await createPurchase(
      privateKey,
      purchase.from,
      purchase.to,
      purchase.catalystIds,
      purchase.catalystQuantities,
      purchase.gemIds,
      purchase.gemQuantities,
      purchase.nonce,
      purchase.expiryTime,
      backendReferralWallet
    );

    assert.ok(
      await starterPack.isPurchaseValid(
        sig,
        purchase.from,
        purchase.to,
        purchase.catalystIds,
        purchase.catalystQuantities,
        purchase.gemIds,
        purchase.gemQuantities,
        purchase.nonce,
        purchase.expiryTime
      )
    );
  });
});
