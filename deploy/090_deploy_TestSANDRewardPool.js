const {guard} = require("../lib");

module.exports = async ({getNamedAccounts, deployments}) => {
  const {deploy} = deployments;
  const {deployer} = await getNamedAccounts();

  // add createPair code to generate Rinkeby Uniswap SAND-ETH pair

  await deploy("TestSANDRewardPool", {
    from: deployer,
    args: [],
    log: true,
  });
};
module.exports.skip = guard(["1", "314159", "4"]); // TODO "TestSANDRewardPool"
module.exports.tags = ["TestSANDRewardPool"];
