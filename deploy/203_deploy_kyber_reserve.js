const {guard} = require("../lib");
const configParams = require("../data/kyberReserve/apr_input");

module.exports = async ({getChainId, getNamedAccounts, deployments}) => {
  const chainId = await getChainId();
  if (chainId === "31337") {
    return;
  }

  const {deploy, log} = deployments;
  const {deployer} = await getNamedAccounts();
  const networkAddress = configParams[chainId].kyberNetworkAddress;
  const sandContract = await deployments.get("Sand");
  log("deploying LiquidityConversionRates...");

  let lcr = await deploy("LiquidityConversionRates", {
    from: deployer,
    args: [deployer, sandContract.address],
    log: true,
  });
  log("deploying KyberReserve...");
  await deploy("KyberReserve", {
    from: deployer,
    args: [networkAddress, lcr.address, deployer],
    log: true,
  });
};
module.exports.skip = guard(["1", "4", "314159"]); // TODO , 'KyberReserve');
module.exports.tags = ["KyberReserve"];
