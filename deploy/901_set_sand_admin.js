module.exports = async ({getChainId, getNamedAccounts, deployments}) => {
  const {call, sendTxAndWait, log} = deployments;
  const chainId = await getChainId();

  const {sandAdmin, sandExecutionAdmin} = await getNamedAccounts();

  const sandContract = await deployments.getOrNull("Sand");
  if (!sandContract) {
    throw new Error("no SAND contract deployed");
  }
  const currentAdmin = await call("Sand", "getAdmin");
  if (currentAdmin.toLowerCase() !== sandAdmin.toLowerCase()) {
    log("setting Sand Admin");
    await sendTxAndWait({from: currentAdmin, gas: 1000000, skipError: true}, "Sand", "changeAdmin", sandAdmin);
  }

  if (chainId === "4") {
    return; // TODO setup SAND on rinkeby
  }
  const currentExecutionAdmin = await call("Sand", "getExecutionAdmin");
  if (currentExecutionAdmin.toLowerCase() !== sandExecutionAdmin.toLowerCase()) {
    log("setting Sand Execution Admin");
    await sendTxAndWait(
      {from: currentExecutionAdmin, gas: 1000000, skipError: true},
      "Sand",
      "changeExecutionAdmin",
      sandExecutionAdmin
    );
  }
};
module.exports.tags = ["Sand"];
module.exports.runAtTheEnd = true;
