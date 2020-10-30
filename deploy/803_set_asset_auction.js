module.exports = async ({getNamedAccounts, deployments, ethers}) => {
  const {read, execute, log} = deployments;

  const {assetAuctionFeeCollector} = await getNamedAccounts();

  const assetAuction = await ethers.getContract("AssetSignedAuction");

  const isSandSuperOperator = await read("Sand", "isSuperOperator", assetAuction.address);
  if (!isSandSuperOperator) {
    log("setting AssetSignedAuction as super operator for Sand");
    const currentSandAdmin = await read("Sand", "getAdmin");
    await execute(
      "Sand",
      {from: currentSandAdmin, skipUnknownSigner: true},
      "setSuperOperator",
      assetAuction.address,
      true
    );
  }

  const isAssetSuperOperator = await read("Asset", "isSuperOperator", assetAuction.address);
  if (!isAssetSuperOperator) {
    log("setting AssetSignedAuction as super operator for Asset");
    const currentAssetAdmin = await read("Asset", "getAdmin");
    await execute(
      "Asset",
      {from: currentAssetAdmin, skipUnknownSigner: true},
      "setSuperOperator",
      assetAuction.address,
      true
    );
  }

  const fee10000th = 500;
  const feeEvents = await assetAuction.queryFilter("FeeSetup");
  let lastFeeEvent;
  if (feeEvents.length > 0) {
    lastFeeEvent = feeEvents[feeEvents.length - 1];
    // console.log(JSON.stringify(lastFeeEvent));
  }
  if (!lastFeeEvent || !(lastFeeEvent.args || lastFeeEvent.values)[1].eq(fee10000th)) {
    log("set AssetSignedAuction's fee to 5%");
    const currentAssetAuctionAdmin = await read("AssetSignedAuction", "getAdmin");
    await execute(
      "AssetSignedAuction",
      {from: currentAssetAuctionAdmin, skipUnknownSigner: true},
      "setFee",
      assetAuctionFeeCollector,
      fee10000th
    );
  }
};
module.exports.dependencies = ["Sand", "AssetSignedAuction", "Asset"];
