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
        landAdmin,
    } = namedAccounts;

    const land = getDeployedContract('Land');
    if (!land) {
        throw new Error('no ASSET contract deployed');
    }

    let currentAdmin;
    try {
        currentAdmin = await call(land, 'getAdmin');
    } catch (e) {

    }
    if (currentAdmin) {
        if (currentAdmin.toLowerCase() !== landAdmin.toLowerCase()) {
            log('setting land Admin');
            await txOnlyFrom(currentAdmin, {from: deployer, gas: 1000000}, land, 'changeAdmin', landAdmin);
        }
    } else {
        log('current land impl do not support admin');
    }
};
