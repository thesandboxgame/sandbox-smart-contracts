module.exports = async ({namedAccounts, initialRun, chainId, sendTxAndWaitOnlyFrom, getDeployedContract, call}) => {
    function log(...args) {
        if (initialRun) {
            console.log(...args);
        }
    }

    const {
        deployer,
        sandAdmin,
        sandExecutionAdmin,
    } = namedAccounts;

    const sandContract = getDeployedContract('Sand');
    if (!sandContract) {
        throw new Error('no SAND contract deployed');
    }
    const currentAdmin = await call('Sand', 'getAdmin');
    if (currentAdmin.toLowerCase() !== sandAdmin.toLowerCase()) {
        log('setting Sand Admin');
        await sendTxAndWaitOnlyFrom(currentAdmin, {from: deployer, gas: 1000000, skipError: true}, 'Sand', 'changeAdmin', sandAdmin);
    }

    if (chainId == '4') {
        return; // TODO setup SAND on rinkeby
    }
    const currentExecutionAdmin = await call('Sand', 'getExecutionAdmin');
    if (currentExecutionAdmin.toLowerCase() !== sandExecutionAdmin.toLowerCase()) {
        log('setting Sand Execution Admin');
        await sendTxAndWaitOnlyFrom(currentExecutionAdmin, {from: deployer, gas: 1000000, skipError: true}, 'Sand', 'changeExecutionAdmin', sandExecutionAdmin);
    }
};
