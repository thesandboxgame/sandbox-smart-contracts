const Web3 = require('web3');
const rocketh = require('rocketh');
const {
    txOnlyFrom,
    getDeployedContract,
    call,
} = require('rocketh-web3')(rocketh, Web3);
const {guard} = require('../lib');

module.exports = async ({namedAccounts, initialRun}) => {
    function log(...args) {
        if (initialRun) {
            console.log(...args);
        }
    }

    const {
        deployer,
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
        await txOnlyFrom(currentSandAdmin, {from: deployer, gas: 100000}, sand, 'setSuperOperator', assetAuction.options.address, true);
    }

    const isAssetSuperOperator = await call(asset, 'isSuperOperator', assetAuction.options.address);
    if (!isAssetSuperOperator) {
        log('setting AssetSignedAuction as super operator for Asset');
        const currentAssetAdmin = await call(asset, 'getAdmin');
        await txOnlyFrom(currentAssetAdmin, {from: deployer, gas: 100000}, asset, 'setSuperOperator', assetAuction.options.address, true);
    }
};
module.exports.skip = guard(['1', '4']); // TODO
