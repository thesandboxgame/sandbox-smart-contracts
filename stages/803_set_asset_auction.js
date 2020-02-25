module.exports = async ({namedAccounts, initialRun, isDeploymentChainId, getDeployedContract, call, sendTxAndWaitOnlyFrom, getEvents}) => {
    function log(...args) {
        if (initialRun) {
            console.log(...args);
        }
    }

    const {
        deployer,
        assetAuctionFeeCollector,
    } = namedAccounts;

    const sand = getDeployedContract('Sand');
    if (!sand) {
        throw new Error('no Sand contract deployed');
    }
    const asset = getDeployedContract('Asset');
    if (!asset) {
        throw new Error('no Asset contract deployed');
    }
    const assetAuction = getDeployedContract('AssetSignedAuction');
    if (!assetAuction) {
        throw new Error('no AssetSignedAuction contract deployed');
    }

    const isSandSuperOperator = await call('Sand', 'isSuperOperator', assetAuction.address);
    if (!isSandSuperOperator) {
        log('setting AssetSignedAuction as super operator for Sand');
        const currentSandAdmin = await call('Sand', 'getAdmin');
        await sendTxAndWaitOnlyFrom(currentSandAdmin, {from: deployer, gas: 100000, skipError: true}, 'Sand', 'setSuperOperator', assetAuction.address, true);
    }

    const isAssetSuperOperator = await call('Asset', 'isSuperOperator', assetAuction.address);
    if (!isAssetSuperOperator) {
        log('setting AssetSignedAuction as super operator for Asset');
        const currentAssetAdmin = await call('Asset', 'getAdmin');
        await sendTxAndWaitOnlyFrom(currentAssetAdmin, {from: deployer, gas: 100000, skipError: true}, 'Asset', 'setSuperOperator', assetAuction.address, true);
    }

    const fee10000th = 300;
    const feeEvents = await getEvents(assetAuction, 'FeeSetup(address,uint256)');
    let lastFeeEvent;
    if (feeEvents.length > 0) {
        lastFeeEvent = feeEvents[feeEvents.length - 1];
        // console.log(JSON.stringify(lastFeeEvent));
    }
    if (!lastFeeEvent || !(lastFeeEvent.args || lastFeeEvent.values)[1].eq(fee10000th)) {
        log('set AssetSignedAuction\'s fee to 3%');
        const currentAssetAuctionAdmin = await call('AssetSignedAuction', 'getAdmin');
        let executor = deployer;
        if (!isDeploymentChainId) {
            executor = currentAssetAuctionAdmin;
        }
        await sendTxAndWaitOnlyFrom(currentAssetAuctionAdmin, {from: executor, gas: 100000, skipError: true}, 'AssetSignedAuction', 'setFee', assetAuctionFeeCollector, fee10000th);
    } else {
        log('AssetSignedAuction\'s fee is already 3%');
    }
};
