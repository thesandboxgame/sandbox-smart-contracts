const {ethers, deployments} = require("@nomiclabs/buidler");

module.exports.setupTest = deployments.createFixture(async () => {
  await deployments.fixture();
  const sandContract = await ethers.getContract("Sand");
  const sandWrapper = await ethers.getContract("SandWrapper");
  return {
    sandWrapper,
    sandContract,
  };
});
