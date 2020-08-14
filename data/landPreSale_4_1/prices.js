const {BigNumber} = require("@ethersproject/bignumber");

function sandWei(v) {
  return BigNumber.from(v).mul("1000000000000000000").toString();
}
module.exports = {
  "1x1": sandWei(3000),
  "3x3": sandWei(25650),
  "6x6": sandWei(97200),
  "12x12": sandWei(367200),
  "24x24": sandWei(1382400),
  premium_1x1: sandWei(6950),
};
