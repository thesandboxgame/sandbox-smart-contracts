const {bre, deployments, getNamedAccounts} = require("@nomiclabs/buidler");

module.exports.setupStarterPack = deployments.createFixture(async (bre, options) => {
  const {deployer, catalystAdmin} = await getNamedAccounts();
  await deployments.fixture();
  options = options || {};

  const starterPackContract = await ethers.getContract("StarterPack", deployer);

  await deployments.deploy("StarterPack", {
    from: deployer,
    gas: 3000000,
    args: [catalystAdmin],
  });

  return {
    starterPackContract,
  };
});
