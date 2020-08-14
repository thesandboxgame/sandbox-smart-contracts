const {guard} = require("../lib");
const {BigNumber} = require("@ethersproject/bignumber");
function sandWei(amount) {
  return BigNumber.from(amount).mul("1000000000000000000").toString();
}

module.exports = async ({getNamedAccounts, deployments}) => {
  const {deploy, read, execute, log} = deployments;
  const {deployer, catalystMinterAdmin} = await getNamedAccounts();

  const registry = await deployments.get("CatalystRegistry");
  const sand = await deployments.get("Sand");
  const asset = await deployments.get("Asset");
  const gem = await deployments.get("Gem");
  const catalyst = await deployments.get("Catalyst");

  const bakedMintData = [];
  for (let i = 0; i < 4; i++) {
    const mintData = await read("Catalyst", "getMintData", i);
    const maxGems = BigNumber.from(mintData.maxGems).mul(BigNumber.from(2).pow(240));
    const minQuantity = BigNumber.from(mintData.minQuantity).mul(BigNumber.from(2).pow(224));
    const maxQuantity = BigNumber.from(mintData.maxQuantity).mul(BigNumber.from(2).pow(208));
    const sandMintingFee = BigNumber.from(mintData.sandMintingFee).mul(BigNumber.from(2).pow(120));
    const sandUpdateFee = BigNumber.from(mintData.sandUpdateFee);
    const bakedData = sandUpdateFee.add(sandMintingFee).add(maxGems).add(minQuantity).add(maxQuantity);
    bakedMintData.push(bakedData);
  }

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
      "0x0000000000000000000000000000000000000000", // TODO SAND : mintingFeeCollector
      sandWei(1), //TODO SAND : confirm
      catalyst.address,
      bakedMintData,
    ],
  });

  const currentMinter = await read("CatalystRegistry", "getMinter");
  if (currentMinter.toLowerCase() != catalystMinter.address.toLowerCase()) {
    log("setting CatalystMinter as CatalystRegistry minter");
    const currentRegistryAdmin = await read("CatalystRegistry", "getAdmin");
    await execute(
      "CatalystRegistry",
      {from: currentRegistryAdmin, skipUnknownSigner: true},
      "setMinter",
      catalystMinter.address
    );
  }

  const isBouncer = await read("Asset", "isBouncer", catalystMinter.address);
  if (!isBouncer) {
    log("setting CatalystMinter as Asset bouncer");
    const currentBouncerAdmin = await read("Asset", "getBouncerAdmin");
    await execute(
      "Asset",
      {from: currentBouncerAdmin, skipUnknownSigner: true},
      "setBouncer",
      catalystMinter.address,
      true
    );
  }

  async function setSuperOperatorFor(contractName, address) {
    const isSuperOperator = await read(contractName, "isSuperOperator", address);
    if (!isSuperOperator) {
      log("setting CatalystMinter as super operator for " + contractName);
      const currentSandAdmin = await read(contractName, "getAdmin");
      await execute(contractName, {from: currentSandAdmin, skipUnknownSigner: true}, "setSuperOperator", address, true);
    }
  }

  await setSuperOperatorFor("Sand", catalystMinter.address);
  await setSuperOperatorFor("Gem", catalystMinter.address);
  await setSuperOperatorFor("Asset", catalystMinter.address);
  await setSuperOperatorFor(`Catalyst`, catalystMinter.address);
};
module.exports.skip = guard(["1", "314159", "4"], "CatalystMinter");
module.exports.tags = ["CatalystMinter"];
module.exports.dependencies = ["Catalyst", "Sand", "Gem", "Asset", "CatalystRegistry"];
