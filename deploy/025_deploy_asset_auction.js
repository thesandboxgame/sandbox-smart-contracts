const {guard} = require('../lib');

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deployIfDifferent, log} = deployments;

    const {
        deployer,
        assetAuctionAdmin,
        assetAuctionFeeCollector
    } = await getNamedAccounts();

    const assetAuctionFee10000th = 0; // 5000; // 5%

    const asset = await deployments.get('Asset');
    if (!asset) {
        throw new Error('no Asset contract deployed');
    }
    const sandContract = await deployments.get('Sand');
    if (!sandContract) {
        throw new Error('no SAND contract deployed');
    }

    const deployResult = await deployIfDifferent(['data'],
        'AssetSignedAuction',
        {from: deployer, gas: 4000000},
        'AssetSignedAuction',
        asset.address,
        assetAuctionAdmin,
        sandContract.address,
        assetAuctionFeeCollector,
        assetAuctionFee10000th
    );
    if (deployResult.newlyDeployed) {
        log(' - AssetSignedAuction deployed at : ' + deployResult.contract.address + ' for gas : ' + deployResult.receipt.gasUsed);
    } else {
        log('reusing AssetSignedAuction at ' + deployResult.contract.address);
    }
};
module.exports.skip = guard(['1', '4', '314159'], 'AssetSignedAuction');
