const {guard} = require("../lib");

module.exports = async ({getNamedAccounts, deployments}) => {
  const {deploy} = deployments;

  const {deployer, others} = await getNamedAccounts();
  const roles = others;
  const trustedForwarder = roles[3];
  const forwardTo = roles[4];

  await deploy("MetaTxWrapper", {
    from: deployer,
    args: [trustedForwarder, forwardTo],
    log: true,
  });
};

module.exports.skip = guard(["1", "4", "314159"]);
module.exports.tags = ["MetaTxWrapper"];
