const Web3 = require('web3');
const rocketh = require('rocketh');
const {
    txOnlyFrom,
    getDeployedContract,
    call,
    tx,
} = require('rocketh-web3')(rocketh, Web3);
// const {guard} = require('../lib');

module.exports = async ({namedAccounts, initialRun, isDeploymentChainId}) => {
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

    const isSandSuperOperator = await call(sand, 'isSuperOperator', assetAuction.options.address);
    if (!isSandSuperOperator) {
        log('setting AssetSignedAuction as super operator for Sand');
        const currentSandAdmin = await call(sand, 'getAdmin');
        await txOnlyFrom(currentSandAdmin, {from: deployer, gas: 100000, skipError: true}, sand, 'setSuperOperator', assetAuction.options.address, true);
    }

    const isAssetSuperOperator = await call(asset, 'isSuperOperator', assetAuction.options.address);
    if (!isAssetSuperOperator) {
        log('setting AssetSignedAuction as super operator for Asset');
        const currentAssetAdmin = await call(asset, 'getAdmin');
        await txOnlyFrom(currentAssetAdmin, {from: deployer, gas: 100000, skipError: true}, asset, 'setSuperOperator', assetAuction.options.address, true);
    }

    const fee10000th = 300;
    const feeEvents = await rocketh.getEvents({address: assetAuction.options.address, abi: assetAuction.options.jsonInterface}, 'FeeSetup(address,uint256)');
    let lastFeeEvent;
    if (feeEvents.length > 0) {
        lastFeeEvent = feeEvents[feeEvents.length - 1];
        // console.log(JSON.stringify(lastFeeEvent));
    }
    if (!lastFeeEvent || !lastFeeEvent.values[1].eq(fee10000th)) {
        log('set AssetSignedAuction\'s fee to 3%');
        const currentAssetAuctionAdmin = await call(assetAuction, 'getAdmin');
        let executor = deployer;
        if (!isDeploymentChainId) {
            executor = currentAssetAuctionAdmin;
        }
        await txOnlyFrom(currentAssetAuctionAdmin, {from: executor, gas: 100000, skipError: true}, assetAuction, 'setFee', assetAuctionFeeCollector, fee10000th);
    } else {
        log('AssetSignedAuction\'s fee is already 3%');
    }
};
