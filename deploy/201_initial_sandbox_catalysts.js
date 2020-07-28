module.exports = async ({getNamedAccounts, deployments}) => {
  const {execute} = deployments;
  const {deployer, sandboxAccount} = await getNamedAccounts();
  await execute("Catalyst", {from: deployer}, "batchMint", sandboxAccount, [0, 1, 2, 3], [1, 1, 1, 6]);
  return true;
};
