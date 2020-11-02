const {ethers, deployments, getNamedAccounts} = require("@nomiclabs/buidler");

module.exports.setupTest = deployments.createFixture(async () => {
  await deployments.fixture();
  const {gameTokenAdmin, others} = await getNamedAccounts();

  const sandContract = await ethers.getContract("Sand");
  const gameToken = await ethers.getContract("GameToken");
  const gameTokenAsAdmin = await ethers.getContract("GameToken", gameTokenAdmin);

  const users = [];
  for (const other of others) {
    users.push({
      address: other,
      Game: gameToken.connect(gameToken.provider.getSigner(other)),
      Sand: sandContract.connect(sandContract.provider.getSigner(other)),
    });
  }

  const GameOwner = {
    address: users[0].address,
    Game: gameToken.connect(gameToken.provider.getSigner(users[0].address)),
  };

  const GameEditor1 = {
    address: users[1].address,
    Game: gameToken.connect(gameToken.provider.getSigner(users[1].address)),
  };

  const GameEditor2 = {
    address: users[1].address,
    Game: gameToken.connect(gameToken.provider.getSigner(users[2].address)),
  };

  return {
    gameToken,
    gameTokenAsAdmin,
    GameOwner,
    GameEditor1,
    GameEditor2,
    users,
  };
});
