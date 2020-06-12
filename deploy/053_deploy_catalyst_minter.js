const {guard} = require("../lib");

module.exports = async ({getNamedAccounts, deployments}) => {
  const {deploy, call, sendTxAndWait, log} = deployments;
  const {deployer, catalystMinterAdmin, mintingFeeCollector} = await getNamedAccounts();

  const registry = await deployments.get("CatalystRegistry");
  const sand = await deployments.get("Sand");
  const asset = await deployments.get("Asset");
  const gem = await deployments.get("Gem");
  const catalyst = await deployments.get("Catalyst");

  const catalystMinter = await deploy("CatalystMinter", {
    from: deployer,
    gas: 3000000,
    log: true,
    args: [
      registry.address,
      sand.address,
      asset.address,
      gem.address,
      sand.address,
      catalystMinterAdmin,
      "0x0000000000000000000000000000000000000000", // TODO // mintingFeeCollector,
      catalyst.address,
    ],
  });

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

  const isBouncer = await call("Asset", "isBouncer", catalystMinter.address);
  if (!isBouncer) {
    log("setting CatalystMinter as Asset bouncer");
    const currentBouncerAdmin = await call("Asset", "getBouncerAdmin");
    await sendTxAndWait(
      {from: currentBouncerAdmin, gas: 1000000, skipError: true},
      "Asset",
      "setBouncer",
      catalystMinter.address,
      true
    );
  }

  async function setSuperOperatorFor(contractName, address) {
    const isSuperOperator = await call(contractName, "isSuperOperator", address);
    if (!isSuperOperator) {
      log("setting CatalystMinter as super operator for " + contractName);
      const currentSandAdmin = await call(contractName, "getAdmin");
      await sendTxAndWait(
        {from: currentSandAdmin, gas: 100000, skipError: true},
        contractName,
        "setSuperOperator",
        address,
        true
      );
    }
  }

  await setSuperOperatorFor("Sand", catalystMinter.address);
  await setSuperOperatorFor("Gem", catalystMinter.address);
  await setSuperOperatorFor("Asset", catalystMinter.address);
  await setSuperOperatorFor(`Catalyst`, catalystMinter.address);
};
module.exports.skip = guard(["1", "4", "314159"]); // TODO
