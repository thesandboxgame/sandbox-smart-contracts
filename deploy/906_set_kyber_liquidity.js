const {guard} = require("../lib");
const {BigNumber} = require("ethers");
const configParams = require("../data/kyberReserve/liquidity_settings");

let pricingAdmin;

let tokenPriceInWei;
let liqRate;
let minAllowablePrice;
let maxAllowablePrice;
let maxTxBuyAmtEth;
let maxTxSellAmtEth;
let feePercent;
const formulaPrecision = 40;
let _rInFp;
let _pMinInFp;
let _numFpBits;
let _maxCapBuyInWei;
let _maxCapSellInWei;
let _feeInBps;
let _maxTokenToEthRateInPrecision;
let _minTokenToEthRateInPrecision;

module.exports = async ({getChainId, deployments}) => {
  const chainId = await getChainId();
  if (chainId === "31337") {
    return;
  }
  const {execute, read} = deployments;
  const reserveAddress = (await deployments.get("KyberReserve")).address;
  await instantiateContracts();
  parseInput(configParams[chainId]);
  await fetchParams();
  calculateParams();
  await setLiquidityParams();
  async function instantiateContracts() {
    pricingAddress = await read("KyberReserve", "conversionRatesContract");
    pricingAdmin = await read("LiquidityConversionRates", "admin");
  }

  function parseInput(jsonInput) {
    tokenPriceInWei = tokenPriceInWei ? tokenPriceInWei : jsonInput["tokenPriceInWei"];

    minAllowablePrice = jsonInput["minAllowablePrice"] ? jsonInput["minAllowablePrice"] : 0.5;

    maxAllowablePrice = jsonInput["maxAllowablePrice"] ? jsonInput["maxAllowablePrice"] : 2.0;

    maxTxBuyAmtEth = jsonInput["maxTxBuyAmtEth"] ? jsonInput["maxTxBuyAmtEth"] : 10;

    maxTxSellAmtEth = jsonInput["maxTxSellAmtEth"] ? jsonInput["maxTxSellAmtEth"] : 10;

    feePercent = jsonInput["feePercent"] ? jsonInput["feePercent"] : 0.05;
  }

  const weiInETH = BigNumber.from("1000000000000000000");

  async function fetchParams() {
    const weiBalance = await ethers.provider.getBalance(reserveAddress);
    const ethBalance = weiBalance.div(weiInETH);
    liqRate = BigNumber.from(Math.log(1 / minAllowablePrice)).div(ethBalance);
  }

  function calculateParams() {
    const maxSupportPrice = BigNumber.from(tokenPriceInWei).mul(maxAllowablePrice);
    const minSupportPrice = BigNumber.from(tokenPriceInWei)
      .mul(Math.floor(minAllowablePrice * 100))
      .div(100);
    _rInFp = liqRate.mul(BigNumber.from(2).pow(formulaPrecision));
    _pMinInFp = minSupportPrice.mul(BigNumber.from(2).pow(formulaPrecision));
    _numFpBits = BigNumber.from(formulaPrecision);
    _maxCapBuyInWei = BigNumber.from(maxTxBuyAmtEth).mul(weiInETH);
    _maxCapSellInWei = BigNumber.from(maxTxSellAmtEth).mul(weiInETH);
    _feeInBps = feePercent * 100;
    _maxTokenToEthRateInPrecision = maxSupportPrice.mul(weiInETH);
    _minTokenToEthRateInPrecision = minSupportPrice.mul(weiInETH);
  }

  console.log(
    _rInFp.toString(),
    _pMinInFp.toString(),
    _numFpBits.toString(),
    _maxCapBuyInWei.toString(),
    _maxCapSellInWei.toString(),
    _feeInBps.toString(),
    _maxTokenToEthRateInPrecision.toString(),
    _minTokenToEthRateInPrecision.toString()
  );

  // async function setLiquidityParams() {
  //   await execute(
  //     "LiquidityConversionRates",
  //     {from: pricingAdmin, skipUnknownSigner: true},
  //     "setLiquidityParams",
  //     _rInFp,
  //     _pMinInFp,
  //     _numFpBits,
  //     _maxCapBuyInWei,
  //     _maxCapSellInWei,
  //     _feeInBps,
  //     _maxTokenToEthRateInPrecision,
  //     _minTokenToEthRateInPrecision
  //   );
  // }
};
module.exports.skip = guard(["1", "4", "314159"]);
module.exports.dependencies = ["KyberReserve"];
