const {guard} = require("../lib");

module.exports = async ({getNamedAccounts, deployments}) => {
  const {deployer} = await getNamedAccounts();
  const {deploy} = deployments;
  const deploymentData = require("../data/feeDistribution/deploymentData.js");

  for (key of Object.keys(deploymentData)) {
    let {percentages, recipients} = deploymentData[key];
    let feeDistributionRecipients = [];
    for (contractName of recipients) {
      let recipient = await deployments.getOrNull(contractName);
      if (!recipient) {
        throw new Error(`${contractName} was not deployed`);
      } else {
        feeDistributionRecipients.push(recipient.address);
      }
    }
    await deploy("FeeDistributor", {
      from: deployer,
      gas: 3000000,
      log: true,
      args: [feeDistributionRecipients, percentages],
    });
  }
};
module.exports.tags = ["FeeDistributor"];
module.exports.skip = guard(["1"], "FeeDistributor");
