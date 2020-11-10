const {guard} = require("../lib");

module.exports = async ({getNamedAccounts, deployments}) => {
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();

  const sand = await deployments.get("Sand");

  await deploy("NativeMetaTransactionProcessor", {from: deployer, args: [sand.address], log: true});
};
module.exports.skip = guard(["1", "4", "314159"], "NativeMetaTransactionProcessor");
module.exports.tags = ["NativeMetaTransactionProcessor"];
module.exports.dependencies = ["Sand"];
