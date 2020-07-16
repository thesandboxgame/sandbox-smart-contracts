const ethers = require("ethers");
const {BigNumber} = ethers;

// sand price is in Sand unit (Sand has 18 decimals)
module.exports.starterPackPrices = [
  BigNumber.from(100),
  BigNumber.from(200),
  BigNumber.from(300),
  BigNumber.from(1000),
];
