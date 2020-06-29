const {ethers, deployments, getNamedAccounts} = require("@nomiclabs/buidler");

module.exports.setupStarterPack = deployments.createFixture(async () => {
  const {deployer} = await getNamedAccounts();
  await deployments.fixture();

  const starterPackContract = await ethers.getContract("StarterPack", deployer);

  return {
    starterPackContract,
  };
});
