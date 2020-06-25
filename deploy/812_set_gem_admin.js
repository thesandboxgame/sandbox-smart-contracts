const {guard} = require("../lib");
module.exports = async ({getNamedAccounts, deployments}) => {
  const {call, sendTxAndWait, log} = deployments;

  const {gemAdmin} = await getNamedAccounts();
  const currentAdmin = await call("Gem", "getAdmin");
  if (currentAdmin.toLowerCase() !== gemAdmin.toLowerCase()) {
    log("setting Gem Admin");
    await sendTxAndWait({from: currentAdmin, gas: 1000000, skipError: true}, "Gem", "changeAdmin", gemAdmin);
  }
};
module.exports.skip = guard(["1", "4", "314159"]); // TODO remove
