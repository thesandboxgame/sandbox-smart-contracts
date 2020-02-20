module.exports = async ({namedAccounts, initialRun, getDeployedContract, call, sendTxAndWaitOnlyFrom}) => {
    function log(...args) {
        if (initialRun) {
            console.log(...args);
        }
    }

    const {
        deployer,
    } = namedAccounts;

    const asset = getDeployedContract('Asset');
    if (!asset) {
        throw new Error('no Asset contract deployed');
    }
    const genesisBouncer = getDeployedContract('GenesisBouncer');
    if (!genesisBouncer) {
        throw new Error('no GenesisBouncer contract deployed');
    }

    const isBouncer = await call('Asset', 'isBouncer', genesisBouncer.address);
    if (!isBouncer) {
        log('setting genesis bouncer as Asset bouncer');
        const currentBouncerAdmin = await call('Asset', 'getBouncerAdmin');
        await sendTxAndWaitOnlyFrom(currentBouncerAdmin, {from: deployer, gas: 1000000, skipError: true}, 'Asset', 'setBouncer', genesisBouncer.address, true);
    }
};
