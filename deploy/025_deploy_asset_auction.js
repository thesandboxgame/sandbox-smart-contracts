const {guard} = require("../lib");

module.exports = async ({getNamedAccounts, deployments}) => {
  const {deploy} = deployments;

  const {deployer, assetAuctionAdmin, assetAuctionFeeCollector} = await getNamedAccounts();

  const assetAuctionFee10000th = 0; // 5000; // 5%

  const asset = await deployments.get("Asset");
  const sandContract = await deployments.get("Sand");

  await deploy("AssetSignedAuction", {
    from: deployer,
    args: [asset.address, assetAuctionAdmin, sandContract.address, assetAuctionFeeCollector, assetAuctionFee10000th],
    log: true,
  });
};
module.exports.skip = guard(["1", "4", "314159"], "AssetSignedAuction");
module.exports.tags = ["AssetSignedAuction"];
module.exports.dependencies = ["Asset", "Sand"];
