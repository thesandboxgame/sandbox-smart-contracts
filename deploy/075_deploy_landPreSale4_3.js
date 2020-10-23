const {guard} = require("../lib");
const {getLands} = require("../data/LandPreSale_4_3/getLands");

const fs = require("fs");
const {calculateLandHash} = require("../lib/merkleTreeHelper");

module.exports = async ({getChainId, getNamedAccounts, deployments, network}) => {
  const {deploy} = deployments;
  const chainId = await getChainId();

  const {deployer, landSaleBeneficiary, backendReferralWallet, landSaleFeeRecipient} = await getNamedAccounts();

  const sandContract = await deployments.get("Sand");
  const landContract = await deployments.get("Land");
  const assetContract = await deployments.get("Asset");

  const deadline = 1609459200; // TODO

  const {lands, merkleRootHash, saltedLands, tree} = getLands(15, network.live, chainId);

  await deploy("LandPreSale_4_3", {
    from: deployer,
    linkedData: lands,
    contract: "EstateSaleWithFee",
    args: [
      landContract.address,
      sandContract.address,
      sandContract.address,
      deployer,
      landSaleBeneficiary,
      merkleRootHash,
      deadline,
      backendReferralWallet,
      2000,
      "0x0000000000000000000000000000000000000000",
      assetContract.address,
      landSaleFeeRecipient,
    ],
    log: true,
  });

  const landsWithProof = [];
  for (const land of saltedLands) {
    land.proof = tree.getProof(calculateLandHash(land));
    landsWithProof.push(land);
  }
  fs.writeFileSync(`./.presale_4_3_proofs_${chainId}.json`, JSON.stringify(landsWithProof, null, "  "));
};
module.exports.skip = guard(["1", "4", "314159"], "LandPreSale_4_3");
module.exports.tags = ["LandPreSale_4_3"];
module.exports.dependencies = ["Sand", "Land", "Asset"];
