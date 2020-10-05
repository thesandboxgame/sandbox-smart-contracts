module.exports = async ({getNamedAccounts, deployments}) => {
  const {read, execute, log} = deployments;

  const {catalystRegistryAdmin} = await getNamedAccounts();
  const currentAdmin = await read("CatalystRegistry", "getAdmin");
  if (currentAdmin.toLowerCase() !== catalystRegistryAdmin.toLowerCase()) {
    log("setting CatalystRegistry Admin");
    await execute(
      "CatalystRegistry",
      {from: currentAdmin, skipUnknownSigner: true},
      "changeAdmin",
      catalystRegistryAdmin
    );
  }
};
module.exports.dependencies = ["CatalystRegistry"];
