const Web3 = require('web3');
const rocketh = require('rocketh');
const {
    deployIfDifferent,
    getDeployedContract,
} = require('rocketh-web3')(rocketh, Web3);

const chainId = rocketh.chainId;

const gas = 6721975; // 7500000

module.exports = async ({namedAccounts, initialRun}) => {
    const {
        sandAdmin,
        deployer,
        wallet,
    } = namedAccounts;

    if (chainId === 1) {
        return;
    }

    const sandContract = getDeployedContract('Sand');

    let sandSaleDeployResult;

    const fakeMedianizer = await deployIfDifferent(
        ['data'],
        'FakeMedianizer', {
            from: deployer,
            gas,
        },
        'FakeMedianizer',
    );

    const fakeDai = await deployIfDifferent(
        ['data'],
        'FakeDai', {
            from: deployer,
            gas,
        },
        'FakeDai',
    );

    try {
        sandSaleDeployResult = await deployIfDifferent(['data'],
            'SandSale',
            {from: deployer, gas},
            'SandSale',
            fakeMedianizer.contract.options.address,
            sandContract.options.address,
            fakeDai.contract.options.address,
            sandAdmin,
            wallet,
        );

        if (initialRun) {
            console.log('gas used for SandSale : ' + sandSaleDeployResult.receipt.gasUsed);
        }
    } catch (e) {
        console.error('error deploying SandSale', e);
        process.exit(1);
    }
};
