module.exports = async ({deployments}) => {
  const {read, execute, log} = deployments;
  const permit = await deployments.get("Permit");

  const isSandSuperOperator = await read("Sand", "isSuperOperator", permit.address);
  if (!isSandSuperOperator) {
    log("setting Permit as super operator for Sand");
    const currentSandAdmin = await read("Sand", "getAdmin");
    await execute("Sand", {from: currentSandAdmin, skipUnknownSigner: true}, "setSuperOperator", permit.address, true);
  }
};
