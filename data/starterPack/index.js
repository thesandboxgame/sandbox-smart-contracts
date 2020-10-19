const ethers = require("ethers");
const {BigNumber} = ethers;
function sandWei(amount) {
  return BigNumber.from(amount).mul("1000000000000000000").toString();
}

// sand price is in Sand unit (Sand has 18 decimals)
module.exports.starterPackPrices = [sandWei(20), sandWei(60), sandWei(200), sandWei(800)];
module.exports.gemPrice = sandWei(20);
