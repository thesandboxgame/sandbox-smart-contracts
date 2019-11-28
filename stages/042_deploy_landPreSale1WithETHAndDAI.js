const rocketh = require('rocketh');
const Web3 = require('web3');
const {
    deploy,
    getDeployedContract,
} = require('rocketh-web3')(rocketh, Web3);
const {guard} = require('../lib');

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

    let daiMedianizer = getDeployedContract('DAIMedianizer');
    if (!daiMedianizer) {
        log('setting up a fake DAI medianizer');
        const daiMedianizerDeployResult = await deploy(
            'DAIMedianizer',
            {from: deployer, gas: 6721975},
            'FakeMedianizer',
        );
        daiMedianizer = daiMedianizerDeployResult.contract;
    }

    let dai = getDeployedContract('DAI');
    if (!dai) {
        log('setting up a fake DAI');
        const daiDeployResult = await deploy(
            'DAI', {
                from: deployer,
                gas: 6721975,
            },
            'FakeDai',
        );
        dai = daiDeployResult.contract;
    }

    const secret = '0xd99c85d88ecb384d210f988028308ef7d7ffbbd33d64e7189c8e54ee2e9f6a5b';
    const saltedLands = saltLands(landsForSales, secret);
    const tree = new MerkleTree(createDataArray(saltedLands));
    const merkleRootHash = tree.getRoot().hash;

    const deployResult = await deployIfDifferent(['data'],
        'LandPreSale_1',
        {from: deployer, gas: 1000000, associatedData: saltedLands},
        'LandSaleWithETHAndDAI',
        landContract.options.address,
        sandContract.options.address,
        sandContract.options.address,
        landSaleAdmin,
        landSaleBeneficiary,
        merkleRootHash,
        1576753200, // This is Thursday, 19 December 2019 11:00:00 GMT+00:00 // Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 days
        daiMedianizer.options.address,
        dai.options.address
    );
    const contract = getDeployedContract('LandPreSale_1');
    if (deployResult.newlyDeployed) {
        log(' - LandPreSale_1 deployed at : ' + contract.options.address + ' for gas : ' + deployResult.receipt.gasUsed);
    } else {
        log('reusing LandPreSale_1 at ' + contract.options.address);
    }
};
module.exports.skip = guard(['1', '4'], 'LandPreSale_1');
