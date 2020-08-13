const {guard} = require("../lib");

module.exports = async ({getNamedAccounts, deployments}) => {
  const {deploy} = deployments;

  const {deployer, others} = await getNamedAccounts();
  const roles = others;
  const forwardTo = roles[4];
  const signers = await ethers.getSigners();
  const fakeTrustedForwarder = await signers[11].getAddress();

  await deploy("MetaTxWrapper", {
    from: deployer,
    args: [fakeTrustedForwarder, forwardTo],
    log: true,
  });
};

module.exports.skip = guard(["1", "4", "314159"]);
module.exports.tags = ["MetaTxWrapper"];
