module.exports = async ({deployments}) => {
  const {call, sendTxAndWait, log} = deployments;

  const sand = await deployments.getOrNull("Sand");
  if (!sand) {
    throw new Error("no Sand contract deployed");
  }
  const metaTxProcessor = await deployments.getOrNull("NativeMetaTransactionProcessor");
  if (!metaTxProcessor) {
    throw new Error("no NativeMetaTransactionProcessor contract deployed");
  }

  const currentSandAdmin = await call("Sand", "getAdmin");

  const isSuperOperator = await call("Sand", "isSuperOperator", metaTxProcessor.address);
  if (!isSuperOperator) {
    log("setting NativeMetaTransactionProcessor as super operator");
    await sendTxAndWait(
      {from: currentSandAdmin, gas: 100000, skipError: true},
      "Sand",
      "setSuperOperator",
      metaTxProcessor.address,
      true
    );
  }

  const currentExecutionSandAdmin = await call("Sand", "getExecutionAdmin");
  const isExecutionOperator = await call("Sand", "isExecutionOperator", metaTxProcessor.address);
  if (!isExecutionOperator) {
    log("setting NativeMetaTransactionProcessor as execution operator");
    await sendTxAndWait(
      {from: currentExecutionSandAdmin, gas: 100000, skipError: true},
      "Sand",
      "setExecutionOperator",
      metaTxProcessor.address,
      true
    );
  }
};
