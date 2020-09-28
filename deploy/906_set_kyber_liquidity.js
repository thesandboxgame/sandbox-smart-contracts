const {guard} = require("../lib");
const {BigNumber} = require("ethers");
const configParams = require("../data/kyberReserve/liquidity_settings");

let tokenAddress;

let pricingAdmin;

let tokenPriceInEth;
let ethBalance;
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
    tokenAddress = await read("LiquidityConversionRates", "token");
  }

  function parseInput(jsonInput) {
    tokenPriceInEth = tokenPriceInEth ? tokenPriceInEth : jsonInput["tokenPriceInEth"];

    minAllowablePrice = jsonInput["minAllowablePrice"] ? jsonInput["minAllowablePrice"] : 0.5;

    maxAllowablePrice = jsonInput["maxAllowablePrice"] ? jsonInput["maxAllowablePrice"] : 2.0;

    maxTxBuyAmtEth = jsonInput["maxTxBuyAmtEth"] ? jsonInput["maxTxBuyAmtEth"] : 10;

    maxTxSellAmtEth = jsonInput["maxTxSellAmtEth"] ? jsonInput["maxTxSellAmtEth"] : 10;

    feePercent = jsonInput["feePercent"] ? jsonInput["feePercent"] : 0.05;
  }

  async function fetchParams() {
    let tokenDecimals = await read("Sand", "decimals");
    ethBalance = (await ethers.provider.getBalance(reserveAddress)) / 10 ** 18;
    liqRate = Math.log(1 / minAllowablePrice) / ethBalance;
    try {
      const tokenWallet = await read("KyberReserve", "tokenWallet", tokenAddress);
      tokenBalance = (await read("Sand", "balanceOf", tokenWallet)) / 10 ** tokenDecimals;
    } catch (e) {
      tokenBalance = (await read("Sand", "balanceOf", reserveAddress)) / 10 ** tokenDecimals;
    }
  }

  function calculateParams() {
    const maxSupportPrice = maxAllowablePrice * tokenPriceInEth;
    const minSupportPrice = minAllowablePrice * tokenPriceInEth;
    _rInFp = liqRate * 2 ** formulaPrecision;
    _rInFp = Math.floor(_rInFp);
    _pMinInFp = minSupportPrice * 2 ** formulaPrecision;
    _pMinInFp = Math.floor(_pMinInFp);
    _numFpBits = formulaPrecision;
    _maxCapBuyInWei = maxTxBuyAmtEth * 10 ** 18;
    _maxCapSellInWei = maxTxSellAmtEth * 10 ** 18;
    _feeInBps = feePercent * 100;
    _maxTokenToEthRateInPrecision = maxSupportPrice * 10 ** 18;
    _minTokenToEthRateInPrecision = minSupportPrice * 10 ** 18;
  }

  async function setLiquidityParams() {
    await execute(
      "LiquidityConversionRates",
      {from: pricingAdmin, skipUnknownSigner: true},
      "setLiquidityParams",
      BigNumber.from(_rInFp.toString()),
      BigNumber.from(_pMinInFp.toString()),
      BigNumber.from(_numFpBits.toString()),
      BigNumber.from(_maxCapBuyInWei.toString()),
      BigNumber.from(_maxCapSellInWei.toString()),
      BigNumber.from(_feeInBps.toString()),
      BigNumber.from(_maxTokenToEthRateInPrecision.toString()),
      BigNumber.from(_minTokenToEthRateInPrecision.toString())
    );
  }
};
// module.exports.skip = guard(["1", "4", "314159"]);
module.exports.dependencies = ["KyberReserve"];
