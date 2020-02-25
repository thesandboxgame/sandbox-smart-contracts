const tap = require('tap');
const rocketh = require('rocketh');
const {getDeployedContract} = require('../../lib');

const {
    runLandSaleTests
} = require('./landSale_tests');

const {
    runLandSaleEthTests,
} = require('./landSale_eth_tests');

const {
    runLandSaleDaiTests,
} = require('./landSale_dai_tests');

const contractName = 'LandPreSale_1';
function ContractStore() {
    this.contractName = contractName;
    this.contractCodeName = 'LandSaleWithETHAndDAI';
}
ContractStore.prototype.resetContracts = async function () {
    await rocketh.runStages();
    return {
        LandSale: getDeployedContract(this.contractName),
        Sand: getDeployedContract('Sand'),
        Land: getDeployedContract('Land'),
        FakeDAI: getDeployedContract('DAI'),
    };
};

runLandSaleTests(contractName, new ContractStore());
