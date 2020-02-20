const {guard, multiGuards} = require('../lib');

module.exports = async ({namedAccounts, initialRun, getDeployedContract, deployIfDifferent, deploy}) => {
    function log(...args) {
        if (initialRun) {
            console.log(...args);
        }
    }

    const {
        sandSaleAdmin,
        deployer,
        sandSaleBeneficiary,
    } = namedAccounts;

    const sandContract = getDeployedContract('Sand');
    if (!sandContract) {
        throw new Error('no SAND contract deployed');
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

    const sandSaleDeployResult = await deployIfDifferent(['data'],
        'SandSale',
        {from: deployer, gas: 1000000},
        'SandSale',
        daiMedianizer.address,
        sandContract.address,
        dai.address,
        sandSaleAdmin,
        sandSaleBeneficiary,
    );

    if (sandSaleDeployResult.newlyDeployed) {
        log(' - SandSale deployed at : ' + sandSaleDeployResult.contract.address + ' for gas : ' + sandSaleDeployResult.receipt.gasUsed);
    } else {
        log('reusing SandSale at ' + sandSaleDeployResult.contract.address);
    }
};
module.exports.skip = guard(['1', '4', '314159']); // module.exports.skip = multiGuards([guard(['4'], 'SandSale'), guard(['1'])]);
