const {guard} = require("../lib");
module.exports = async ({getNamedAccounts, deployments}) => {
  const {call, sendTxAndWait, log} = deployments;

  const {gemCoreAdmin} = await getNamedAccounts();
  const currentAdmin = await call("GemCore", "getAdmin");
  if (currentAdmin.toLowerCase() !== gemCoreAdmin.toLowerCase()) {
    log("setting GemCore Admin");
    await sendTxAndWait({from: currentAdmin, gas: 1000000, skipError: true}, "GemCore", "changeAdmin", gemCoreAdmin);
  }
};
module.exports.skip = guard(["1", "4", "314159"]); // TODO remove
