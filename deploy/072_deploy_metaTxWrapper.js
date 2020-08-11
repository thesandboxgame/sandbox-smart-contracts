const {guard} = require("../lib");

module.exports = async ({getNamedAccounts, deployments}) => {
  const {deploy} = deployments;

  const {deployer, metaTxTrustedForwarder, others} = await getNamedAccounts();
  const roles = others;
  const forwardTo = roles[4];

  await deploy("MetaTxWrapper", {
    from: deployer,
    args: [metaTxTrustedForwarder, forwardTo],
    log: true,
  });
};

module.exports.skip = guard(["1", "4", "314159"]);
module.exports.tags = ["MetaTxWrapper"];
