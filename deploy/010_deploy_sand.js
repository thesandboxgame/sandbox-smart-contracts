const {guard} = require("../lib");

module.exports = async ({getNamedAccounts, deployments}) => {
  const {deploy} = deployments;

  const {sandBeneficiary, deployer} = await getNamedAccounts();

  await deploy("Sand", {
    from: deployer,
    args: [deployer, deployer, sandBeneficiary],
    log: true,
  });
};
module.exports.skip = guard(["1", "4", "314159"], "Sand");
module.exports.tags = ["Sand"];
