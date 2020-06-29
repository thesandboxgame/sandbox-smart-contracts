const {guard} = require("../lib");

module.exports = async ({getNamedAccounts, deployments}) => {
  const {deployIfDifferent, log} = deployments;

  const {deployer, catalystAdmin} = await getNamedAccounts();

  const deployResult = await deployIfDifferent(
    ["data"],
    "StarterPack",
    {from: deployer, gas: 3000000},
    "StarterPack",
    catalystAdmin
  );

  if (deployResult.newlyDeployed) {
    log(" - StarterPack deployed at : " + deployResult.address + " for gas : " + deployResult.receipt.gasUsed);
  } else {
    log("reusing StarterPack at " + deployResult.address);
  }
};

module.exports.skip = guard(["1", "4", "314159"], "StarterPack");
