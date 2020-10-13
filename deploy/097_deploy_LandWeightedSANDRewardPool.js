const {guard} = require("../lib");
module.exports = async ({getNamedAccounts, deployments}) => {
  const {deploy} = deployments;
  const {deployer} = await getNamedAccounts();

  const stakeToken = await deployments.get("UNI_SAND_ETH");
  const land = await deployments.get("Land");
  const sand = await deployments.get("Sand");

  await deploy("LandWeightedSANDRewardPool", {
    from: deployer,
    log: true,
    args: [stakeToken.address, sand.address, land.address, "10000", "9000000"],
  });
};
module.exports.skip = guard(["1", "4", "314159"], "LandWeightedSANDRewardPool");
module.exports.tags = ["LandWeightedSANDRewardPool"];
