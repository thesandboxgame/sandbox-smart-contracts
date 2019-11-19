const rocketh = require('rocketh');
const Web3 = require('web3');
const {
    getDeployedContract,
} = require('rocketh-web3')(rocketh, Web3);
const {guard, multiGuards} = require('../lib');

const MerkleTree = require('../lib/merkleTree');
const {createDataArray, saltLands} = require('../lib/merkleTreeHelper');
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

    const secret = '0xd99c85d88ecb384d210f988028308ef7d7ffbbd33d64e7189c8e54ee2e9f6a5b';
    const saltedLands = saltLands(landsForSales, secret);
    const tree = new MerkleTree(createDataArray(saltedLands));
    const merkleRootHash = tree.getRoot().hash;

    const deployResult = await deployIfDifferent(['data'],
        'LandSale',
        {from: deployer, gas: 1000000, associatedData: saltedLands},
        'LandSale',
        landContract.options.address,
        sandContract.options.address,
        sandContract.options.address,
        landSaleAdmin,
        landSaleBeneficiary,
        merkleRootHash,
        Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60) // 30 days
    );
    const contract = getDeployedContract('LandSale');
    if (deployResult.newlyDeployed) {
        log(' - LandSale deployed at : ' + contract.options.address + ' for gas : ' + deployResult.receipt.gasUsed);
    } else {
        log('reusing LandSale at ' + contract.options.address);
    }
};
module.exports.skip = guard(['1', '4'], 'LandSale');
