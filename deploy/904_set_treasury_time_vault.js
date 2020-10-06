module.exports = async ({deployments}) => {
  const {read, execute} = deployments;

  const salesDistribution = await deployments.get("SalesDistribution");

  const feeTimeVaultOwner = await read("TreasuryTimeVault", "owner");
  await execute(
    "TreasuryTimeVault",
    {from: feeTimeVaultOwner, skipUnknownSigner: true},
    "setFeeDistributor",
    salesDistribution.address
  );
};
