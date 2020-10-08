const {ethers, deployments, getNamedAccounts} = require("@nomiclabs/buidler");

module.exports.setupTest = deployments.createFixture(async () => {
  await deployments.fixture();
  const {gameTokenAdmin} = await getNamedAccounts();

  const gameToken = await ethers.getContract("GameToken");
  const gameTokenAsAdmin = await ethers.getContract("GameToken", gameTokenAdmin);

  return {
    gameToken,
    gameTokenAsAdmin,
  };
});
