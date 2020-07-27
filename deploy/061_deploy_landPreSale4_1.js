const {guard} = require("../lib");
const fs = require("fs");
const {calculateLandHash} = require("../lib/merkleTreeHelper");
const {getLands} = require("../data/LandPreSale_4_1/getLands");

module.exports = async ({getChainId, getNamedAccounts, deployments, network}) => {
  const {deploy} = deployments;
  const chainId = await getChainId();

  const {deployer, landSaleBeneficiary, backendReferralWallet} = await getNamedAccounts();

  const sandContract = await deployments.get("Sand");
  const landContract = await deployments.get("Land");
  const assetContract = await deployments.get("Asset");

  const daiMedianizer = await deployments.get("DAIMedianizer");
  const dai = await deployments.get("DAI");

  const {lands, merkleRootHash, saltedLands, tree} = getLands(network.live, chainId);

  await deploy("LandPreSale_4_1", {
    from: deployer,
    gas: 3000000,
    linkedData: lands,
    contract: "EstateSale",
    args: [
      landContract.address,
      sandContract.address,
      sandContract.address,
      deployer,
      landSaleBeneficiary,
      merkleRootHash,
      1597755600, // Tuesday, 18 August 2020 13:00:00 GMT+00:00
      daiMedianizer.address,
      dai.address,
      backendReferralWallet,
      2000,
      "0x0000000000000000000000000000000000000000",
      assetContract.address,
    ],
    log: true,
  });

  const landsWithProof = [];
  for (const land of saltedLands) {
    land.proof = tree.getProof(calculateLandHash(land));
    landsWithProof.push(land);
  }
  fs.writeFileSync(`./.presale_4_1_proofs_${chainId}.json`, JSON.stringify(landsWithProof, null, "  "));
};
module.exports.skip = async () => true; // guard(["1", "4", "314159"], "LandPreSale_4_1"); // TODO
