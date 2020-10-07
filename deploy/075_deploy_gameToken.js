const {guard} = require("../lib");
// const {starterPackPrices, gemPrice} = require("../data/starterPack");

module.exports = async ({getNamedAccounts, deployments}) => {
  const {deploy} = deployments;

  // const {deployer, starterPackAdmin, starterPackSaleBeneficiary, backendMessageSigner} = await getNamedAccounts();

  // const sandContract = await deployments.get("Sand");
  // const daiContract = await deployments.get("DAI");
  // const daiMedianizer = await deployments.get("DAIMedianizer");
  // const catalystGroup = await deployments.get("Catalyst");
  // const gemGroup = await deployments.get("Gem");

  await deploy("GameToken", {
    from: deployer,
    args: [],
    log: true,
  });
};

module.exports.skip = guard(["1", "4", "314159"]); // @todo "GameToken"
module.exports.tags = ["GameToken"];
// module.exports.dependencies = ["Sand", "DAI", "Catalyst", "Gem"];
