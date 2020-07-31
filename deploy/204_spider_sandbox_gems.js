module.exports = async ({getNamedAccounts, deployments}) => {
  const {execute} = deployments;
  const {gemMinter, sandboxAccount} = await getNamedAccounts();
  await execute("Gem", {from: gemMinter, skipUnknownSigner: true}, "batchMint", sandboxAccount, [0, 2], [1, 2]);
  return true;
};
