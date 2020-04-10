module.exports = async ({namedAccounts, deployments}) => {
    const {call, sendTxAndWait, log} = deployments;

    const {
        landAdmin,
    } = namedAccounts;

    const land = await deployments.get('Land');
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
            await sendTxAndWait({from: currentAdmin, gas: 1000000, skipError: true}, 'Land', 'changeAdmin', landAdmin);
        }
    } else {
        log('current land impl do not support admin');
    }
};
