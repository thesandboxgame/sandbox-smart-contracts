const {guard} = require("../lib");
const {getLands} = require("../data/landPreSale_4_1/getLands");

module.exports = async ({getChainId, getNamedAccounts, deployments, network}) => {
  const {deploy} = deployments;
  const chainId = await getChainId();

  const {deployer, landSaleBeneficiary, backendReferralWallet, landSaleFeeRecipient} = await getNamedAccounts();

  const sandContract = await deployments.get("Sand");
  const landContract = await deployments.get("Land");
  const estateContract = await deployments.get("Estate");
  const assetContract = await deployments.get("Asset");

  const {lands, merkleRootHash} = getLands(network.live, chainId);

  await deploy("LandPreSale_5", {
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
      landSaleFeeRecipient, // TODO FeeDistributor for 5% fee
    ],
    log: true,
  });
};
module.exports.skip = guard(["1", "4", "314159"]); // TODO , 'LandPreSale_5');
module.exports.tags = ["LandPreSale_5"];
module.exports.dependencies = ["Sand", "Land", "DAI", "Asset", "Estate"];
