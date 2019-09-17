const Web3 = require('web3');
const rocketh = require('rocketh');
const {
    tx,
    deployIfDifferent,
    getDeployedContract,
    fetchReceipt,
    deploy,
    fetchIfDifferent,
    instantiateAndRegisterContract,
    getTransactionCount,
} = require('rocketh-web3')(rocketh, Web3);

const {
    decodeLogs
} = require('../test/utils');

const chainId = rocketh.chainId;
const gas = 6000000;

module.exports = async ({namedAccounts, initialRun}) => {
    if (chainId == 1 || chainId == 4) { // || chainId == 18) { // TODO remove
        return;
    }

    const {
        deployer,
        assetAdmin,
        assetUpgrader,
        orbsBeneficiary,
    } = namedAccounts;

    let ORBCoreResult;
    try {
        ORBCoreResult = await deployIfDifferent(['data'],
            'ORBCore',
            {from: deployer, gas},
            'ORBCore',
            orbsBeneficiary,
            '1000000000',
            '1000000',
            '1000'
        );
        if (initialRun) {
            console.log('gas used for ORBCore : ' + ORBCoreResult.receipt.gasUsed); // TODO only if actually deployed at that time
        }
    } catch (e) {
        console.error('error deploying ORBCore', e);
    }

    function extractContractAddress(receipt, index) {
        return decodeLogs([{type: 'address', name: 'orb'}], receipt, index).orb;
    }

    //   console.log(JSON.stringify(ORBCoreResult.receipt, null, '  '));
    const rareORBAddress = extractContractAddress(ORBCoreResult.receipt, 1);
    const epicORBAddress = extractContractAddress(ORBCoreResult.receipt, 3);
    const legendaryORBAddress = extractContractAddress(ORBCoreResult.receipt, 5);

    instantiateAndRegisterContract(
        'RareORB',
        rareORBAddress,
        ORBCoreResult.transactionHash,
        'ERC20ORB',
        ORBCoreResult.contract.options.address,
        0
    );

    instantiateAndRegisterContract(
        'EpicORB',
        epicORBAddress,
        ORBCoreResult.transactionHash,
        'ERC20ORB',
        ORBCoreResult.contract.options.address,
        1
    );

    instantiateAndRegisterContract(
        'LegendaryORB',
        legendaryORBAddress,
        ORBCoreResult.transactionHash,
        'ERC20ORB',
        ORBCoreResult.contract.options.address,
        2
    );
};
