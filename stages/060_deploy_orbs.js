const Web3 = require('web3');
const rocketh = require('rocketh');
const {
    deployIfDifferent,
    instantiateAndRegisterContract,
} = require('rocketh-web3')(rocketh, Web3);

const {
    decodeLogs
} = require('../test/utils');
const {guard} = require('../lib');

module.exports = async ({namedAccounts, initialRun}) => {
    function log(...args) {
        if (initialRun) {
            console.log(...args);
        }
    }

    const {
        deployer,
        orbsBeneficiary,
    } = namedAccounts;

    const deployResult = await deployIfDifferent(['data'],
        'ORBCore',
        {from: deployer, gas: 5000000},
        'ORBCore',
        orbsBeneficiary,
        '1000000000',
        '1000000',
        '1000'
    );
    if (deployResult.newlyDeployed) {
        log(' - ORBCore deployed at : ' + deployResult.contract.options.address + ' for gas : ' + deployResult.receipt.gasUsed);
    } else {
        log('reusing ORBCore at ' + deployResult.contract.options.address);
    }

    function extractContractAddress(receipt, index) {
        return decodeLogs([{type: 'address', name: 'orb'}], receipt, index).orb;
    }

    //   console.log(JSON.stringify(deployResult.receipt, null, '  '));
    const rareORBAddress = extractContractAddress(deployResult.receipt, 1);
    const epicORBAddress = extractContractAddress(deployResult.receipt, 3);
    const legendaryORBAddress = extractContractAddress(deployResult.receipt, 5);

    instantiateAndRegisterContract(
        'RareORB',
        rareORBAddress,
        deployResult.transactionHash,
        'ERC20ORB',
        deployResult.contract.options.address,
        0
    );

    instantiateAndRegisterContract(
        'EpicORB',
        epicORBAddress,
        deployResult.transactionHash,
        'ERC20ORB',
        deployResult.contract.options.address,
        1
    );

    instantiateAndRegisterContract(
        'LegendaryORB',
        legendaryORBAddress,
        deployResult.transactionHash,
        'ERC20ORB',
        deployResult.contract.options.address,
        2
    );
};
module.exports.skip = guard(['1', '4']); // TODO
