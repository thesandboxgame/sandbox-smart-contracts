const {guard} = require("../lib");
module.exports = async ({getNamedAccounts, deployments}) => {
  const {call, sendTxAndWait, log} = deployments;
  const {catalystAdmin} = await getNamedAccounts();
  const currentAdmin = await call(`Catalyst`, "getAdmin");
  if (currentAdmin.toLowerCase() !== catalystAdmin.toLowerCase()) {
    log(`setting Catalyst Admin`);
    await sendTxAndWait(
      {from: currentAdmin, gas: 1000000, skipUnknownSigner: true},
      `Catalyst`,
      "changeAdmin",
      catalystAdmin
    );
  }
};
module.exports.skip = guard(["1", "314159"]); // TODO remove
