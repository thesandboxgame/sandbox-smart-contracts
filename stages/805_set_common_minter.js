const Web3 = require('web3');
const rocketh = require('rocketh');
const {
    txOnlyFrom,
    getDeployedContract,
    call,
} = require('rocketh-web3')(rocketh, Web3);
// const {guard} = require('../lib');

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
    const bouncer = getDeployedContract('CommonMinter');
    if (!bouncer) {
        throw new Error('no CommonMinter contract deployed');
    }

    const isBouncer = await call(asset, 'isBouncer', bouncer.options.address);
    if (!isBouncer) {
        log('setting CommonMinter as bouncer');
        const currentBouncerAdmin = await call(asset, 'getBouncerAdmin');
        await txOnlyFrom(currentBouncerAdmin, {from: deployer, gas: 1000000}, asset, 'setBouncer', bouncer.options.address, true);
    }

    const isSuperOperator = await call(sand, 'isSuperOperator', bouncer.options.address);
    if (!isSuperOperator) {
        log('setting NativeMetaTransactionProcessor as super operator');
        const currentSandAdmin = await call(sand, 'getAdmin');
        await txOnlyFrom(currentSandAdmin, {from: deployer, gas: 100000}, sand, 'setSuperOperator', bouncer.options.address, true);
    }
};
