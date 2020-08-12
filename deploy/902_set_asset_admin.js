module.exports = async ({getNamedAccounts, deployments}) => {
  const {read, execute, log} = deployments;

  const {assetAdmin, assetBouncerAdmin} = await getNamedAccounts();

  let currentAdmin;
  try {
    currentAdmin = await read("Asset", "getAdmin");
  } catch (e) {}
  if (currentAdmin) {
    if (currentAdmin.toLowerCase() !== assetAdmin.toLowerCase()) {
      log("setting Asset Admin");
      await execute("Asset", {from: currentAdmin, skipUnknownSigner: true}, "changeAdmin", assetAdmin);
    }
  } else {
    log("current Asset impl do not support admin");
  }

  let currentBouncerAdmin;
  try {
    currentBouncerAdmin = await read("Asset", "getBouncerAdmin");
  } catch (e) {}
  if (currentBouncerAdmin) {
    if (currentBouncerAdmin.toLowerCase() !== assetBouncerAdmin.toLowerCase()) {
      log("setting Asset Bouncer Admin");
      await execute(
        "Asset",
        {from: currentBouncerAdmin, skipUnknownSigner: true},
        "changeBouncerAdmin",
        assetBouncerAdmin
      );
    }
  } else {
    log("current Asset impl do not support bouncerAdmin");
  }
};
module.exports.runAtTheEnd = true;
module.exports.dependencies = ["Asset"];
