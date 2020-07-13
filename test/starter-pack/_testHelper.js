const {signPurchaseMessage} = require("../../lib/purchaseMessageSigner");
const {setupStarterPack} = require("./fixtures");
const privateKey = "0x4242424242424242424242424242424242424242424242424242424242424242";

// Example queueIds and nonces:
// const queueId1_nonce1 = BigNumber.from("0x0000000000000000000000000000000100000000000000000000000000000001");
// const queueId42_nonce11 = BigNumber.from("0x0000000000000000000000000000002A0000000000000000000000000000000B");

async function getMsgAndSignature() {
  const {others} = await getNamedAccounts();
  const catIds = [0, 1, 2, 3];
  const catAmounts = [0, 0, 0, 1];
  const gemIds = [0, 1, 2, 3, 4];
  const gemAmounts = [0, 0, 0, 0, 4];
  const starterPackBuyer = others[0];
  const message = {
    catalystIds: catIds,
    catalystQuantities: catAmounts,
    gemIds: gemIds,
    gemQuantities: gemAmounts,
    buyer: starterPackBuyer,
    nonce: 0, // queueId:0, nonce:0
  };
  const signature = await signPurchaseMessage(privateKey, message);
  return {message, signature};
}

async function getSignature(catIds, catAmounts, gemIds, gemAmounts, starterPackBuyer, nonce) {
  const message = {
    catalystIds: catIds,
    catalystQuantities: catAmounts,
    gemIds: gemIds,
    gemQuantities: gemAmounts,
    buyer: starterPackBuyer,
    nonce: nonce,
  };
  const signature = await signPurchaseMessage(privateKey, message);
  return signature;
}

module.exports = {
  getMsgAndSignature,
  getSignature,
};
