const {ethers, deployments} = require("@nomiclabs/buidler");
// const {ethers} = require("ethers");

module.exports.setupTest = deployments.createFixture(async () => {
  await deployments.fixture();
  const sandContract = await ethers.getContract("Sand");
  const catalystContract = await ethers.getContract("CatalystMinter");
  const sandWrapper = await ethers.getContract("SandWrapper");
  const catalystWrapper = await ethers.getContract("CatalystWrapper");
  return {
    sandWrapper,
    catalystWrapper,
    sandContract,
    catalystContract,
  };
});
