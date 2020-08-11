module.exports = async ({getNamedAccounts, deployments}) => {
  const {read, execute, log} = deployments;

  const {landAdmin} = await getNamedAccounts();

  const land = await deployments.getOrNull("Land");
  if (!land) {
    throw new Error("no Land contract deployed");
  }

  let currentAdmin;
  try {
    currentAdmin = await read("Land", "getAdmin");
  } catch (e) {}
  if (currentAdmin) {
    if (currentAdmin.toLowerCase() !== landAdmin.toLowerCase()) {
      log("setting land Admin");
      await execute("Land", {from: currentAdmin, skipUnknownSigner: true}, "changeAdmin", landAdmin);
    }
  } else {
    log("current land impl do not support admin");
  }
};
module.exports.runAtTheEnd = true;
module.exports.dependencies = ["Land"];
