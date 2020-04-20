const {guard} = require("../lib");

module.exports = async ({deployments}) => {
  const {call, sendTxAndWait, log} = deployments;

  const sand = await deployments.getOrNull("Sand");
  if (!sand) {
    throw new Error("no Sand contract deployed");
  }
  const asset = await deployments.getOrNull("Asset");
  if (!asset) {
    throw new Error("no Asset contract deployed");
  }
  const bouncer = await deployments.getOrNull("CommonMinter");
  if (!bouncer) {
    throw new Error("no CommonMinter contract deployed");
  }

  const isBouncer = await call("Asset", "isBouncer", bouncer.address);
  if (!isBouncer) {
    log("setting CommonMinter as bouncer");
    const currentBouncerAdmin = await call("Asset", "getBouncerAdmin");
    await sendTxAndWait(
      {from: currentBouncerAdmin, gas: 1000000, skipError: true},
      "Asset",
      "setBouncer",
      bouncer.address,
      true
    );
  }

  const isSuperOperator = await call("Sand", "isSuperOperator", bouncer.address);
  if (!isSuperOperator) {
    log("setting NativeMetaTransactionProcessor as super operator");
    const currentSandAdmin = await call("Sand", "getAdmin");
    await sendTxAndWait(
      {from: currentSandAdmin, gas: 100000, skipError: true},
      "Sand",
      "setSuperOperator",
      bouncer.address,
      true
    );
  }
};
module.exports.skip = guard(["1"]); // TODO to enable common minter
