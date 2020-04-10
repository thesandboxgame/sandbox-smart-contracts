const tap = require('tap');
const {deployments, namedAccounts} = require('@nomiclabs/buidler');
const {getDeployedContract} = require('../../lib');

const {
    landSaleAdmin,
} = namedAccounts;

const {
    tx,
} = require('../utils');

// TODO
// const {
//     runLandSaleTests
// } = require('./landSale_tests');

const {
    runLandSaleEthTests,
} = require('./landSale_eth_tests');

// TODO
// const {
//     runLandSaleDaiTests,
// } = require('./landSale_dai_tests');

function ContractStore(type) {
    this.contractName = 'LandSaleWithReferral';
    this.type = type;
}
ContractStore.prototype.resetContracts = async function () {
    await deployments.run(); // TODO BUIDLER_DEPLOY TAG
    const contracts = {
        LandSale: getDeployedContract('LandPreSale_3'),
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

runLandSaleEthTests('LandPreSale_3', new ContractStore('eth'));
// runLandSaleTests('LandPreSale_3', new ContractStore('sand'));
// runLandSaleDaiTests('LandPreSale_3', new ContractStore('dai'));
