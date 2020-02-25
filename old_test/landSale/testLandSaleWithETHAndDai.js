const tap = require('tap');
const rocketh = require('rocketh');
const {getDeployedContract} = require('../../lib');

const {
    landSaleAdmin
} = rocketh.namedAccounts;

const {
    tx
} = require('../utils');

const {
    runLandSaleTests
} = require('./landSale_tests');

const {
    runLandSaleEthTests,
} = require('./landSale_eth_tests');

const {
    runLandSaleDaiTests,
} = require('./landSale_dai_tests');

const contractName = 'LandPreSale_2';
function ContractStore(type) {
    this.contractName = contractName;
    this.contractCodeName = 'LandSaleWithETHAndDAI';
    this.type = type;
}
ContractStore.prototype.resetContracts = async function () {
    await rocketh.runStages();
    const contracts = {
        LandSale: getDeployedContract(this.contractName),
        Sand: getDeployedContract('Sand'),
        Land: getDeployedContract('Land'),
        FakeDAI: getDeployedContract('DAI'),
    };
    if (this.type === 'eth') {
        await tx(contracts.LandSale, 'setETHEnabled', {from: landSaleAdmin, gas: 100000}, true);
    } else if (this.type === 'sand') {
        await tx(contracts.LandSale, 'setSANDEnabled', {from: landSaleAdmin, gas: 100000}, true);
    } else if (this.type === 'dai') {
        await tx(contracts.LandSale, 'setDAIEnabled', {from: landSaleAdmin, gas: 100000}, true);
    }
    return contracts;
};

runLandSaleEthTests(contractName, new ContractStore('eth'));
runLandSaleTests(contractName, new ContractStore('sand'));
runLandSaleDaiTests(contractName, new ContractStore('dai'));
