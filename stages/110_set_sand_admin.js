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
        sandAdmin,
    } = namedAccounts;

    const sandContract = getDeployedContract('Sand');
    if (!sandContract) {
        throw new Error('no SAND contract deployed');
    }
    const currentAdmin = await call(sandContract, 'getAdmin');
    if (currentAdmin.toLowerCase() !== sandAdmin.toLowerCase()) {
        if (currentAdmin.toLowerCase() !== deployer.toLowerCase()) {
            throw new Error('deployer ' + deployer + ' has no right to change admin for Sand');
        } else {
            log('setting sand admin', currentAdmin, sandAdmin);
            await tx({from: deployer, gas: 1000000}, sandContract, 'changeAdmin', sandAdmin);
        }
    }
};
