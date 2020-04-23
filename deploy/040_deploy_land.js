const {guard} = require("../lib");

module.exports = async ({getNamedAccounts, deployments}) => {
  const {deployIfDifferent, log} = deployments;

  const {deployer} = await getNamedAccounts();

  const sandContract = await deployments.getOrNull("Sand");
  if (!sandContract) {
    throw new Error("no SAND contract deployed");
  }
  const deployResult = await deployIfDifferent(
    ["data"],
    "Land",
    {from: deployer, gas: 6000000},
    "Land",
    sandContract.address,
    deployer // set_land_admin set it later to correct address
  );

  if (deployResult.newlyDeployed) {
    log(" - Land deployed at : " + deployResult.address + " for gas : " + deployResult.receipt.gasUsed);
  } else {
    log("reusing Land at " + deployResult.address);
  }
};
module.exports.skip = guard(["1", "4", "314159"], "Land");
module.exports.tags = ["Land"];
module.exports.dependencies = ["Sand"];
