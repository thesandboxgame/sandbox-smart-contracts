const {guard} = require("../lib");

module.exports = async ({getNamedAccounts, deployments}) => {
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();

  const sandContract = await deployments.get("Sand");

  await deploy("Land", {
    from: deployer,
    gas: 6000000,
    args: [
      sandContract.address,
      deployer, // set_land_admin set it later to correct address
    ],
    log: true,
  });
};
module.exports.skip = guard(["1", "4", "314159"], "Land");
module.exports.tags = ["Land"];
module.exports.dependencies = ["Sand"];
