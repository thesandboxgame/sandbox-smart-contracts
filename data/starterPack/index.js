const ethers = require("ethers");
const {BigNumber} = ethers;
function sandWei(amount) {
  return BigNumber.from(amount).mul("1000000000000000000").toString();
}

// sand price is in Sand unit (Sand has 18 decimals)
module.exports.starterPackPrices = [sandWei(120), sandWei(361), sandWei(1205), sandWei(4819)];
