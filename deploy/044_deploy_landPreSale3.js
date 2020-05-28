const {guard} = require("../lib");
const {getLands} = require("../data/landPreSale_3/getLands");

const fs = require("fs");
const {calculateLandHash} = require("../lib/merkleTreeHelper");

module.exports = async ({getChainId, getNamedAccounts, deployments, network}) => {
  const {deployIfDifferent, deploy, log} = deployments;
  const chainId = await getChainId();

  const {deployer, landSaleBeneficiary, backendReferralWallet} = await getNamedAccounts();

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

  const {lands, merkleRootHash, saltedLands, tree} = getLands(network.live, chainId);

  const deployResult = await deployIfDifferent(
    ["data"],
    "LandPreSale_3",
    {from: deployer, gas: 3000000, linkedData: lands},
    "LandSaleWithReferral",
    landContract.address,
    sandContract.address,
    sandContract.address,
    deployer,
    landSaleBeneficiary,
    merkleRootHash,
    1586869200, // Tuesday, 14 April 2020 13:00:00 GMT+00:00
    daiMedianizer.address,
    dai.address,
    backendReferralWallet,
    2000
  );
  if (deployResult.newlyDeployed) {
    log(" - LandPreSale_3 deployed at : " + deployResult.address + " for gas : " + deployResult.receipt.gasUsed);
    const landsWithProof = [];
    for (const land of saltedLands) {
      land.proof = tree.getProof(calculateLandHash(land));
      landsWithProof.push(land);
    }
    fs.writeFileSync(`./.presale_3_proofs_${chainId}.json`, JSON.stringify(landsWithProof, null, "  "));
  } else {
    log("reusing LandPreSale_3 at " + deployResult.address);
  }
};
module.exports.skip = guard(["1", "4", "314159"], "LandPreSale_3");
