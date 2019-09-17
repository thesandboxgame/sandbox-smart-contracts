const Web3 = require('web3');
const rocketh = require('rocketh');
const {
    tx,
    getDeployedContract,
    call,
} = require('rocketh-web3')(rocketh, Web3);


module.exports = async ({namedAccounts, initialRun}) => {
    const {
        deployer,
        assetAdmin,
        assetBouncerAdmin,
    } = namedAccounts;

    const assetContract = getDeployedContract('Asset');
    if (assetContract) {
        let currentAdmin;
        try {
            currentAdmin = await call(assetContract, 'getAdmin');
        } catch (e) {

        }
        if (currentAdmin) {
            if (currentAdmin.toLowerCase() !== assetAdmin.toLowerCase()) {
                if (initialRun) {
                    console.log('setting asset admin', currentAdmin, assetAdmin);
                }
                await tx({from: deployer, gas: 1000000}, assetContract, 'changeAdmin', assetAdmin);
            }
        } else {
            console.log('current Asset impl do not support admin');
        }

        let currentBouncerAdmin;
        try {
            currentBouncerAdmin = await call(assetContract, 'getBouncerAdmin');
        } catch (e) {

        }
        if (currentBouncerAdmin) {
            if (currentBouncerAdmin.toLowerCase() !== assetBouncerAdmin.toLowerCase()) {
                if (initialRun) {
                    console.log('setting asset bouncer admin', currentBouncerAdmin, assetBouncerAdmin);
                }
                await tx({from: deployer, gas: 1000000}, assetContract, 'changeBouncerAdmin', assetBouncerAdmin);
            }
        } else {
            console.log('current Asset impl do not support bouncerAdmin');
        }
    } else if (initialRun) {
        console.log('no Asset deployed');
    }
};
