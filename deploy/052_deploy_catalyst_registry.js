const {guard} = require("../lib");

module.exports = async ({getNamedAccounts, deployments}) => {
  const {deploy} = deployments;
  const {deployer} = await getNamedAccounts();

  const catalyst = await deployments.get("Catalyst");

  await deploy("CatalystRegistry", {
    from: deployer,
    args: [
      catalyst.address,
      deployer, // is set to catalystRegistryAdmin later (see 810_set_catalystRegistry_admin.js)
    ],
    log: true,
  });
};
module.exports.skip = guard(["1", "314159", "4"], "CatalystRegistry");
module.exports.tags = ["CatalystRegistry"];
module.exports.dependencies = ["Catalyst"];
