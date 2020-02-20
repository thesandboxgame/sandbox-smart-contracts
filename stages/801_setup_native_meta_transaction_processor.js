module.exports = async ({namedAccounts, initialRun, sendTxAndWaitOnlyFrom, getDeployedContract, call}) => {
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

    const currentSandAdmin = await call('Sand', 'getAdmin');

    const isSuperOperator = await call('Sand', 'isSuperOperator', metaTxProcessor.address);
    if (!isSuperOperator) {
        log('setting NativeMetaTransactionProcessor as super operator');
        await sendTxAndWaitOnlyFrom(currentSandAdmin, {from: deployer, gas: 100000, skipError: true}, 'Sand', 'setSuperOperator', metaTxProcessor.address, true);
    }

    const currentExecutionSandAdmin = await call('Sand', 'getExecutionAdmin');
    const isExecutionOperator = await call('Sand', 'isExecutionOperator', metaTxProcessor.address);
    if (!isExecutionOperator) {
        log('setting NativeMetaTransactionProcessor as execution operator');
        await sendTxAndWaitOnlyFrom(currentExecutionSandAdmin, {from: deployer, gas: 100000, skipError: true}, 'Sand', 'setExecutionOperator', metaTxProcessor.address, true);
    }
};
