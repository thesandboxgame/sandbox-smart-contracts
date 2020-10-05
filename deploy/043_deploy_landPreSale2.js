const {guard} = require("../lib");
const {getLands} = require("../data/landPreSale_2/getLands");

module.exports = async ({getChainId, getNamedAccounts, deployments, network}) => {
  const {deploy} = deployments;
  const chainId = await getChainId();

  const {deployer, landSaleBeneficiary} = await getNamedAccounts();

  const sandContract = await deployments.get("Sand");
  const landContract = await deployments.get("Land");

  const daiMedianizer = await deployments.get("DAIMedianizer");
  const dai = await deployments.get("DAI");

  const {lands, merkleRootHash} = getLands(network.live, chainId);

  await deploy("LandPreSale_2", {
    from: deployer,
    linkedData: lands,
    contract: "LandSaleWithETHAndDAI",
    args: [
      landContract.address,
      sandContract.address,
      sandContract.address,
      deployer,
      landSaleBeneficiary,
      merkleRootHash,
      1582718400, // 1582718400 converts to Tuesday February 26, 2020 09:00:00 (am) in time zone America/Argentina/Buenos Aires (-03)
      daiMedianizer.address,
      dai.address,
    ],
    log: true,
  });
};
module.exports.skip = guard(["1", "4", "314159"], "LandPreSale_2");
module.exports.tags = ["LandPreSale_2"];
module.exports.dependencies = ["Sand", "Land", "DAI"];
