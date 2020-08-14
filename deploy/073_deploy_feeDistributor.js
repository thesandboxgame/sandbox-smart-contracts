const {guard} = require("../lib");

module.exports = async ({getNamedAccounts, deployments}) => {
  const {deployer, feeDistributionRecipients} = await getNamedAccounts();
  const {deploy} = deployments;
  const percentages = require("../data/feeDistribution/percentages");

  await deploy("FeeDistributor", {
    from: deployer,
    gas: 3000000,
    log: true,
    args: [feeDistributionRecipients, percentages],
  });
};
module.exports.tags = ["FeeDistributor"];
module.exports.skip = guard(["1"], "FeeDistributor");
