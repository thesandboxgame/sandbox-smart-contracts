module.exports = async ({getNamedAccounts, deployments}) => {
  const {execute} = deployments;
  const {catalystMinter, sandboxAccount} = await getNamedAccounts();
  await execute("Catalyst", {from: catalystMinter, skipUnknownSigner: true}, "batchMint", sandboxAccount, [2], [1]);
  return true;
};
