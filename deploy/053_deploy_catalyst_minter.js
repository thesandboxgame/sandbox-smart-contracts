const {guard} = require("../lib");

module.exports = async ({getNamedAccounts, deployments}) => {
  const {deployIfDifferent, log, call, sendTxAndWait} = deployments;
  const {deployer, catalystMinterAdmin} = await getNamedAccounts();

  const registry = await deployments.get("CatalystRegistry");
  const sand = await deployments.get("Sand");
  const asset = await deployments.get("Asset");
  const gemCore = await deployments.get("GemCore");
  const catalysts = [];
  for (const name of ["Common", "Rare", "Epic", "Legendary"]) {
    const catalyst = await deployments.get(`${name}Catalyst`);
    catalysts.push(catalyst.address);
  }

  const catalystMinter = await deployIfDifferent(
    ["data"],
    "CatalystMinter",
    {from: deployer, gas: 300000},
    "CatalystMinter",
    registry.address,
    sand.address,
    asset.address,
    gemCore.address,
    sand.address,
    catalystMinterAdmin,
    catalysts
  );
  if (catalystMinter.newlyDeployed) {
    log(` - CatalystMinter deployed at :  ${catalystMinter.address} for gas: ${catalystMinter.receipt.gasUsed}`);
  } else {
    log(`reusing CatalystMinter at ${catalystMinter.address}`);
  }

  const currentMinter = await call("CatalystRegistry", "getMinter");
  if (currentMinter.toLowerCase() != catalystMinter.address.toLowerCase()) {
    log("setting CatalystMinter as CatalystRegistry minter");
    const currentRegistryAdmin = await call("CatalystRegistry", "getAdmin");
    await sendTxAndWait(
      {from: currentRegistryAdmin, gas: 1000000, skipError: true},
      "CatalystRegistry",
      "setMinter",
      catalystMinter.address
    );
  }
};
module.exports.skip = guard(["1", "4", "314159"]); // TODO
