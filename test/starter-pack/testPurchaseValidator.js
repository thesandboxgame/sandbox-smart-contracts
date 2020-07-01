const {setupStarterPack} = require("./fixtures");
const {assert} = require("chai");
const {getNamedAccounts} = require("@nomiclabs/buidler");
const {createPurchase} = require("../../lib/purchaseValidator");
const privateKey = "0x4242424242424242424242424242424242424242424242424242424242424242";

const catIds = [0, 1, 2, 3];
const catAmounts = [0, 0, 0, 1];
const gemIds = [0, 1, 2, 3, 4];
const gemAmounts = [0, 0, 0, 0, 4];

describe("Validating Purchase Messages", function () {
  it("Purchase validator function exists", async function () {
    const {starterPackContract: starterPack, metaTxContract} = await setupStarterPack();
    const {others} = await getNamedAccounts();
    const purchase = {
      from: metaTxContract.address,
      to: others[0],
      catalystIds: catIds,
      catalystQuantities: catAmounts,
      gemIds: gemIds,
      gemQuantities: gemAmounts,
      nonce: 1,
    };

    const sig = await createPurchase(
      privateKey,
      purchase.from,
      purchase.to,
      purchase.catalystIds,
      purchase.catalystQuantities,
      purchase.gemIds,
      purchase.gemQuantities,
      purchase.nonce
    );

    assert.ok(
      await starterPack.isPurchaseValid(
        purchase.from,
        purchase.to,
        purchase.catalystIds,
        purchase.catalystQuantities,
        purchase.gemIds,
        purchase.gemQuantities,
        purchase.nonce,
        sig
      )
    );
  });
});
