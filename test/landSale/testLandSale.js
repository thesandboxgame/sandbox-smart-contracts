const tap = require('tap');
const rocketh = require('rocketh');
const {getDeployedContract} = require('../../lib');

const {
    runLandSaleTests
} = require('./landSale_tests');

function ContractStore() {
}
ContractStore.prototype.resetContracts = async function () {
    await rocketh.runStages();
    return {
        LandSale: getDeployedContract('LandSale'),
        Sand: getDeployedContract('Sand'),
        Land: getDeployedContract('Land'),
    };
};

runLandSaleTests('LandSale', new ContractStore());
