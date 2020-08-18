const {guard} = require("../lib");

module.exports = async ({getNamedAccounts, deployments}) => {
  const {deploy} = deployments;
  const {deployer} = await getNamedAccounts();

  await deploy("Forwarder", {
    from: deployer,
    args: [],
    log: true,
  });
};

module.exports.skip = guard(["1", "4", "314159"]);
module.exports.tags = ["Forwarder"];
