module.exports = async ({deployments}) => {
  const {call, sendTxAndWait, log} = deployments;

  const asset = await deployments.getOrNull("Asset");
  if (!asset) {
    throw new Error("no Asset contract deployed");
  }
  const genesisBouncer = await deployments.getOrNull("GenesisBouncer");
  if (!genesisBouncer) {
    throw new Error("no GenesisBouncer contract deployed");
  }

  const isBouncer = await call("Asset", "isBouncer", genesisBouncer.address);
  if (!isBouncer) {
    log("setting genesis bouncer as Asset bouncer");
    const currentBouncerAdmin = await call("Asset", "getBouncerAdmin");
    await sendTxAndWait(
      {from: currentBouncerAdmin, gas: 1000000, skipError: true},
      "Asset",
      "setBouncer",
      genesisBouncer.address,
      true
    );
  }
};
