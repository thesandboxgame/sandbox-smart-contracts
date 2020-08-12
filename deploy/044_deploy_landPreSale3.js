const {guard} = require("../lib");
const {getLands} = require("../data/landPreSale_3/getLands");

const fs = require("fs");
const {calculateLandHash} = require("../lib/merkleTreeHelper");

module.exports = async ({getChainId, getNamedAccounts, deployments, network}) => {
  const {deploy} = deployments;
  const chainId = await getChainId();

  const {deployer, landSaleBeneficiary, backendReferralWallet} = await getNamedAccounts();

  const sandContract = await deployments.get("Sand");
  const landContract = await deployments.get("Land");

  const daiMedianizer = await deployments.get("DAIMedianizer");
  const dai = await deployments.get("DAI");

  const {lands, merkleRootHash, saltedLands, tree} = getLands(network.live, chainId);

  let expiry = 1586869200; // Tuesday, 14 April 2020 13:00:00 GMT+00:00
  if (chainId == "4") {
    expiry = 1626795341; // Tuesday, 20 July 2021 15:35:41 GMT+00:00
  }

  await deploy("LandPreSale_3", {
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
      expiry,
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
  fs.writeFileSync(`./.presale_3_proofs_${chainId}.json`, JSON.stringify(landsWithProof, null, "  "));
};
module.exports.skip = guard(["1", "4", "314159"], "LandPreSale_3");
module.exports.tags = ["LandPreSale_3"];
module.exports.dependencies = ["Sand", "Land", "DAI"];
