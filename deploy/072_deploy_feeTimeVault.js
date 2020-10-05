const {guard} = require("../lib");

module.exports = async ({getNamedAccounts, deployments}) => {
  const {deployer} = await getNamedAccounts();
  const {deploy} = deployments;
  const {lockPeriod} = require("../data/feeTimeVault/deploymentData.js");

  const sandContract = await deployments.get("Sand");

  await deploy("FeeTimeVault", {
    from: deployer,
    gas: 3000000,
    log: true,
    args: [lockPeriod, sandContract.address, deployer],
  });
};
module.exports.tags = ["FeeTimeVault"];
module.exports.skip = guard(["1"], "FeeTimeVault");
