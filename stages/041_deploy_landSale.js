const rocketh = require('rocketh');
const Web3 = require('web3');
const {
    getDeployedContract,
} = require('rocketh-web3')(rocketh, Web3);
const {guard, multiGuards} = require('../lib');

const MerkleTree = require('../lib/merkleTree');
const {createDataArray} = require('../lib/merkleTreeHelper');
const landsForSales = require('../data/land_presale_001.json');

module.exports = async ({namedAccounts, initialRun, deployIfDifferent}) => {
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

    const tree = new MerkleTree(createDataArray(landsForSales));
    const merkleRootHash = tree.getRoot().hash;

    const deployResult = await deployIfDifferent(['data'],
        'LandSale',
        {from: deployer, gas: 1000000, associatedData: landsForSales},
        'LandSale',
        landContract.options.address,
        sandContract.options.address,
        sandContract.options.address,
        landSaleAdmin,
        landSaleBeneficiary,
        merkleRootHash,
	Date.now() + 30 * 24 * 60 * 60 // 30 days
    );
    const contract = getDeployedContract('LandSale');
    if (deployResult.newlyDeployed) {
        log(' - LandSale deployed at : ' + contract.options.address + ' for gas : ' + deployResult.receipt.gasUsed);
    } else {
        log('reusing LandSale at ' + contract.options.address);
    }
};
module.exports.skip = multiGuards([guard(['4'], 'LandSale'), guard(['1'])]);
