const {guard} = require("../lib");

module.exports = async ({getNamedAccounts, deployments}) => {
  const {deploy} = deployments;

  const {deployer, commonMinterAdmin, mintingFeeCollector} = await getNamedAccounts();

  const asset = await deployments.get("Asset");
  const sand = await deployments.get("Sand");

  await deploy("CommonMinter", {
    from: deployer,
    args: [
      asset.address,
      sand.address,
      "0", // TODO "1000000000000000000",
      commonMinterAdmin,
      mintingFeeCollector,
    ],
    log: true,
  });
};
module.exports.skip = guard(["1", "4", "314159"], "CommonMinter");
module.exports.tags = ["CommonMinter"];
module.exports.dependencies = ["Asset", "Sand"];
