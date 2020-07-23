const ethers = require("ethers");
const {Wallet} = ethers;
const {solidityKeccak256, arrayify} = ethers.utils;

function signPurchaseMessage(privateKey, message, buyer) {
  const hashedData = solidityKeccak256(
    ["uint256[]", "uint256[]", "uint256[]", "uint256[]", "address", "uint256"],
    [message.catalystIds, message.catalystQuantities, message.gemIds, message.gemQuantities, buyer, message.nonce]
  );
  const wallet = new Wallet(privateKey);
  return wallet.signMessage(arrayify(hashedData));
}

module.exports = {
  signPurchaseMessage,
};
