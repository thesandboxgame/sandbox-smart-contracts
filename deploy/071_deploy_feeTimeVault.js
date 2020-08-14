module.exports = async ({getNamedAccounts, deployments}) => {
  const {deployer} = await getNamedAccounts();
  const {deploy} = deployments;
  const {lockPeriod} = require("../data/feeTimeVault/deploymentData.js");
  await deploy("FeeTimeVault", {
    from: deployer,
    gas: 3000000,
    log: true,
    args: [lockPeriod], //TODO: add sand address,
  });
};
module.exports.tags = ["FeeTimeVault"];
module.exports.skip = guard(["1"], "FeeTimeVault");
