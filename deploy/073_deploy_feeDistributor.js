const {guard} = require("../lib");

module.exports = async ({getNamedAccounts, deployments}) => {
  const {deployer} = await getNamedAccounts();
  const {deploy} = deployments;
  const deploymentData = require("../data/feeDistribution/deploymentData.js");

  for (key of Object.keys(deploymentData)) {
    let {percentages, recipients} = deploymentData[key];
    let feeDistributionRecipients = [];
    for (contractName of recipients) {
      let recipient = await deployments.get(contractName);
      feeDistributionRecipients.push(recipient.address);
    }
    await deploy("FeeDistributor_" + key, {
      contract: "FeeDistributor",
      from: deployer,
      gas: 3000000,
      log: true,
      args: [feeDistributionRecipients, percentages],
    });
  }
  return true;
};
module.exports.tags = ["FeeDistributor"];
module.exports.skip = guard(["1", "4"]); // TODO
