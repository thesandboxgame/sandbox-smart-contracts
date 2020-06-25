const {guard} = require("../lib");
module.exports = async ({getNamedAccounts, deployments}) => {
  const {call, sendTxAndWait, log} = deployments;

  const {catalystRegistryAdmin} = await getNamedAccounts();
  const currentAdmin = await call("CatalystRegistry", "getAdmin");
  if (currentAdmin.toLowerCase() !== catalystRegistryAdmin.toLowerCase()) {
    log("setting CatalystRegistry Admin");
    await sendTxAndWait(
      {from: currentAdmin, gas: 1000000, skipError: true},
      "CatalystRegistry",
      "changeAdmin",
      catalystRegistryAdmin
    );
  }
};
module.exports.skip = guard(["1", "4", "314159"]); // TODO remove
