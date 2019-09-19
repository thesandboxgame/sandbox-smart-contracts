const Web3 = require('web3');
const rocketh = require('rocketh');
const {
    tx,
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
    const metaTxProcessor = getDeployedContract('NativeMetaTransactionProcessor');
    if (!metaTxProcessor) {
        throw new Error('no NativeMetaTransactionProcessor contract deployed');
    }

    const isSuperOperator = await call(sand, 'isSuperOperator', metaTxProcessor.options.address);
    if (!isSuperOperator) {
        log('setting NativeMetaTransactionProcessor as super operator');
        await tx({from: deployer, gas: 100000}, sand, 'setSuperOperator', metaTxProcessor.options.address, true);
    }

    const isExecutionOperator = await call(sand, 'isExecutionOperator', metaTxProcessor.options.address);
    if (!isExecutionOperator) {
        log('setting NativeMetaTransactionProcessor as execution operator');
        await tx({from: deployer, gas: 100000}, sand, 'setExecutionOperator', metaTxProcessor.options.address, true);
    }
};
