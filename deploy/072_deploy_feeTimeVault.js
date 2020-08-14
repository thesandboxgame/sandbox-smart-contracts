const {guard} = require("../lib");

module.exports = async ({getNamedAccounts, deployments}) => {
  const {deployer} = await getNamedAccounts();
  const {deploy} = deployments;
  const {lockPeriod} = require("../data/feeTimeVault/deploymentData.js");

  const sandContract = await deployments.getOrNull("Sand");
  if (!sandContract) {
    throw new Error("no SAND contract deployed");
  }
  await deploy("FeeTimeVault", {
    from: deployer,
    gas: 3000000,
    log: true,
    args: [lockPeriod, sandContract.address, deployer],
  });
};
module.exports.tags = ["FeeTimeVault"];
module.exports.skip = guard(["1"], "FeeTimeVault");
