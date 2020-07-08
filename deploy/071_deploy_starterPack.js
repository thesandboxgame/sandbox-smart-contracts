const {guard} = require("../lib");
const {starterPackPrices} = require("../data/starterPack");

module.exports = async ({getNamedAccounts, deployments}) => {
  const {deployIfDifferent, log} = deployments;

  const {deployer, starterPackAdmin, starterPackSaleBeneficiary, backendMessageSigner} = await getNamedAccounts();

  const sandContract = await deployments.getOrNull("Sand");
  if (!sandContract) {
    throw new Error("no SAND contract deployed");
  }

  const metaTxContract = await deployments.getOrNull("NativeMetaTransactionProcessor");
  if (!sandContract) {
    throw new Error("no META-TX contract deployed");
  }

  const daiContract = await deployments.getOrNull("DAI");
  if (!daiContract) {
    throw new Error("no DAI contract deployed");
  }

  const daiMedianizer = await deployments.getOrNull("DAIMedianizer");
  if (!daiMedianizer) {
    throw new Error("no DAI-MEDIANIZER contract deployed");
  }

  const catalystGroup = await deployments.getOrNull("Catalyst");
  if (!catalystGroup) {
    throw new Error("no CATALYST contract deployed");
  }

  const gemGroup = await deployments.getOrNull("Gem");
  if (!sandContract) {
    throw new Error("no GEM contract deployed");
  }

  const deployResult = await deployIfDifferent(
    ["data"],
    "StarterPackV1",
    {from: deployer, gas: 3000000},
    "StarterPackV1",
    starterPackAdmin,
    sandContract.address,
    metaTxContract.address,
    starterPackSaleBeneficiary,
    daiMedianizer.address,
    daiContract.address,
    catalystGroup.address,
    gemGroup.address,
    backendMessageSigner,
    starterPackPrices,
  );

  if (deployResult.newlyDeployed) {
    log(" - StarterPack deployed at : " + deployResult.address + " for gas : " + deployResult.receipt.gasUsed);
  } else {
    log("reusing StarterPack at " + deployResult.address);
  }
};

module.exports.skip = guard(["1", "4", "314159"], "StarterPack");
module.exports.dependencies = [
  "Sand",
  "NativeMetaTransactionProcessor",
  "DAIMedianizer",
  "DAI",
  "ERC20GroupCatalyst",
  "Gem",
  "NativeMetaTransactionProcessor",
];
