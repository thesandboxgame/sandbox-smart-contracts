const {
    decodeLogs
} = require('../test/utils');
const {guard} = require('../lib');

module.exports = async ({namedAccounts, initialRun, deployIfDifferent, getEvents, registerContract}) => {
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
        log(' - ORBCore deployed at : ' + deployResult.contract.address + ' for gas : ' + deployResult.receipt.gasUsed);
    } else {
        log('reusing ORBCore at ' + deployResult.contract.address);
    }

    function extractContractAddress(receipt, index) {
        return getEvents(deployResult.contract, 'ORB(address)', receipt)[index];
    }

    //   console.log(JSON.stringify(deployResult.receipt, null, '  '));
    const rareORBAddress = extractContractAddress(deployResult.receipt, 0);
    const epicORBAddress = extractContractAddress(deployResult.receipt, 1);
    const legendaryORBAddress = extractContractAddress(deployResult.receipt, 2);

    registerContract(
        'RareORB',
        rareORBAddress,
        deployResult.transactionHash,
        'ERC20ORB',
        deployResult.contract.address,
        0
    );

    registerContract(
        'EpicORB',
        epicORBAddress,
        deployResult.transactionHash,
        'ERC20ORB',
        deployResult.contract.address,
        1
    );

    registerContract(
        'LegendaryORB',
        legendaryORBAddress,
        deployResult.transactionHash,
        'ERC20ORB',
        deployResult.contract.address,
        2
    );
};
module.exports.skip = guard(['1', '4', '314159']); // TODO
