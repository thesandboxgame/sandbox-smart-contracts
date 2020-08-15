module.exports = async ({deployments}) => {
  const {read, execute, log} = deployments;

  const feeDistributor = await deployments.get("FeeDistributor");

  log("setting fee distributor in fee time vault contract");
  const feeTimeVaultOwner = await read("FeeTimeVault", "owner");
  await execute(
    "FeeTimeVault",
    {from: feeTimeVaultOwner, skipUnknownSigner: true},
    "setFeeDistributor",
    feeDistributor.address
  );
};
