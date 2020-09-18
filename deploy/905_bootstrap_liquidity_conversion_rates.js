const configParams = require("../data/kyberReserve/apr_input");

module.exports = async ({getChainId, getNamedAccounts, deployments}) => {
  const chainId = await getChainId();
  if (chainId === "31337") {
    return;
  }
  let pricingOperator;

  const {execute} = deployments;
  const {deployer} = await getNamedAccounts();
  const kyberReserve = await deployments.get("KyberReserve");

  parseInput(configParams[chainId]);
  deployerAddress = deployer;
  // set reserve addressF
  await execute(
    "LiquidityConversionRates",
    {from: deployer, skipUnknownSigner: true},
    "setReserveAddress",
    kyberReserve.address
  );

  // transfer admin rights to pricing operator
  await execute(
    "LiquidityConversionRates",
    {from: deployer, skipUnknownSigner: true},
    "transferAdminQuickly",
    pricingOperator
  );

  function parseInput(jsonInput) {
    whitelistedAddresses = jsonInput["whitelistedAddresses"];
    reserveAdmin = jsonInput["reserveAdmin"];
    pricingOperator = jsonInput["pricingOperator"];
    reserveOperators = jsonInput["reserveOperators"];
    weiDepositAmount = jsonInput["weiDepositAmount"];
    sandDepositAmount = jsonInput["sandDepositAmount"];
  }
};
module.exports.dependencies = ["KyberReserve"];
