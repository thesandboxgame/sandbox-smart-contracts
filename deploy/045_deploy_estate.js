const {guard} = require("../lib");

module.exports = async ({getNamedAccounts, deployments}) => {
  const {deployIfDifferent, log} = deployments;

  const {deployer, estateAdmin} = await getNamedAccounts();

  const sandContract = await deployments.getOrNull("Sand");
  const landContract = await deployments.getOrNull("Land");

  if (!sandContract) {
    throw new Error("no SAND contract deployed");
  }

  if (!landContract) {
    throw new Error("no LAND contract deployed");
  }

  const deployResult = await deployIfDifferent(
    ["data"],
    "Estate",
    {from: deployer, gas: 6000000},
    "Estate",
    sandContract.address,
    estateAdmin,
    landContract.address
  );
  if (deployResult.newlyDeployed) {
    log(" - Estate deployed at : " + deployResult.address + " for gas : " + deployResult.receipt.gasUsed);
  } else {
    log("reusing Estate at " + deployResult.address);
  }
};
module.exports.skip = guard(["1", "4", "314159"]); // TODO , 'Estate');
module.exports.tags = ["Estate"];
module.exports.dependencies = ["Sand", "Land"];
