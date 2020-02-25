module.exports = async ({namedAccounts, initialRun, call, getDeployedContract, sendTxAndWaitOnlyFrom}) => {
    function log(...args) {
        if (initialRun) {
            console.log(...args);
        }
    }

    const {
        deployer,
    } = namedAccounts;

    const land = getDeployedContract('Land');
    if (!land) {
        throw new Error('no Land contract deployed');
    }

    const estate = getDeployedContract('Estate');
    if (!estate) {
        throw new Error('no Estate contract deployed');
    }

    const isSuperOperator = await call('Land', 'isSuperOperator', estate.address);
    if (!isSuperOperator) {
        log('setting NativeMetaTransactionProcessor as super operator');
        const currentLandAdmin = await call('Land', 'getAdmin');
        await sendTxAndWaitOnlyFrom(currentLandAdmin, {from: deployer, gas: 100000, skipError: true}, 'Land', 'setSuperOperator', estate.address, true);
    }
};
