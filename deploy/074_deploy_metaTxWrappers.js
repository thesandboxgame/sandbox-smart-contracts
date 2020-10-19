const {guard} = require("../lib");

module.exports = async ({getNamedAccounts, deployments}) => {
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();
  const sandContract = await deployments.get("Sand");
  const forwarderContract = await deployments.get("Forwarder");
  const metaTxSand = await deploy("SandWrapper", {
    contract: "MetaTxWrapper",
    from: deployer,
    args: [forwarderContract.address, sandContract.address],
    log: true,
  });

  const sandWrapper = {...metaTxSand, abi: sandContract.abi};
  await deployments.save("SandWrapper", sandWrapper);
};

module.exports.skip = guard(["1", "4", "314159"]);
module.exports.dependencies = ["Sand", "Forwarder"];
module.exports.tags = ["MetaTxWrapper"];
