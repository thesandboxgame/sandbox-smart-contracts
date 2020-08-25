const {BigNumber} = require("ethers");

const privateKey = "0x4242424242424242424242424242424242424242424242424242424242424242";

function priceCalculator(starterPackPrices, catalystQuantities, gemPrice, gemQuantities) {
  let totalExpectedPrice = BigNumber.from(0);
  for (i = 0; i < starterPackPrices.length; i++) {
    let price = BigNumber.from(starterPackPrices[i]);
    let quantity = BigNumber.from(catalystQuantities[i]);
    let total = quantity.mul(price);
    totalExpectedPrice = totalExpectedPrice.add(total);
  }
  let totalGems = BigNumber.from(0);
  for (i = 0; i < gemQuantities.length; i++) {
    totalGems = totalGems.add(gemQuantities[i]);
  }
  expectedGemsPrice = BigNumber.from(gemPrice).mul(totalGems);
  totalExpectedPrice = totalExpectedPrice.add(expectedGemsPrice);
  return totalExpectedPrice;
}

module.exports = {
  privateKey,
  priceCalculator,
};
