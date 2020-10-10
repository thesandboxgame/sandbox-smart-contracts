const {guard} = require("../lib");

module.exports = async ({getNamedAccounts, deployments}) => {
  const namedAccounts = await getNamedAccounts();
  const {deployer} = namedAccounts;
  const {deploy} = deployments;
  const deploymentData = require("../data/feeDistribution/deploymentData.js");

  for (const key of Object.keys(deploymentData)) {
    let {percentages, recipients, name} = deploymentData[key];
    let feeDistributionRecipients = [];
    for (const rName of recipients) {
      const recipient = namedAccounts[rName];
      if (!recipient) {
        const deployedContract = await deployments.get(rName);
        feeDistributionRecipients.push(deployedContract.address);
      } else {
        feeDistributionRecipients.push(recipient);
      }
    }
    await deploy(name, {
      contract: "FeeDistributor",
      from: deployer,
      gas: 3000000,
      log: true,
      args: [feeDistributionRecipients, percentages],
    });
  }
};
module.exports.tags = ["FeeDistributors"];
module.exports.skip = guard(["1", "4"]);
