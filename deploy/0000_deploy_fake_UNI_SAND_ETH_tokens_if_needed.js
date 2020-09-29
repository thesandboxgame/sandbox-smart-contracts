module.exports = async ({getNamedAccounts, deployments}) => {
  const {deploy, log} = deployments;

  const {deployer} = await getNamedAccounts();

  let UNI_SAND_ETH = await deployments.getOrNull("UNI_SAND_ETH");
  if (!UNI_SAND_ETH) {
    log("setting up a fake UNI_SAND_ETH");
    UNI_SAND_ETH = await deploy("UNI_SAND_ETH", {from: deployer, gas: 6721975, contract: "FakeDai"});
  }
};
module.exports.tags = ["UNI_SAND_ETH"];
