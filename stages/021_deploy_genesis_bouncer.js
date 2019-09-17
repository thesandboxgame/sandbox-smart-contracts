const Web3 = require('web3');
const rocketh = require('rocketh');
const {
    tx,
    deployIfDifferent,
    getDeployedContract,
    fetchIfDifferent,
} = require('rocketh-web3')(rocketh, Web3);

const chainId = rocketh.chainId;

const gas = 6721975; // 7500000

module.exports = async ({namedAccounts, initialRun}) => {
    if (chainId == 1 || chainId == 4) { // || chainId == 18) { // TODO remove
        return;
    }
    const {
        deployer,
        genesisBouncerAdmin,
        genesisMinter,
    } = namedAccounts;

    const asset = getDeployedContract('Asset');

    const bouncerDifferent = await fetchIfDifferent(['data'],
        'GenesisBouncer',
        {from: deployer, gas},
        'GenesisBouncer',
        asset.options.address,
        genesisBouncerAdmin,
        genesisMinter
    );

    if (bouncerDifferent) {
        await deployIfDifferent(['data'],
            'GenesisBouncer',
            {from: deployer, gas},
            'GenesisBouncer',
            asset.options.address,
            genesisBouncerAdmin,
            genesisMinter
        );

        // TODO outside with if checks to make idempotent
        const bouncerContract = getDeployedContract('GenesisBouncer');
        // TODO remove old bouncer from list ?
        await tx({from: deployer, gas}, asset, 'setBouncer', bouncerContract.options.address, true);
    } else {
        const bouncerContract = getDeployedContract('GenesisBouncer');
        if (initialRun) {
            console.log('reusing Bouncer at ' + bouncerContract.options.address);
        }
    }
};
