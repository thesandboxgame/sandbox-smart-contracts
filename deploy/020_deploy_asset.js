const {guard} = require("../lib");

module.exports = async ({getNamedAccounts, deployments}) => {
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();

  const sandContract = await deployments.get("Sand");

  await deploy("Asset", {
    from: deployer,
    args: [
      sandContract.address,
      deployer, // is set to assetAdmin in a later stage
      deployer, // is set to assetBouncerAdmin in a later stage]}, // , gasPrice: '10000000000'},
    ],
    log: true,
  });
};
module.exports.skip = guard(["1", "4", "314159"], "Asset");
module.exports.tags = ["Asset"];
module.exports.dependencies = ["Sand"];
