const {guard} = require("../lib");

module.exports = async ({getNamedAccounts, deployments}) => {
  const {deployIfDifferent, log} = deployments;

  const {deployer} = await getNamedAccounts();

  const deployResult = await deployIfDifferent(["data"], "StarterPack", {from: deployer, gas: 3000000}, deployer);

  if (deployResult.newlyDeployed) {
    log(" - StarterPack deployed at : " + deployResult.address + " for gas : " + deployResult.receipt.gasUsed);
  } else {
    log("reusing StarterPack at " + deployResult.address);
  }
};

module.exports.skip = guard(["1", "4", "314159"], "StarterPack");
module.exports.tags = ["StarterPack"];
