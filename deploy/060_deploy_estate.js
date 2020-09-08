const {guard} = require("../lib");

module.exports = async ({getNamedAccounts, deployments}) => {
  const {deploy} = deployments;

  const {deployer, estateAdmin} = await getNamedAccounts();

  const sandContract = await deployments.get("Sand");
  const landContract = await deployments.get("Land");

  await deploy("Estate", {from: deployer, args: [sandContract.address, estateAdmin, landContract.address], log: true});
};
module.exports.skip = guard(["1", "4", "314159"]); // TODO , 'Estate');
module.exports.tags = ["Estate"];
module.exports.dependencies = ["Sand", "Land"];

