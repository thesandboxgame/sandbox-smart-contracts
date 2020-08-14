module.exports = async ({deployments}) => {
  const {read, execute, log} = deployments;

  const genesisBouncer = await deployments.get("GenesisBouncer");

  const isBouncer = await read("Asset", "isBouncer", genesisBouncer.address);
  if (!isBouncer) {
    log("setting genesis bouncer as Asset bouncer");
    const currentBouncerAdmin = await read("Asset", "getBouncerAdmin");
    await execute(
      "Asset",
      {from: currentBouncerAdmin, skipUnknownSigner: true},
      "setBouncer",
      genesisBouncer.address,
      true
    );
  }
};
module.exports.dependencies = ["Sand", "NativeMetaTransactionProcessor"];
