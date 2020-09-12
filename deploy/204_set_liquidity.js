const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch");
const configPath = path.join(__dirname, "../data/kyberReserve/liquidity_settings.json");
const configParams = JSON.parse(fs.readFileSync(configPath, "utf8"));
const { BigNumber } = require("ethers");

let networkName;

let pricingAddress;
let tokenAddress;

let reserve;
let pricing;
let pricingAdmin;

let tokenPriceInEth;
let ethBalance;
let tokenBalance;
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




// task("setLiquidityParams", "(re-)sets the liquidity settings of an APR")
//   .addOptionalParam("r", "reserve address", "0x0")
//   .addOptionalParam("a", "automatically fetch price via CoinGecko. Default: true", true, types.boolean)
//   .setAction(async ({ r, a }) => {

module.exports = async ({ getChainId, getNamedAccounts, deployments, network }) => {
  const { deploy, execute, read } = deployments;
  networkName = await ethers.provider.getNetwork();
  if (networkName.id == 1) {
    networkName = "";
  } else {
    networkName = networkName.name + ".";
  }
  const reserveAddress = (await deployments.get("KyberReserve")).address;
  console.log(`reserve address = ${reserveAddress}`);
  // reserveAddress = (r != "0x0") ?
  //   r :
  //   configParams["reserve"];

  await instantiateContracts();
  // if (a) {
  //   await fetchTokenPrice();
  // }
  parseInput(configParams);
  console.log("Reading reserve balances...");
  await fetchParams();
  printParams();
  validateParams();
  await setLiquidityParams();
  async function instantiateContracts() {
    // reserve = await ethers.getContractAt("KyberReserve", reserveAddress);
    pricingAddress = await read("KyberReserve", "conversionRatesContract");
    console.log(`pricingAddress = ${pricingAddress}`);
    // pricingAddress = await reserve.conversionRatesContract();
    // pricing = await ethers.getContractAt("LiquidityConversionRates", pricingAddress);
    pricingAdmin = await read("LiquidityConversionRates", "admin");
    tokenAddress = await read("LiquidityConversionRates", "token");
    console.log(`pricingAdmin = ${pricingAdmin}`);
    console.log(`tokenAddress = ${tokenAddress}`);

    // pricingAdmin = await pricing.admin();
    // tokenAddress = await pricing.token();
  }

  async function fetchTokenPrice() {
    let priceRequest = await fetch(
      `https://api.coingecko.com/api/v3/simple/token_price/ethereum?contract_addresses=${tokenAddress}&vs_currencies=eth`
    );
    let result = Object.values(await priceRequest.json());
    tokenPriceInEth = result[0].eth;
    console.log(`token price via CoinGecko API: ${tokenPriceInEth}`);
  }

  function parseInput(jsonInput) {
    tokenPriceInEth = tokenPriceInEth ?
      tokenPriceInEth :
      jsonInput["tokenPriceInEth"];

    minAllowablePrice = jsonInput["minAllowablePrice"] ?
      jsonInput["minAllowablePrice"] :
      0.5;

    maxAllowablePrice = jsonInput["maxAllowablePrice"] ?
      jsonInput["maxAllowablePrice"] :
      2.0;

    maxTxBuyAmtEth = jsonInput["maxTxBuyAmtEth"] ?
      jsonInput["maxTxBuyAmtEth"] :
      10;

    maxTxSellAmtEth = jsonInput["maxTxSellAmtEth"] ?
      jsonInput["maxTxSellAmtEth"] :
      10;

    feePercent = jsonInput["feePercent"] ?
      jsonInput["feePercent"] :
      0.05;
  }

  async function fetchParams() {
    let tokenDecimals = await read("Sand", "decimals");
    console.log(`decimals = ${tokenDecimals}`);
    ethBalance = (await ethers.provider.getBalance(reserveAddress)) / 10 ** 18;
    console.log(`ethBalance = ${ethBalance}`);
    liqRate = Math.log(1 / minAllowablePrice) / ethBalance;
    try {
      const tokenWallet = await read("KyberReserve", "tokenWallet", tokenAddress);
      // tokenBalance = await token.balanceOf(tokenWallet) / 10 ** tokenDecimals;
      tokenBalance = (await read("Sand", "balanceOf", tokenWallet)) / 10 ** tokenDecimals;
    } catch (e) {
      tokenBalance = (await read("Sand", "balanceOf", reserveAddress)) / 10 ** tokenDecimals;
      // tokenBalance = await token.balanceOf(reserveAddress) / 10 ** tokenDecimals;
    }
    console.log(`tokenBalance = ${tokenBalance}`);
  }

  function validateParams() {
    const minSupportPrice = tokenPriceInEth / Math.exp(liqRate * ethBalance);
    const actualMinAllowablePrice = minSupportPrice / tokenPriceInEth;
    let actualMaxAllowablePrice = 0;

    if ((liqRate * tokenPriceInEth * tokenBalance) < 1) {
      const maxSupportedPrice = tokenPriceInEth / (1 - liqRate * tokenPriceInEth * tokenBalance);
      actualMaxAllowablePrice = maxSupportedPrice / tokenPriceInEth;
    }

    if (actualMinAllowablePrice > minAllowablePrice) {
      console.error(`WARNING: actual minAllowablePrice ${actualMinAllowablePrice} > configured minAllowablePrice ${minAllowablePrice}`);
    }

    if (actualMaxAllowablePrice === 0) {
      console.error('WARNING: actual maxAllowablePrice is big and cannot be calculated. Consider reducing token amount in reserve to avoid this.');
    } else if (actualMaxAllowablePrice < maxAllowablePrice) {
      console.error(`WARNING: actual maxAllowablePrice ${actualMaxAllowablePrice.toFixed(3)} > configured maxAllowablePrice ${maxAllowablePrice}`);
    }

    const expectedInitialPrice = tokenPriceInEth * minAllowablePrice * Math.exp(liqRate * ethBalance);
    const diff_percent = (expectedInitialPrice === tokenPriceInEth) ? 0 : (Math.abs(expectedInitialPrice - tokenPriceInEth) / expectedInitialPrice) * 100.0;
    if (diff_percent > 1.0) {
      console.error(`WARNING: expectedInitialPrice ${expectedInitialPrice.toFixed(5)} differs from initial_price ${tokenPriceInEth.toFixed(5)} by ${diff_percent}%`);
    }
  }

  function printParams() {
    console.log(`\n`);
    console.log("#######################");
    console.log("### COMPUTED PARAMS ###");
    console.log("#######################");
    console.log(`  "liquidity\_rate": ${liqRate},`);
    console.log(`  "ether reserve balance": ${ethBalance},`);
    console.log(`  "token reserve balance": ${tokenBalance},`);
    console.log(`  "token price in ETH": ${tokenPriceInEth},`);
    console.log(`  "min allowable price": ${minAllowablePrice},`);
    console.log(`  "max allowable price": ${maxAllowablePrice},`);
    console.log(`  "max tx buy amt (in ETH)": ${maxTxBuyAmtEth},`);
    console.log(`  "max tx sell amt (in ETH)": ${maxTxSellAmtEth},`);
    console.log(`  "fee percent": ${feePercent},`);

    console.log(`\n`);

    console.log("########################");
    console.log("### LIQUIDITY PARAMS ###");
    console.log("########################");

    const maxSupportPrice = maxAllowablePrice * tokenPriceInEth;
    const minSupportPrice = minAllowablePrice * tokenPriceInEth;

    _rInFp = liqRate * 2 ** formulaPrecision;
    _rInFp = Math.floor(_rInFp);
    console.log(`\_rInFp: ${_rInFp}`);

    _pMinInFp = minSupportPrice * 2 ** formulaPrecision;
    _pMinInFp = Math.floor(_pMinInFp);
    console.log(`\_pMinInFp: ${_pMinInFp}`);

    _numFpBits = formulaPrecision;
    console.log(`\_numFpBits: ${_numFpBits}`);

    _maxCapBuyInWei = maxTxBuyAmtEth * 10 ** 18;
    console.log(`\_maxCapBuyInWei: ${_maxCapBuyInWei}`);

    _maxCapSellInWei = maxTxSellAmtEth * 10 ** 18;
    console.log(`\_maxCapSellInWei: ${_maxCapSellInWei}`);

    _feeInBps = feePercent * 100;
    console.log(`\_feeInBps: ${_feeInBps}`);

    _maxTokenToEthRateInPrecision = maxSupportPrice * 10 ** 18;
    console.log(`\_maxTokenToEthRateInPrecision: ${_maxTokenToEthRateInPrecision}`);

    _minTokenToEthRateInPrecision = minSupportPrice * 10 ** 18;
    console.log(`\_minTokenToEthRateInPrecision: ${_minTokenToEthRateInPrecision}`);

    console.log(`\n`);
    console.log(
      `Call setLiquidityParams with above LIQUIDITY PARAMS of ${pricingAddress} using wallet ${pricingAdmin}: `
    );
    console.log(`https://${networkName}etherscan.io/address/${pricingAddress}#writeContract`);
    console.log(`\n`);
  }

  async function setLiquidityParams() {
    await execute(
      "LiquidityConversionRates",
      { from: pricingAdmin, skipUnknownSigner: true },
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
module.exports.tags = ["SetLiquidity"];

// module.exports = async ({ getChainId, getNamedAccounts, deployments, network }) => {
// };
