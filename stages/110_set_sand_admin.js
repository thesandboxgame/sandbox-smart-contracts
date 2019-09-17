const Web3 = require('web3');
const rocketh = require('rocketh');
const {
    tx,
    getDeployedContract,
    call,
} = require('rocketh-web3')(rocketh, Web3);

const chainId = rocketh.chainId;

module.exports = async ({namedAccounts, initialRun}) => {
    if (chainId == 1) { // || chainId == 4) { // || chainId == 18) { // TODO remove
        return;
    }
    const {
        deployer,
        sandAdmin,
    } = namedAccounts;

    const sandContract = getDeployedContract('Sand');
    if (sandContract) {
        const currentAdmin = await call(sandContract, 'getAdmin');
        if (currentAdmin.toLowerCase() != sandAdmin.toLowerCase()) {
            if (initialRun) {
                console.log('setting sand admin', currentAdmin, sandAdmin);
            }
            await tx({from: deployer, gas: 1000000}, sandContract, 'changeAdmin', sandAdmin);
        }
    } else if(initialRun) {
        console.log('no Sand deployed');
    }
};
