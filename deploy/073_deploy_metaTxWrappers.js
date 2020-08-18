const {guard} = require("../lib");

module.exports = async ({getNamedAccounts, deployments}) => {
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();
  const sandContract = await deployments.get("Sand");
  const catalystMinterContract = await deployments.get("CatalystMinter");
  const signers = await ethers.getSigners();
  const fakeTrustedForwarder = await signers[11].getAddress();

  const metaTxSand = await deploy("MetaTxWrapper", {
    contractName: "SandWrapper",
    from: deployer,
    args: [fakeTrustedForwarder, sandContract.address],
    log: true,
  });

  const metaTxCatalyst = await deploy("MetaTxWrapper", {
    contractName: "CatalystWrapper",
    from: deployer,
    args: [fakeTrustedForwarder, catalystMinterContract.address],
    log: true,
  });

  const sandWrapper = {...metaTxSand, abi: sandContract.abi};
  const catalystWrapper = {...metaTxCatalyst, abi: catalystMinterContract.abi};

  await deployments.save("SandWrapper", sandWrapper);
  await deployments.save("CatalystWrapper", catalystWrapper);
};

module.exports.skip = guard(["1", "4", "314159"]);
module.exports.dependencies = ["Sand", "CatalystMinter", "Forwarder"];
module.exports.tags = ["MetaTxWrapper"];
