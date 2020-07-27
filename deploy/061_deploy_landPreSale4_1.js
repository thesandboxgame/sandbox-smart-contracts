const {guard} = require("../lib");
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

  const {lands, merkleRootHash} = getLands(network.live, chainId);

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
      2591016400, // TODO
      daiMedianizer.address,
      dai.address,
      backendReferralWallet,
      2000,
      "0x0000000000000000000000000000000000000000", // estateContract.address
      assetContract.address,
    ],
    log: true,
  });
};
module.exports.skip = guard(["1", "4", "314159"]); // TODO , 'LandPreSale_4_1');
