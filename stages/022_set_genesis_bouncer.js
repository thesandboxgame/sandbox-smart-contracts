const Web3 = require('web3');
const rocketh = require('rocketh');
const {
    tx,
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

    const asset = getDeployedContract('Asset');
    if (!asset) {
        throw new Error('no Asset contract deployed');
    }
    const genesisBouncer = getDeployedContract('GenesisBouncer');
    if (!genesisBouncer) {
        throw new Error('no GenesisBouncer contract deployed');
    }

    const isBouncer = await call(asset, 'isBouncer', genesisBouncer.options.address);
    if (!isBouncer) {
        log('setting genesis bouncer as Asset bouncer');
        const currentBouncerAdmin = await call(asset, 'getBouncerAdmin');
        if (currentBouncerAdmin.toLowerCase() !== deployer.toLowerCase()) {
            throw new Error('deployer ' + deployer + ' has no right to set bouncer');
        } else {
            await tx({from: deployer, gas: 1000000}, asset, 'setBouncer', genesisBouncer.options.address, true);
        }
    }
};
