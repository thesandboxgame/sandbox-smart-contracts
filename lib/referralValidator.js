const ethers = require("ethers");
const {Wallet} = ethers;
const {solidityKeccak256, arrayify} = ethers.utils;

function createReferral(privateKey, referrer, referee, expiryTime, commissionRate) {
  const hashedData = solidityKeccak256(
    ["address", "address", "uint256", "uint256"],
    [referrer, referee, expiryTime, commissionRate]
  );
  const wallet = new Wallet(privateKey);
  return wallet.signMessage(arrayify(hashedData));
}

module.exports = {
  createReferral,
};
