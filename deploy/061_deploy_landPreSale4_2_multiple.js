const {guard} = require("../lib");
const {getLands} = require("../data/LandPreSale_4_2/getLands");

const fs = require("fs");
const {calculateLandHash} = require("../lib/merkleTreeHelper");

module.exports = async ({getChainId, getNamedAccounts, deployments, network}) => {
  const {deploy} = deployments;
  const chainId = await getChainId();

  const {deployer, landSaleBeneficiary, backendReferralWallet, others} = await getNamedAccounts();

  const sandContract = await deployments.get("Sand");
  const landContract = await deployments.get("Land");
  const assetContract = await deployments.get("Asset");

  for (let sector = 1; sector < 10; sector++) {
    const {lands, merkleRootHash, saltedLands, tree} = getLands(sector, network.live, chainId);
    const landSaleName = "LandPreSale_4_2_" + sector;

    await deploy(landSaleName, {
      from: deployer,
      gas: 3000000,
      linkedData: lands,
      contract: "EstateSaleWithFee",
      args: [
        landContract.address,
        sandContract.address,
        sandContract.address,
        deployer,
        landSaleBeneficiary,
        merkleRootHash,
        2591016400, // TODO
        backendReferralWallet,
        2000,
        estateContract.address,
        assetContract.address,
        others[5], // TODO FeeDistributor for 5% fee
      ],
      log: true,
    });

    const landsWithProof = [];
    for (const land of saltedLands) {
      land.proof = tree.getProof(calculateLandHash(land));
      landsWithProof.push(land);
    }
    fs.writeFileSync(`./.presale_4_2_${sector}_proofs_${chainId}.json`, JSON.stringify(landsWithProof, null, "  "));
  }
};
module.exports.skip = guard(["1", "4", "314159"]); // TODO , 'LandPreSale_4_2_1');
module.exports.tags = ["LandPreSale_4_2_multiple"];
module.exports.dependencies = ["Sand", "Land", "DAI", "Asset", "Estate"];
