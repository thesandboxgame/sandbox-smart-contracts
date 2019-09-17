const Web3 = require('web3');
const rocketh = require('rocketh');
const {
    tx,
    deployIfDifferent,
    getDeployedContract,
    // fetchReceipt,
    deploy,
    fetchIfDifferent,
    instantiateAndRegisterContract,
    // getTransactionCount,
} = require('rocketh-web3')(rocketh, Web3);

const chainId = rocketh.chainId;

const gas = 6721975; // 7500000

module.exports = async ({namedAccounts, initialRun}) => {
    if (chainId == 1) { // || chainId == 4) { // || chainId == 18) { // TODO remove
        return;
    }
    const {
        deployer,
        assetAdmin,
        assetUpgrader,
        assetBouncerAdmin,
        genesisBouncerAdmin,
        genesisMinter,
    } = namedAccounts;

    const sandContract = getDeployedContract('Sand');

    let assetDeployResult;
    try {
        // console.log({deployer, sand: sandContract.options.address});
        assetDeployResult = await deployIfDifferent(['data'],
            'Asset',
            {from: deployer, gas},
            'Asset',
            sandContract.options.address,
            deployer, // is set to assetAdmin in a later stage
            deployer, // is set to assetBouncerAdmin in a later stage
        );
        if (initialRun) {
            console.log('gas used for Asset : ' + assetDeployResult.receipt.gasUsed); // TODO only if actually deployed at that time
        }
    } catch (e) {
        console.error('error deploying Asset', e);
        process.exit(1);
    }
};
