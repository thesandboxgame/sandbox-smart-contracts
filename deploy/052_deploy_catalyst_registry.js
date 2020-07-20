const {guard} = require("../lib");

module.exports = async ({getNamedAccounts, deployments}) => {
  const {deploy} = deployments;
  const {deployer} = await getNamedAccounts();

  const catalyst = await deployments.get("Catalyst");

  await deploy("CatalystRegistry", {
    from: deployer,
    args: [
      catalyst.address,
      deployer, // is to to catalystRegistryAdmin later
    ],
    log: true,
  });
};
module.exports.skip = guard(["1", "314159"]); // TODO enable for mainnet
