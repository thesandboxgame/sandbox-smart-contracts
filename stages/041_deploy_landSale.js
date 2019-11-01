const rocketh = require('rocketh');
const Web3 = require('web3');
const {
    getDeployedContract,
} = require('rocketh-web3')(rocketh, Web3);
const {guard} = require('../lib');

const MerkleTree = require('../lib/merkleTree');
const {createDataArray} = require('../lib/merkleTreeHelper');
const landsForSales = require('../data/land_presale_001.json');

module.exports = async ({namedAccounts, initialRun, deploy, contractInfo, registerDeployment, fetchIfDifferent}) => {
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

    const args = [
        landContract.options.address,
        sandContract.options.address,
        sandContract.options.address,
        landSaleAdmin,
        landSaleBeneficiary,
        merkleRootHash
    ];
    const isDifferent = await fetchIfDifferent(['data'],
        {from: deployer, gas: 8000000},
        'LandSale',
        ...args
    );
    if (isDifferent) {
        const deployResult = await deploy({from: deployer, gas: 8000000},
            'LandSale',
            ...args
        );
        const landSaleContractInfo = contractInfo('LandSale');
        registerDeployment('LandSale', {
            contractInfo: landSaleContractInfo,
            args,
            transactionHash: deployResult.transactionHash,
            address: deployResult.contract.address,
            data: landsForSales
        });
        const contract = getDeployedContract('LandSale');
        log(' - LandSale deployed at : ' + contract.options.address + ' for gas : ' + deployResult.receipt.gasUsed);
    } else {
        const contract = getDeployedContract('LandSale');
        log('reusing LandSale at ' + contract.options.address);
    }
};
module.exports.skip = guard(['1', '4']);
