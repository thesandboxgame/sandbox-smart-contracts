const rocketh = require('rocketh');
const Web3 = require('web3');
const {
    deployIfDifferent,
    getDeployedContract,
} = require('rocketh-web3')(rocketh, Web3);
const {guard} = require('../lib');

module.exports = async ({namedAccounts, initialRun}) => {
    function log(...args) {
        if (initialRun) {
            console.log(...args);
        }
    }

    const {
        deployer,
        landSaleAdmin,
        landSaleBeneficiary,
    } = namedAccounts;

    const sandContract = getDeployedContract('Sand');
    const landContract = getDeployedContract('Land');

    if (!sandContract) {
        throw new Error('no SAND contract deployed');
    }

    if (!landContract) {
        throw new Error('no LAND contract deployed');
    }

    const merkleRoot = '0x1111111111111111111111111111111111111111111111111111111111111111'; // TODO

    const deployResult = await deployIfDifferent(['data'],
        'LandSale',
        {from: deployer, gas: 8000000},
        'LandSale',
        landContract.options.address,
        sandContract.options.address,
        sandContract.options.address,
        landSaleAdmin,
        landSaleBeneficiary,
        merkleRoot
    );

    if (deployResult.newlyDeployed) {
        log(' - LandSale deployed at : ' + deployResult.contract.options.address + ' for gas : ' + deployResult.receipt.gasUsed);
    } else {
        log('reusing LandSale at ' + deployResult.contract.options.address);
    }
};
module.exports.skip = guard(['1', '4']);
