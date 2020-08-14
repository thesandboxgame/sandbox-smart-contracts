module.exports = async ({getNamedAccounts, deployments}) => {
  const {deployer} = await getNamedAccounts();
  const {deploy} = deployments;

  await deploy("FeeTimeVault", {
    from: deployer,
    gas: 3000000,
    log: true,
    args: [],
  });
};
module.exports.tags = ["FeeTimeVault"];
module.exports.skip = guard(["1"], "FeeTimeVault");
