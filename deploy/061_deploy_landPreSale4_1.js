const {guard} = require("../lib");
const {getLands} = require("../data/LandPreSale_4_1/getLands");

module.exports = async ({getChainId, getNamedAccounts, deployments, network}) => {
  const {deployIfDifferent, deploy, log} = deployments;
  const chainId = await getChainId();

  const {deployer, landSaleBeneficiary, backendReferralWallet} = await getNamedAccounts();

  const sandContract = await deployments.get("Sand");
  const landContract = await deployments.get("Land");
  const assetContract = await deployments.get("Asset");

  let daiMedianizer = await deployments.getOrNull("DAIMedianizer");
  if (!daiMedianizer) {
    log("setting up a fake DAI medianizer");
    daiMedianizer = await deployIfDifferent(
      ["data"],
      "DAIMedianizer",
      {from: deployer, gas: 6721975},
      "FakeMedianizer"
    );
  }

  let dai = await deployments.getOrNull("DAI");
  if (!dai) {
    log("setting up a fake DAI");
    dai = await deployIfDifferent(
      ["data"],
      "DAI",
      {
        from: deployer,
        gas: 6721975,
      },
      "FakeDai"
    );
  }

  const {lands, merkleRootHash} = getLands(network.live, chainId);

  const deployResult = await deployIfDifferent(
    ["data"],
    "LandPreSale_4_1",
    {from: deployer, gas: 3000000, linkedData: lands},
    "EstateSale",
    landContract.address,
    sandContract.address,
    sandContract.address,
    deployer,
    landSaleBeneficiary,
    merkleRootHash,
    2591016400, // TODO
    daiMedianizer.address,
    dai.address,
    backendReferralWallet,
    2000,
    "0x0000000000000000000000000000000000000000", // estateContract.address
    assetContract.address
  );
  if (deployResult.newlyDeployed) {
    log(" - LandPreSale_4_1 deployed at : " + deployResult.address + " for gas : " + deployResult.receipt.gasUsed);
  } else {
    log("reusing LandPreSale_4_1 at " + deployResult.address);
  }
};
module.exports.skip = guard(["1", "4", "314159"]); // TODO , 'LandPreSale_4_1');
