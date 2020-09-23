const {guard} = require("../lib");
module.exports = async ({getNamedAccounts, deployments}) => {
  const {deploy} = deployments;
  const {deployer} = await getNamedAccounts();

  await deploy("SANDRewardPool", {
    from: deployer,
    log: true,
  });
};
module.exports.skip = guard(["1", "4", "314159"], "SANDRewardPool");
module.exports.tags = ["SANDRewardPool"];
