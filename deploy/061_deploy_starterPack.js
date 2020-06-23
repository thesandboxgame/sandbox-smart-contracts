const {guard} = require("../lib");

module.exports = async ({getNamedAccounts, deployments}) => {
  const {deployIfDifferent, log} = deployments;

  const {sandBeneficiary, deployer} = await getNamedAccounts();

  const deployResult = await deployIfDifferent(
    ["data"],
    "Sand",
    {from: deployer, gas: 3000000},
    "Sand",
    deployer,
    deployer,
    sandBeneficiary
  );

  if (deployResult.newlyDeployed) {
    log(" - Sand deployed at : " + deployResult.address + " for gas : " + deployResult.receipt.gasUsed);
  } else {
    log("reusing Sand at " + deployResult.address);
  }
};
module.exports.skip = guard(["1", "4", "314159"], "Sand");
module.exports.tags = ["Sand"];
