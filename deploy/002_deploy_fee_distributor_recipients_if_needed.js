const {guard} = require("../lib");

module.exports = async ({getNamedAccounts, deployments}) => {
  const {deploy, log} = deployments;

  const {deployer} = await getNamedAccounts();

  let treasury = await deployments.getOrNull("Treasury");
  if (!treasury) {
    log("setting up a fake Treasury");
    treasury = await deploy("Treasury", {from: deployer, gas: 6721975, contract: "Treasury"});
  }

  let reserve = await deployments.getOrNull("Reserve");
  if (!reserve) {
    log("setting up a fake Reserve");
    treasury = await deploy("Reserve", {from: deployer, gas: 6721975, contract: "Reserve"});
  }

  let foundationDAI = await deployments.getOrNull("FoundationDAI");
  if (!foundationDAI) {
    log("setting up a fake FoundationDAI");
    foundationDAI = await deploy("FoundationDAI", {from: deployer, gas: 6721975, contract: "FoundationDAI"});
  }

  let foundation = await deployments.getOrNull("Foundation");
  if (!foundation) {
    log("setting up a fake Foundation");
    foundation = await deploy("Foundation", {from: deployer, gas: 6721975, contract: "Foundation"});
  }

  let stakingPool = await deployments.getOrNull("StakingPool");
  if (!stakingPool) {
    log("setting up a fake StakingPool");
    stakingPool = await deploy("StakingPool", {from: deployer, gas: 6721975, contract: "StakingPool"});
  }
};
module.exports.tags = ["FakeRecipients"];
module.exports.skip = guard(["1", "4"], "FakeRecipients");
