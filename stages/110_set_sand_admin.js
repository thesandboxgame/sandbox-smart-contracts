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
        sandAdmin,
    } = namedAccounts;

    const sandContract = getDeployedContract('Sand');
    if (!sandContract) {
        throw new Error('no SAND contract deployed');
    }
    const currentAdmin = await call(sandContract, 'getAdmin');
    if (currentAdmin.toLowerCase() !== sandAdmin.toLowerCase()) {
        log('setting Sand Admin');
        await txOnlyFrom(currentAdmin, {from: deployer, gas: 1000000}, sandContract, 'changeAdmin', sandAdmin);
    }
};
