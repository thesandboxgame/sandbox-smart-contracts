module.exports = async ({getNamedAccounts, deployments}) => {
    const {call, sendTxAndWait, log} = deployments;

    const {
        assetAuctionFeeCollector,
    } = await getNamedAccounts();

    const sand = await deployments.get('Sand');
    if (!sand) {
        throw new Error('no Sand contract deployed');
    }
    const asset = await deployments.get('Asset');
    if (!asset) {
        throw new Error('no Asset contract deployed');
    }
    const assetAuction = await deployments.get('AssetSignedAuction');
    if (!assetAuction) {
        throw new Error('no AssetSignedAuction contract deployed');
    }

    const isSandSuperOperator = await call('Sand', 'isSuperOperator', assetAuction.address);
    if (!isSandSuperOperator) {
        log('setting AssetSignedAuction as super operator for Sand');
        const currentSandAdmin = await call('Sand', 'getAdmin');
        await sendTxAndWait({from: currentSandAdmin, gas: 100000, skipError: true}, 'Sand', 'setSuperOperator', assetAuction.address, true);
    }

    const isAssetSuperOperator = await call('Asset', 'isSuperOperator', assetAuction.address);
    if (!isAssetSuperOperator) {
        log('setting AssetSignedAuction as super operator for Asset');
        const currentAssetAdmin = await call('Asset', 'getAdmin');
        await sendTxAndWait({from: currentAssetAdmin, gas: 100000, skipError: true}, 'Asset', 'setSuperOperator', assetAuction.address, true);
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
    //     const currentAssetAuctionAdmin = await call('AssetSignedAuction', 'getAdmin');
    //     await sendTxAndWait({from: currentAssetAuctionAdmin, gas: 100000, skipError: true}, 'AssetSignedAuction', 'setFee', assetAuctionFeeCollector, fee10000th);
    // } else {
    //     log('AssetSignedAuction\'s fee is already 3%');
    // }
};
