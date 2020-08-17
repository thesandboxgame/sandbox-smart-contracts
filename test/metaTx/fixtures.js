const {ethers, deployments} = require("@nomiclabs/buidler");
// const {ethers} = require("ethers");

module.exports.setupTest = deployments.createFixture(async () => {
  await deployments.fixture("MetaTxWrapper");
  const sandContract = await ethers.getContract("Sand");
  const metaWrapper = await ethers.getContract("MetaTxWrapper");
  return {
    metaWrapper,
    sandContract,
  };
});
