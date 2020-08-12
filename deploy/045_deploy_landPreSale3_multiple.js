const {guard} = require("../lib");
const {BigNumber} = require("ethers");
const {getLands} = require("../data/landPreSale_3_multiple/getLands");

const fs = require("fs");
const {calculateLandHash} = require("../lib/merkleTreeHelper");

module.exports = async ({getChainId, getNamedAccounts, deployments, network}) => {
  const {deploy} = deployments;
  const chainId = BigNumber.from(await getChainId()).toString();

  const {deployer, landSaleBeneficiary, backendReferralWallet} = await getNamedAccounts();

  const sandContract = await deployments.get("Sand");
  const landContract = await deployments.get("Land");

  const daiMedianizer = await deployments.get("DAIMedianizer");
  const dai = await deployments.get("DAI");

  for (let sector = 4; sector < 10; sector++) {
    const {lands, merkleRootHash, saltedLands, tree} = getLands(sector, network.live, chainId);
    const landSaleName = "LandPreSale_3_" + sector;
    await deploy(landSaleName, {
      from: deployer,
      linkedData: lands,
      contract: "LandSaleWithReferral",
      args: [
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
        2000,
      ],
      log: true,
    });

    const landsWithProof = [];
    for (const land of saltedLands) {
      land.proof = tree.getProof(calculateLandHash(land));
      landsWithProof.push(land);
    }
    fs.writeFileSync(`./.presale_3_${sector}_proofs_${chainId}.json`, JSON.stringify(landsWithProof, null, "  "));
  }
};
module.exports.skip = guard(["1", "4", "314159"], "LandPreSale_3_9");
module.exports.tags = ["LandPreSale_3_multiple"];
module.exports.dependencies = ["Sand", "Land", "DAI"];
