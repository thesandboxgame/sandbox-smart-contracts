const {BigNumber} = require("@ethersproject/bignumber");

function sandWei(v) {
  return BigNumber.from(v).mul("1000000000000000000").toString();
}

// TODO Mainnet prices based on 0.036367$ per SAND
module.exports = {
  "1x1": sandWei(1182),
  "3x3": sandWei(10147),
  "6x6": sandWei(38496),
  "12x12": sandWei(145407),
  "24x24": sandWei(547392),
  premium_1x1: sandWei(2750),
};
