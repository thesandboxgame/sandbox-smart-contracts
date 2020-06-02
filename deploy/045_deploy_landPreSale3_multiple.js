const {guard} = require("../lib");
const {BigNumber} = require("ethers");
const {getLands} = require("../data/landPreSale_3_multiple/getLands");

const fs = require("fs");
const {calculateLandHash} = require("../lib/merkleTreeHelper");

module.exports = async ({getChainId, getNamedAccounts, deployments, network}) => {
  const {deployIfDifferent, deploy, log} = deployments;
  const chainId = BigNumber.from(await getChainId()).toString();

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

  for (let sector = 4; sector < 10; sector++) {
    const {lands, merkleRootHash, saltedLands, tree} = getLands(sector, network.live, chainId);
    const landSaleName = "LandPreSale_3_" + sector;
    const existingLandSale = await deployments.getOrNull(landSaleName);
    // if (existingLandSale) {
    //   log(`${landSaleName} already deployed at ${existingLandSale.address}`);
    //   continue;
    // }
    const deployResult = await deployIfDifferent(
      ["data"],
      landSaleName,
      {from: deployer, gas: 6000000, linkedData: lands},
      "LandSaleWithReferral",
      landContract.address,
      sandContract.address,
      sandContract.address,
      deployer,
      landSaleBeneficiary,
      merkleRootHash,
      1594321140, // Thursday, 9 July 2020 18:59:00 GMT+00:00
      daiMedianizer.address,
      dai.address,
      backendReferralWallet,
      2000
    );
    if (deployResult.newlyDeployed) {
      log(` - ${landSaleName} deployed at : ${deployResult.address} for gas :  ${deployResult.receipt.gasUsed}`);
    } else {
      log(`reusing ${landSaleName} at ${deployResult.address}`);
    }
    const landsWithProof = [];
    for (const land of saltedLands) {
      land.proof = tree.getProof(calculateLandHash(land));
      landsWithProof.push(land);
    }
    fs.writeFileSync(`./.presale_3_${sector}_proofs_${chainId}.json`, JSON.stringify(landsWithProof, null, "  "));
  }
};
