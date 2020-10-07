const {guard} = require("../lib");

module.exports = async ({getNamedAccounts, deployments}) => {
  const {deploy} = deployments;

  const {deployer, gameTokenAdmin} = await getNamedAccounts();
  const metaTransactionContract = await deployments.get("NativeMetaTransactionProcessor");

  await deploy("GameToken", {
    from: deployer,
    args: [metaTransactionContract.address, gameTokenAdmin],
    log: true,
  });
};

module.exports.skip = guard(["1", "4", "314159"]); // @todo "GameToken"
module.exports.tags = ["GameToken"];
module.exports.dependencies = ["NativeMetaTransactionProcessor"];
