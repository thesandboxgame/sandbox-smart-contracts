const {guard} = require("../lib");
module.exports = async ({getNamedAccounts, deployments}) => {
  const {call, sendTxAndWait, log} = deployments;
  const {catalystAdmin} = await getNamedAccounts();
  for (const name of ["Common", "Rare", "Epic", "Legendary"]) {
    const currentAdmin = await call(`${name}Catalyst`, "getAdmin");
    if (currentAdmin.toLowerCase() !== catalystAdmin.toLowerCase()) {
      log(`setting ${name}Catalyst Admin`);
      await sendTxAndWait(
        {from: currentAdmin, gas: 1000000, skipError: true},
        `${name}Catalyst`,
        "changeAdmin",
        catalystAdmin
      );
    }
  }
};
module.exports.skip = guard(["1", "4", "314159"]); // TODO remove
