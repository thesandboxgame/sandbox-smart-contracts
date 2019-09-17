const Web3 = require('web3');
const rocketh = require('rocketh');
const {
    tx,
    deployIfDifferent,
    getDeployedContract,
    fetchIfDifferent,
} = require('rocketh-web3')(rocketh, Web3);

const chainId = rocketh.chainId;

module.exports = async ({namedAccounts, initialRun}) => {

    // TODO never run it on mainnet
    if (chainId == 1) {
        return;
    }

    const {
        deployer,
        genesisBouncerAdmin,
        genesisMinter,
    } = namedAccounts;

    const asset = getDeployedContract('Asset');

    const bouncerDifferent = await fetchIfDifferent(['data'],
        'TestBouncer',
        {from: deployer, gas: 1000000},
        'TestBouncer',
        asset.options.address,
    );

    if (bouncerDifferent) {
        await deployIfDifferent(['data'],
            'TestBouncer',
            {from: deployer, gas: 1000000},
            'TestBouncer',
            asset.options.address,
        );

        // TODO outside with if checks to make idempotent
        const bouncerContract = getDeployedContract('TestBouncer');
        // TODO remove old bouncer from list ?
        await tx({from: deployer, gas: 1000000}, asset, 'setBouncer', bouncerContract.options.address, true);
    } else {
        const bouncerContract = getDeployedContract('TestBouncer');
        if (initialRun) {
            console.log('reusing TestBouncer at ' + bouncerContract.options.address);
        }
    }
};
