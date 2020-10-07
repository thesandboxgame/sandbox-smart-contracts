const {ethers, deployments} = require("@nomiclabs/buidler");

module.exports.setupTest = deployments.createFixture(async () => {
  await deployments.fixture();
  const gameToken = await ethers.getContract("GameToken");
  return {
    gameToken,
  };
});
