const {guard} = require("../lib");
module.exports = async ({deployments}) => {
  const {read, execute, log} = deployments;
  const estate = await deployments.get("Estate");

  const isSuperOperator = await read("Land", "isSuperOperator", estate.address);
  if (!isSuperOperator) {
    log("setting NativeMetaTransactionProcessor as super operator");
    const currentLandAdmin = await read("Land", "getAdmin");
    await execute("Land", {from: currentLandAdmin, skipUnknownSigner: true}, "setSuperOperator", estate.address, true);
  }
};
module.exports.skip = guard(["1", "4", "314159"]); // TODO remove
module.exports.dependencies = ["Land", "Estate"];
