module.exports = async ({deployments}) => {
  const {call, sendTxAndWait, log} = deployments;

  const feeTimeVault = await deployments.getOrNull("FeeTimeVault");
  if (!feeTimeVault) {
    throw new Error("no FeeTimeVault contract deployed");
  }

  const feeDistributor = await deployments.getOrNull("FeeDistributor");
  if (!feeDistributor) {
    throw new Error("no FeeDistributor contract deployed");
  }
  log("setting fee distributor in fee time vault contract");
  const feeTimeVaultOwner = await call("FeeTimeVault", "owner");
  await sendTxAndWait(
    {from: feeTimeVaultOwner, gas: 1000000, skipUnknownSigner: true},
    "FeeTimeVault",
    "setFeeDistributor",
    feeDistributor.address,
    true
  );
};
