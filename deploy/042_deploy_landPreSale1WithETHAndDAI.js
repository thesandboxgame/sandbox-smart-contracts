const {guard} = require("../lib");
const {getLands} = require("../data/landPreSale_1/getLands");

module.exports = async ({getChainId, getNamedAccounts, deployments, network}) => {
  const {deployIfDifferent, deploy, log} = deployments;
  const chainId = await getChainId();

  const {deployer, landSaleAdmin, landSaleBeneficiary} = await getNamedAccounts();

  const sandContract = await deployments.getOrNull("Sand");
  const landContract = await deployments.getOrNull("Land");

  if (!sandContract) {
    throw new Error("no SAND contract deployed");
  }

  if (!landContract) {
    throw new Error("no LAND contract deployed");
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
    "LandPreSale_1",
    {from: deployer, gas: 1000000, linkedData: lands},
    "LandSaleWithETHAndDAI",
    landContract.address,
    sandContract.address,
    sandContract.address,
    landSaleAdmin,
    landSaleBeneficiary,
    merkleRootHash,
    1576753200, // This is Thursday, 19 December 2019 11:00:00 GMT+00:00 // Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 days
    daiMedianizer.address,
    dai.address
  );
  if (deployResult.newlyDeployed) {
    log(" - LandPreSale_1 deployed at : " + deployResult.address + " for gas : " + deployResult.receipt.gasUsed);
  } else {
    log("reusing LandPreSale_1 at " + deployResult.address);
  }
};
module.exports.skip = guard(["1", "4", "314159"], "LandPreSale_1");
