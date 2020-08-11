module.exports = async ({/*getNamedAccounts, */ deployments}) => {
  const {read, execute, log} = deployments;

  // const {
  //   assetAuctionFeeCollector,
  // } = await getNamedAccounts();

  const assetAuction = await deployments.get("AssetSignedAuction");

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

  // TODO
  // const fee10000th = 300;
  // const feeEvents = await getEvents(assetAuction, 'FeeSetup(address,uint256)');
  // let lastFeeEvent;
  // if (feeEvents.length > 0) {
  //     lastFeeEvent = feeEvents[feeEvents.length - 1];
  //     // console.log(JSON.stringify(lastFeeEvent));
  // }
  // if (!lastFeeEvent || !(lastFeeEvent.args || lastFeeEvent.values)[1].eq(fee10000th)) {
  //     log('set AssetSignedAuction\'s fee to 3%');
  //     const currentAssetAuctionAdmin = await read('AssetSignedAuction', 'getAdmin');
  //     await execute('AssetSignedAuction', {from: currentAssetAuctionAdmin, skipUnknownSigner: true}, 'setFee', assetAuctionFeeCollector, fee10000th);
  // } else {
  //     log('AssetSignedAuction\'s fee is already 3%');
  // }
};
module.exports.dependencies = ["Sand", "AssetSignedAuction", "Asset"];
