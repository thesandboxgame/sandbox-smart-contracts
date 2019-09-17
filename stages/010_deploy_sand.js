const Web3 = require('web3');
const rocketh = require('rocketh');
const {
    fetchIfDifferent,
    deployIfDifferent,
    getDeployedContract,
} = require('rocketh-web3')(rocketh, Web3);

const chainId = rocketh.chainId;

const gas = 6000000;

module.exports = async ({namedAccounts, initialRun}) => {
    if (chainId == 1) { // || chainId == 4) { // || chainId === 18) { // TODO remove
        return;
    }

    function log(...args) {
        if (initialRun) {
            console.log(...args);
        }
    }

    const {
        sandAdmin,
        sandBeneficiary,
        deployer,
    } = namedAccounts;

    const different = await fetchIfDifferent(['data'],
        'Sand',
        {from: deployer, gas},
        'Sand',
        sandAdmin,
        sandAdmin,
        sandBeneficiary
    );

    if (different) {
        const deployResult = await deployIfDifferent(['data'],
            'Sand',
            {from: deployer, gas},
            'Sand',
            sandAdmin,
            sandAdmin,
            sandBeneficiary
        );
        log('gas used for SAND : ' + deployResult.receipt.gasUsed);
    } else {
        const sand = getDeployedContract('Sand');
        log('reusing Sand at ' + sand.options.address);
    }
};
