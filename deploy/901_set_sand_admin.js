module.exports = async ({getChainId, getNamedAccounts, deployments}) => {
  const {read, execute, log} = deployments;
  const chainId = await getChainId();

  const {sandAdmin, sandExecutionAdmin} = await getNamedAccounts();

  const currentAdmin = await read("Sand", "getAdmin");
  if (currentAdmin.toLowerCase() !== sandAdmin.toLowerCase()) {
    log("setting Sand Admin");
    await execute("Sand", {from: currentAdmin, skipUnknownSigner: true}, "changeAdmin", sandAdmin);
  }

  if (chainId === "4") {
    return; // TODO setup SAND on rinkeby
  }
  const currentExecutionAdmin = await read("Sand", "getExecutionAdmin");
  if (currentExecutionAdmin.toLowerCase() !== sandExecutionAdmin.toLowerCase()) {
    log("setting Sand Execution Admin");
    await execute(
      "Sand",
      {from: currentExecutionAdmin, skipUnknownSigner: true},
      "changeExecutionAdmin",
      sandExecutionAdmin
    );
  }
};
module.exports.runAtTheEnd = true;
module.exports.dependencies = ["Sand"];
