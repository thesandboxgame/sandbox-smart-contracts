const Web3 = require('web3');
const rocketh = require('rocketh');
const {
    txOnlyFrom,
    getDeployedContract,
    call,
} = require('rocketh-web3')(rocketh, Web3);

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

    const currentSandAdmin = await call(sand, 'getAdmin');

    const isSuperOperator = await call(sand, 'isSuperOperator', metaTxProcessor.options.address);
    if (!isSuperOperator) {
        log('setting NativeMetaTransactionProcessor as super operator');
        await txOnlyFrom(currentSandAdmin, {from: deployer, gas: 100000}, sand, 'setSuperOperator', metaTxProcessor.options.address, true);
    }

    const currentExecutionSandAdmin = await call(sand, 'getExecutionAdmin');
    const isExecutionOperator = await call(sand, 'isExecutionOperator', metaTxProcessor.options.address);
    if (!isExecutionOperator) {
        log('setting NativeMetaTransactionProcessor as execution operator');
        await txOnlyFrom(currentExecutionSandAdmin, {from: deployer, gas: 100000}, sand, 'setExecutionOperator', metaTxProcessor.options.address, true);
    }
};
