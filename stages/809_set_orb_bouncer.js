const {guard} = require('../lib');

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
    const bouncer = getDeployedContract('ORBBouncer');
    if (!bouncer) {
        throw new Error('no ORBBouncer contract deployed');
    }

    const isBouncer = await call('Asset', 'isBouncer', bouncer.address);
    if (!isBouncer) {
        log('setting ORB Bouncer as bouncer');
        const currentBouncerAdmin = await call('Asset', 'getBouncerAdmin');
        await sendTxAndWaitOnlyFrom(currentBouncerAdmin, {from: deployer, gas: 1000000, skipError: true}, 'Asset', 'setBouncer', bouncer.address, true);
    }
};
module.exports.skip = guard(['1', '4', '314159']); // TODO
