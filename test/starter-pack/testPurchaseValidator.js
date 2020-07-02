const {setupStarterPack} = require("./fixtures");
const {assert} = require("chai");
const {getNamedAccounts} = require("@nomiclabs/buidler");
const {signPurchaseMessage} = require("../../lib/purchaseMessageSigner");
const privateKey = "0x4242424242424242424242424242424242424242424242424242424242424242";

const catIds = [0, 1, 2, 3];
const catAmounts = [0, 0, 0, 1];
const gemIds = [0, 1, 2, 3, 4];
const gemAmounts = [0, 0, 0, 0, 4];

describe("Validating Purchase Messages", function () {
  it.only("Purchase validator function exists", async function () {
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
});
