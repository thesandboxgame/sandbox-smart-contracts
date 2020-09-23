module.exports = async ({getNamedAccounts, deployments}) => {
  const {deploy} = deployments;
  const {deployer} = await getNamedAccounts();

  await deploy("SANDRewardPool", {
    from: deployer,
    log: true,
  });
  return true; // do not execute again;
};
module.exports.tags = ["SANDRewardPool"];
