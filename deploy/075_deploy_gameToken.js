const {guard} = require("../lib");

module.exports = async ({getNamedAccounts, deployments}) => {
  const {deploy} = deployments;

  const {deployer, gameTokenAdmin} = await getNamedAccounts();
  const metaTransactionContract = await deployments.get("NativeMetaTransactionProcessor");
  const assetContract = await deployments.get("Asset");

  await deploy("GameToken", {
    from: deployer,
    args: [metaTransactionContract.address, gameTokenAdmin, assetContract.address],
    log: true,
  });
};

module.exports.skip = guard(["1", "4", "314159"]); // @todo "GameToken"
module.exports.tags = ["GameToken"];
module.exports.dependencies = ["NativeMetaTransactionProcessor", "Asset"];
