module.exports = async ({namedAccounts, initialRun, getDeployedContract, sendTxAndWaitOnlyFrom, call}) => {
    function log(...args) {
        if (initialRun) {
            console.log(...args);
        }
    }

    const {
        deployer,
        landAdmin,
    } = namedAccounts;

    const land = getDeployedContract('Land');
    if (!land) {
        throw new Error('no ASSET contract deployed');
    }

    let currentAdmin;
    try {
        currentAdmin = await call('Land', 'getAdmin');
    } catch (e) {

    }
    if (currentAdmin) {
        if (currentAdmin.toLowerCase() !== landAdmin.toLowerCase()) {
            log('setting land Admin');
            await sendTxAndWaitOnlyFrom(currentAdmin, {from: deployer, gas: 1000000, skipError: true}, 'Land', 'changeAdmin', landAdmin);
        }
    } else {
        log('current land impl do not support admin');
    }
};
