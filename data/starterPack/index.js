const ethers = require("ethers");
const {BigNumber} = ethers;
function sandWei(amount) {
  return BigNumber.from(amount).mul("1000000000000000000").toString();
}

// sand price is in Sand unit (Sand has 18 decimals)
module.exports.starterPackPrices = [sandWei(18), sandWei(55), sandWei(182), sandWei(727)];
module.exports.gemPrices = sandWei(42);
