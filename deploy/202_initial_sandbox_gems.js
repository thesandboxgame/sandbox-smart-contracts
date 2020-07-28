module.exports = async ({getNamedAccounts, deployments}) => {
  const {execute} = deployments;
  const {deployer, sandboxAccount} = await getNamedAccounts();
  await execute("Gem", {from: deployer}, "batchMint", sandboxAccount, [0, 1, 2, 3, 4], [9, 4, 8, 4, 5]);
  return true;
};
