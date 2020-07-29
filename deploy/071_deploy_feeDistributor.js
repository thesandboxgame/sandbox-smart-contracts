module.exports = async ({getNamedAccounts, deployments}) => {
  const {deployer} = await getNamedAccounts();
  const {deploy} = deployments;

  await deploy("FeeDistributor", {
    from: deployer,
    gas: 3000000,
    log: true,
    args: [[deployer], [10000]],
  });
};
module.exports.tags = ["FeeDistributor"];
