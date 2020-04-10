module.exports = async ({getNamedAccounts, deployments}) => {
    const {call, sendTxAndWait, log} = deployments;

    const {
        assetAdmin,
        assetBouncerAdmin,
    } = await getNamedAccounts();

    const assetContract = await deployments.get('Asset');
    if (!assetContract) {
        throw new Error('no ASSET contract deployed');
    }

    let currentAdmin;
    try {
        currentAdmin = await call('Asset', 'getAdmin');
    } catch (e) {

    }
    if (currentAdmin) {
        if (currentAdmin.toLowerCase() !== assetAdmin.toLowerCase()) {
            log('setting Asset Admin');
            await sendTxAndWait({from: currentAdmin, gas: 1000000, skipError: true}, 'Asset', 'changeAdmin', assetAdmin);
        }
    } else {
        log('current Asset impl do not support admin');
    }

    let currentBouncerAdmin;
    try {
        currentBouncerAdmin = await call('Asset', 'getBouncerAdmin');
    } catch (e) {

    }
    if (currentBouncerAdmin) {
        if (currentBouncerAdmin.toLowerCase() !== assetBouncerAdmin.toLowerCase()) {
            log('setting Asset Bouncer Admin');
            await sendTxAndWait({from: currentBouncerAdmin, gas: 1000000, skipError: true}, 'Asset', 'changeBouncerAdmin', assetBouncerAdmin);
        }
    } else {
        log('current Asset impl do not support bouncerAdmin');
    }
};
