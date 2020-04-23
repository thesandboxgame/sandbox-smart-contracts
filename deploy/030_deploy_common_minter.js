const {guard} = require("../lib");

module.exports = async ({getNamedAccounts, deployments}) => {
  const {deployIfDifferent, log} = deployments;

  const {deployer, commonMinterAdmin, mintingFeeCollector} = await getNamedAccounts();

  const asset = await deployments.getOrNull("Asset");
  if (!asset) {
    throw new Error("no Asset contract deployed");
  }
  const sand = await deployments.getOrNull("Sand");
  if (!sand) {
    throw new Error("no Sand contract deployed");
  }

  const deployResult = await deployIfDifferent(
    ["data"],
    "CommonMinter",
    {from: deployer, gas: 2000000},
    "CommonMinter",
    asset.address,
    sand.address,
    "1000000000000000000",
    commonMinterAdmin,
    mintingFeeCollector
  );

  if (deployResult.newlyDeployed) {
    log(" - CommonMinter deployed at : " + deployResult.address + " for gas : " + deployResult.receipt.gasUsed);
  } else {
    log("reusing CommonMinter at " + deployResult.address);
  }
};
module.exports.skip = guard(["1", "4", "314159"], "CommonMinter");
