const {ethers, deployments, getNamedAccounts} = require("@nomiclabs/buidler");
const {BigNumber} = require("ethers");
const {toWei} = require("local-utils");

module.exports.setupTest = deployments.createFixture(async () => {
  await deployments.fixture();
  const {gameTokenAdmin, sandAdmin, deployer, others} = await getNamedAccounts();

  const sandContract = await ethers.getContract("Sand");
  const daiContract = await ethers.getContract("DAI");
  const gameToken = await ethers.getContract("GameToken");
  const gameTokenAsAdmin = await ethers.getContract("GameToken", gameTokenAdmin);

  // Give users funds
  async function setupUser(GameToken, SandAdmin, DaiAdmin, user, {hasSand, hasDAI}) {
    if (hasDAI) {
      await DaiAdmin.Dai.transfer(user.address, toWei("1000000"));
      await user.Dai.approve(GameToken.address, toWei("1000000"));
    }
    if (hasSand) {
      await SandAdmin.Sand.transfer(user.address, BigNumber.from("1000000000000000000000000"));
    }
    if (!hasDAI && !hasSand) {
      await user.Dai.approve(GameToken.address, toWei("1000000"));
    }
    return user;
  }

  const users = [];
  for (const other of others) {
    users.push({
      address: other,
      Game: gameToken.connect(gameToken.provider.getSigner(other)),
      Sand: sandContract.connect(sandContract.provider.getSigner(other)),
      Dai: daiContract.connect(daiContract.provider.getSigner(other)),
    });
  }

  const SandAdmin = {
    address: sandAdmin,
    Sand: sandContract.connect(sandContract.provider.getSigner(sandAdmin)),
  };

  const DaiAdmin = {
    address: deployer,
    Dai: daiContract.connect(daiContract.provider.getSigner(deployer)),
  };

  const userWithSAND = await setupUser(gameToken, SandAdmin, DaiAdmin, users[0], {
    hasSand: true,
    hasDAI: false,
  });

  const GameOwner = {
    address: userWithSAND.address,
    Game: gameToken.connect(gameToken.provider.getSigner(userWithSAND.address)),
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
    userWithSAND,
    GameOwner,
    GameEditor1,
    GameEditor2,
    users,
  };
});
