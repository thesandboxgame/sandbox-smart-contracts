module.exports = async ({getNamedAccounts, deployments}) => {
  const {call, sendTxAndWait, log} = deployments;

  const {landAdmin} = await getNamedAccounts();

  const land = await deployments.getOrNull("Land");
  if (!land) {
    throw new Error("no Land contract deployed");
  }

  let currentAdmin;
  try {
    currentAdmin = await call("Land", "getAdmin");
  } catch (e) {}
  if (currentAdmin) {
    if (currentAdmin.toLowerCase() !== landAdmin.toLowerCase()) {
      log("setting land Admin");
      await sendTxAndWait(
        {from: currentAdmin, gas: 1000000, skipUnknownSigner: true},
        "Land",
        "changeAdmin",
        landAdmin
      );
    }
  } else {
    log("current land impl do not support admin");
  }
};
module.exports.tags = ["Land"];
module.exports.runAtTheEnd = true;
