const ethers = require("ethers");
const {Wallet} = ethers;
const {solidityKeccak256, arrayify} = ethers.utils;

function createPurchase(privateKey, from, to, catalystIds, catalystQuantities, gemIds, gemQuantities, nonce) {
  const hashedData = solidityKeccak256(
    ["address", "address", "uint256[]", "uint256[]", "uint256[]", "uint256[]", "uint256"],
    [from, to, catalystIds, catalystQuantities, gemIds, gemQuantities, nonce]
  );
  const wallet = new Wallet(privateKey);
  return wallet.signMessage(arrayify(hashedData));
}

module.exports = {
  createPurchase,
};
