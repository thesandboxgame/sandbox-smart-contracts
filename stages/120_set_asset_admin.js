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
        assetAdmin,
        assetBouncerAdmin,
    } = namedAccounts;

    const assetContract = getDeployedContract('Asset');
    if (!assetContract) {
        throw new Error('no ASSET contract deployed');
    }

    let currentAdmin;
    try {
        currentAdmin = await call(assetContract, 'getAdmin');
    } catch (e) {

    }
    if (currentAdmin) {
        if (currentAdmin.toLowerCase() !== assetAdmin.toLowerCase()) {
            if (currentAdmin.toLowerCase() !== deployer.toLowerCase()) {
                throw new Error('deployer ' + deployer + ' has no right to change admin for Asset ');
            } else {
                log('setting asset admin', currentAdmin, assetAdmin);
                await tx({from: deployer, gas: 1000000}, assetContract, 'changeAdmin', assetAdmin);
            }
        }
    } else {
        log('current Asset impl do not support admin');
    }

    let currentBouncerAdmin;
    try {
        currentBouncerAdmin = await call(assetContract, 'getBouncerAdmin');
    } catch (e) {

    }
    if (currentBouncerAdmin) {
        if (currentBouncerAdmin.toLowerCase() !== assetBouncerAdmin.toLowerCase()) {
            if (currentBouncerAdmin.toLowerCase() !== deployer.toLowerCase()) {
                throw new Error('deployer ' + deployer + ' has no right to change bouncer admin for Asset ');
            } else {
                log('setting asset bouncer admin', currentBouncerAdmin, assetBouncerAdmin);
                await tx({from: deployer, gas: 1000000}, assetContract, 'changeBouncerAdmin', assetBouncerAdmin);
            }
        }
    } else {
        log('current Asset impl do not support bouncerAdmin');
    }
};
