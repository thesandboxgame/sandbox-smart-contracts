module.exports = async ({getNamedAccounts, deployments}) => {
  const {deployer, feeDistributionRecipients} = await getNamedAccounts();
  const {deploy} = deployments;

  await deploy("FeeDistributor", {
    from: deployer,
    gas: 3000000,
    log: true,
    args: [feeDistributionRecipients, [10000]],
  });
};
module.exports.tags = ["FeeDistributor"];
