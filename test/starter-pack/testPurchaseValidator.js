const {setupStarterPack} = require("./fixtures");
const {expectRevert, zeroAddress} = require("local-utils");
const {assert} = require("chai");
const {getNamedAccounts} = require("@nomiclabs/buidler");
const {signPurchaseMessage} = require("../../lib/purchaseMessageSigner");
const privateKey = "0x4242424242424242424242424242424242424242424242424242424242424242";

const catIds = [0, 1, 2, 3];
const catAmounts = [0, 0, 0, 1];
const gemIds = [0, 1, 2, 3, 4];
const gemAmounts = [0, 0, 0, 0, 4];

let purchaseMessage = {
  catalystIds: catIds,
  catalystQuantities: catAmounts,
  gemIds: gemIds,
  gemQuantities: gemAmounts,
  // buyer: 0x0,
  buyer: zeroAddress,
  nonce: 0, // queuId:0, nonce:0
};

describe("Validating Purchase Messages", function () {
  it("Purchase validator function exists", async function () {
    const {starterPackContract: starterPack} = await setupStarterPack();
    const {others} = await getNamedAccounts();
    const starterPackBuyer = others[0];
    const goodMsg = Object.assign({}, purchaseMessage, {buyer: starterPackBuyer});
    const sig = await signPurchaseMessage(privateKey, goodMsg);

    assert.ok(await starterPack.isPurchaseValid(starterPackBuyer, goodMsg, sig));
  });

  it("should fail if the from address does not match", async function () {
    const {starterPackContract: starterPack} = await setupStarterPack();
    const {others} = await getNamedAccounts();
    const starterPackBuyer = others[0];
    const wrongFromAddress = others[1];
    const goodMsg = Object.assign({}, purchaseMessage, {buyer: starterPackBuyer});
    const sig = await signPurchaseMessage(privateKey, goodMsg);

    await expectRevert(starterPack.isPurchaseValid(wrongFromAddress, goodMsg, sig), "INVALID_SENDER");
  });

  it("should fail if the nonce is re-used", async function () {
    const {starterPackContract: starterPack} = await setupStarterPack();
    const {others} = await getNamedAccounts();
    const starterPackBuyer = others[0];
    const goodMsg = Object.assign({}, purchaseMessage, {buyer: starterPackBuyer});
    const sig = await signPurchaseMessage(privateKey, goodMsg);
    assert.ok(await starterPack.isPurchaseValid(starterPackBuyer, goodMsg, sig));

    await expectRevert(starterPack.isPurchaseValid(starterPackBuyer, goodMsg, sig), "INVALID_NONCE");
  });
});
