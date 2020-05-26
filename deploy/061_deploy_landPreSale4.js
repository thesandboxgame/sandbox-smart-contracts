const {guard} = require("../lib");
const {getLands} = require("../data/LandPreSale_4/getLands");

module.exports = async ({getChainId, getNamedAccounts, deployments, network}) => {
  const {deployIfDifferent, deploy, log} = deployments;
  const chainId = await getChainId();

  const {deployer, landSaleBeneficiary, backendReferralWallet} = await getNamedAccounts();

  const sandContract = await deployments.getOrNull("Sand");
  const landContract = await deployments.getOrNull("Land");
  const estateContract = await deployments.getOrNull("Estate");

  if (!sandContract) {
    throw new Error("no SAND contract deployed");
  }

  if (!landContract) {
    throw new Error("no LAND contract deployed");
  }

  if (!estateContract) {
    throw new Error("no ESTATE contract deployed");
  }

  let daiMedianizer = await deployments.getOrNull("DAIMedianizer");
  if (!daiMedianizer) {
    log("setting up a fake DAI medianizer");
    daiMedianizer = await deploy("DAIMedianizer", {from: deployer, gas: 6721975}, "FakeMedianizer");
  }

  let dai = await deployments.getOrNull("DAI");
  if (!dai) {
    log("setting up a fake DAI");
    dai = await deploy(
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
    "LandPreSale_4",
    {from: deployer, gas: 1000000, linkedData: lands},
    "EstateSale",
    landContract.address,
    sandContract.address,
    sandContract.address,
    deployer,
    landSaleBeneficiary,
    merkleRootHash,
    1591016400, // Monday, 1 June 2020 13:00:00 GMT+00:00 // TODO
    daiMedianizer.address,
    dai.address,
    backendReferralWallet,
    2000,
    estateContract.address
  );
  if (deployResult.newlyDeployed) {
    log(" - LandPreSale_4 deployed at : " + deployResult.address + " for gas : " + deployResult.receipt.gasUsed);
  } else {
    log("reusing LandPreSale_4 at " + deployResult.address);
  }
};
module.exports.skip = guard(["1", "4", "314159"]); // TODO , 'LandPreSale_4');
