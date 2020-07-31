const ethers = require("ethers");
const {BigNumber} = ethers;
function sandWei(amount) {
  return BigNumber.from(amount).mul("1000000000000000000").toString();
}

// sand price is in Sand unit (Sand has 18 decimals)
module.exports.starterPackPrices = [sandWei(69), sandWei(208), sandWei(694), sandWei(2778)];
