const {guard} = require("../lib");

module.exports = async ({getNamedAccounts, deployments}) => {
  const {deploy} = deployments;

  const {deployer, genesisBouncerAdmin, genesisMinter} = await getNamedAccounts();

  const asset = await deployments.get("Asset");

  await deploy("GenesisBouncer", {
    from: deployer,
    args: [asset.address, genesisBouncerAdmin, genesisMinter],
    log: true,
  });
};
module.exports.skip = guard(["1", "4", "314159"], "GenesisBouncer");
module.exports.tags = ["GenesisBouncer"];
module.exports.dependencies = ["Asset"];
