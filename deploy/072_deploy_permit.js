const {guard} = require("../lib");

module.exports = async ({getNamedAccounts, deployments}) => {
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();

  const sandContract = await deployments.get("Sand");

  await deploy("Permit", {
    from: deployer,
    args: [sandContract.address],
    log: true,
  });
};

module.exports.skip = guard(["1", "4", "314159"], "Permit");
module.exports.tags = ["Permit"];
module.exports.dependencies = ["Sand"];
