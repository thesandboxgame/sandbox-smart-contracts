const rocketh = require('rocketh');
const {getDeployedContract} = require('../../lib');
const {runBundleSandSaleTests} = require('./bundleSandSale_tests');

function ContractStore() {
}

ContractStore.prototype.resetContracts = async function () {
    await rocketh.runStages();

    return {
        Sand: getDeployedContract('Sand'),
        Asset: getDeployedContract('Asset'),
        AssetBouncer: getDeployedContract('ORBBouncer'),
        BundleSandSale: getDeployedContract('BundleSandSale'),
        CommonMinter: getDeployedContract('CommonMinter'),
        GenesisBouncer: getDeployedContract('GenesisBouncer'),
        FakeDai: getDeployedContract('DAI'),
    };
};

async function deployBundleSandSale() {
    await rocketh.runStages();
    return getDeployedContract('BundleSandSale');
}

runBundleSandSaleTests('BundleSandSale', new ContractStore());
