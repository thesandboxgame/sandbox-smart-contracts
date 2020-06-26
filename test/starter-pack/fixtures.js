const {bre, deployments, getNamedAccounts} = require("@nomiclabs/buidler");

module.exports.setupStarterPack = deployments.createFixture(async (bre, options) => {
  const {deployer} = await getNamedAccounts();
  await deployments.fixture();
  options = options || {};

  const starterPackContract = await ethers.getContract("StarterPack", deployer);

  await deployments.deploy("StarterPack", {
    from: deployer,
    gas: 3000000,
    args: [],
  });

  return {
    starterPackContract,
  };
});
