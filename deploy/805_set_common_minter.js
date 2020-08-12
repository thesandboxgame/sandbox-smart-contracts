const {guard} = require("../lib");

module.exports = async ({deployments, getChainId}) => {
  const {read, execute, log} = deployments;
  const chainId = await getChainId();

  const bouncer = await deployments.get("CommonMinter");

  const isBouncer = await read("Asset", "isBouncer", bouncer.address);
  if (chainId == "1") {
    if (isBouncer) {
      log("unsetting CommonMinter as bouncer");
      const currentBouncerAdmin = await read("Asset", "getBouncerAdmin");
      await execute(
        "Asset",
        {from: currentBouncerAdmin, skipUnknownSigner: true},
        "setBouncer",
        bouncer.address,
        false
      );
    }
  } else {
    if (!isBouncer) {
      log("setting CommonMinter as bouncer");
      const currentBouncerAdmin = await read("Asset", "getBouncerAdmin");
      await execute("Asset", {from: currentBouncerAdmin, skipUnknownSigner: true}, "setBouncer", bouncer.address, true);
    }
  }

  const isSuperOperator = await read("Sand", "isSuperOperator", bouncer.address);
  if (!isSuperOperator) {
    log("setting NativeMetaTransactionProcessor as super operator");
    const currentSandAdmin = await read("Sand", "getAdmin");
    await execute("Sand", {from: currentSandAdmin, skipUnknownSigner: true}, "setSuperOperator", bouncer.address, true);
  }
};
module.exports.skip = guard(["1"]); // TODO to enable common minter // TODO set a fee, not zero
module.exports.dependencies = ["Sand", "CommonMinter", "Asset"];
