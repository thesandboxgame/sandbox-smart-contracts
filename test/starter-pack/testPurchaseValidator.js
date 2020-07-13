const {assert} = require("chai");
const {BigNumber} = require("ethers");
const {getNamedAccounts} = require("@nomiclabs/buidler");
const {setupStarterPack} = require("./fixtures");
const {expectRevert, zeroAddress} = require("local-utils");
const {signPurchaseMessage} = require("../../lib/purchaseMessageSigner");
const {getMsgAndSignature} = require('./_testHelper')
const privateKey = "0x4242424242424242424242424242424242424242424242424242424242424242";

// Example queueIds and nonces:
// const queueId1_nonce1 = BigNumber.from("0x0000000000000000000000000000000100000000000000000000000000000001");
// const queueId42_nonce11 = BigNumber.from("0x0000000000000000000000000000002A0000000000000000000000000000000B");

const catIds = [0, 1, 2, 3];
const catAmounts = [0, 0, 0, 1];
const gemIds = [0, 1, 2, 3, 4];
const gemAmounts = [0, 0, 0, 0, 4];

let purchaseMessage = {
  catalystIds: catIds,
  catalystQuantities: catAmounts,
  gemIds: gemIds,
  gemQuantities: gemAmounts,
  buyer: zeroAddress,
  nonce: 0, // queuId:0, nonce:0
};

describe("ValidatingPurchaseMessages", function () {
  it("Purchase validator function exists", async function () {
    const {starterPackContract: starterPack} = await setupStarterPack();
    const {others} = await getNamedAccounts();
    const starterPackBuyer = others[0];
    const goodMsg = Object.assign({}, purchaseMessage, {buyer: starterPackBuyer});
    const sig = await signPurchaseMessage(privateKey, goodMsg);

    assert.ok(
      await starterPack.isPurchaseValid(
        starterPackBuyer,
        purchaseMessage.catalystIds,
        purchaseMessage.catalystQuantities,
        purchaseMessage.gemIds,
        purchaseMessage.gemQuantities,
        starterPackBuyer,
        purchaseMessage.nonce,
        sig
      )
    );
  });

  it("should fail if the from address does not match", async function () {
    const {starterPackContract: starterPack} = await setupStarterPack();
    const {others} = await getNamedAccounts();
    const starterPackBuyer = others[0];
    const wrongFromAddress = others[1];
    const goodMsg = Object.assign({}, purchaseMessage, {buyer: starterPackBuyer});
    const sig = await signPurchaseMessage(privateKey, goodMsg);

    await expectRevert(
      starterPack.isPurchaseValid(
        wrongFromAddress,
        purchaseMessage.catalystIds,
        purchaseMessage.catalystQuantities,
        purchaseMessage.gemIds,
        purchaseMessage.gemQuantities,
        starterPackBuyer,
        purchaseMessage.nonce,
        sig
      ),
      "INVALID_SENDER"
    );
  });

  it("should fail if the nonce is re-used", async function () {
    const {starterPackContract: starterPack} = await setupStarterPack();
    const {others} = await getNamedAccounts();
    const starterPackBuyer = others[0];
    const goodMsg = Object.assign({}, purchaseMessage, {buyer: starterPackBuyer});
    const sig = await signPurchaseMessage(privateKey, goodMsg);
    assert.ok(
      await starterPack.isPurchaseValid(
        starterPackBuyer,
        purchaseMessage.catalystIds,
        purchaseMessage.catalystQuantities,
        purchaseMessage.gemIds,
        purchaseMessage.gemQuantities,
        starterPackBuyer,
        purchaseMessage.nonce,
        sig
      )
    );

    await expectRevert(
      starterPack.isPurchaseValid(
        starterPackBuyer,
        purchaseMessage.catalystIds,
        purchaseMessage.catalystQuantities,
        purchaseMessage.gemIds,
        purchaseMessage.gemQuantities,
        starterPackBuyer,
        purchaseMessage.nonce,
        sig
      ),
      "INVALID_NONCE"
    );
  });
});
