module.exports = async ({getNamedAccounts, deployments}) => {
  const {deploy, log} = deployments;

  const {deployer} = await getNamedAccounts();

  let daiMedianizer = await deployments.getOrNull("DAIMedianizer");
  if (!daiMedianizer) {
    log("setting up a fake DAI medianizer");
    daiMedianizer = await deploy("DAIMedianizer", {from: deployer, gas: 6721975, contract: "FakeMedianizer"});
  }

  let dai = await deployments.getOrNull("DAI");
  if (!dai) {
    log("setting up a fake DAI");
    dai = await deploy("DAI", {from: deployer, gas: 6721975, contract: "FakeDai"});
  }
};
