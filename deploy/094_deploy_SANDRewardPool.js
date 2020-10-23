const {guard} = require("../lib");
module.exports = async ({getNamedAccounts, deployments}) => {
  const {deploy} = deployments;
  const {deployer} = await getNamedAccounts();

  await deploy("SANDRewardPool", {
    from: deployer,
    log: true,
  });
};
module.exports.skip = guard(["1", "4", "314159"]); // skip as deployed for phase 0 Liquidity Mining
module.exports.tags = ["SANDRewardPool"];
