const {guard} = require("../lib");
const {getLands} = require("../data/landPreSale_1/getLands");

module.exports = async ({getChainId, getNamedAccounts, deployments, network}) => {
  const {deploy} = deployments;
  const chainId = await getChainId();

  const {deployer, landSaleAdmin, landSaleBeneficiary} = await getNamedAccounts();

  const sandContract = await deployments.get("Sand");
  const landContract = await deployments.get("Land");

  const daiMedianizer = await deployments.get("DAIMedianizer");
  const dai = await deployments.get("DAI");

  const {lands, merkleRootHash} = getLands(network.live, chainId);

  await deploy("LandPreSale_1", {
    from: deployer,
    linkedData: lands,
    contract: "LandSaleWithETHAndDAI",
    args: [
      landContract.address,
      sandContract.address,
      sandContract.address,
      landSaleAdmin,
      landSaleBeneficiary,
      merkleRootHash,
      1576753200, // This is Thursday, 19 December 2019 11:00:00 GMT+00:00 // Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 days
      daiMedianizer.address,
      dai.address,
    ],
    log: true,
  });
};
module.exports.skip = guard(["1", "4", "314159"], "LandPreSale_1");
module.exports.tags = ["LandPreSale_1"];
module.exports.dependencies = ["Sand", "Land", "DAI"];
