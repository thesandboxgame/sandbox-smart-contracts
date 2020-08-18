module.exports = async ({deployments}) => {
  const {execute, read, log} = deployments;

  const metaTxProcessor = await deployments.get("NativeMetaTransactionProcessor");

  const currentSandAdmin = await read("Sand", "getAdmin");

  const isSuperOperator = await read("Sand", "isSuperOperator", metaTxProcessor.address);
  if (!isSuperOperator) {
    log("setting NativeMetaTransactionProcessor as super operator");
    await execute(
      "Sand",
      {from: currentSandAdmin, skipUnknownSigner: true},
      "setSuperOperator",
      metaTxProcessor.address,
      true
    );
  }

  const currentExecutionSandAdmin = await read("Sand", "getExecutionAdmin");
  const isExecutionOperator = await read("Sand", "isExecutionOperator", metaTxProcessor.address);
  if (!isExecutionOperator) {
    log("setting NativeMetaTransactionProcessor as execution operator");
    await execute(
      "Sand",
      {from: currentExecutionSandAdmin, skipUnknownSigner: true},
      "setExecutionOperator",
      metaTxProcessor.address,
      true
    );
  }
};
module.exports.dependencies = ["Sand", "NativeMetaTransactionProcessor"];
