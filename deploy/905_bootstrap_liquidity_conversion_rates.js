const {guard} = require("../lib");
const configParams = require("../data/kyberReserve/apr_input");

module.exports = async ({getChainId, getNamedAccounts, deployments}) => {
  const chainId = await getChainId();
  if (chainId === "31337") {
    return;
  }
  let pricingOperator;

  const {execute, read} = deployments;
  const {deployer} = await getNamedAccounts();
  const kyberReserve = await deployments.get("KyberReserve");

  parseInput(configParams[chainId]);
  // set reserve address
  let reserveContract = await read("LiquidityConversionRates", "reserveContract");
  if (reserveContract.toLowerCase() !== kyberReserve.address.toLowerCase()) {
    log(`setReserveAddress, address = ${kyberReserve.address}`);
    await execute("LiquidityConversionRates", {from: deployer}, "setReserveAddress", kyberReserve.address);
  }

  // transfer admin rights to pricing operator
  let admin = await read("LiquidityConversionRates", "admin");
  if (admin.toLowerCase() !== pricingOperator.toLowerCase()) {
    log(`transferAdminQuickly, admin = ${pricingOperator}`);
    await execute("LiquidityConversionRates", {from: deployer}, "transferAdminQuickly", pricingOperator);
  }
  function parseInput(jsonInput) {
    pricingOperator = jsonInput["pricingOperator"];
  }
};
// module.exports.skip = guard(["1", "4", "314159"]);
module.exports.dependencies = ["KyberReserve"];
