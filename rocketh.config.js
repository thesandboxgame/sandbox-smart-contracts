
module.exports = {
    contractSrcPath: ['src', 'contracts_common/src'],
    deploymentChainIds: ['1', '3', '4', '42', '18'],
    ganacheOptions: {
        debug: true,
        vmErrorsOnRPCResponse: true,
        gasLimit: '0x1312D00', // 20000000
        // hardfork: 'istanbul',
    },
    accounts: {
        default: {
            type: 'mnemonic',
            num: 10,
        },
        4: { // ethereum rinkeby testnet
            // type: 'bitski'
            type: 'mnemonic',
        },
        1: { // ethereum mainnet
            // type: 'bitski'
            type: 'mnemonic',
            // path: '.mnemonic'
            path: '.mnemonic_for_deployment'
        },
        18: { // thundercore testnet
            type: 'mnemonic',
            num: 10
        }
    },
    namedAccounts: {
        deployer: {
            default: 1,
            1: '0x18dd4e0eb8699eA4FeE238dE41ECfb95e32272f8',
            4: '0x61c461EcC993aaDEB7e4b47E96d1B8cC37314B20',
        }, // deploy contracts and make sure they are set up correctly
        sandAdmin: { // can add super operators and change admin
            default: 2,
            // 4: "0x5b4c9eae565c1ba9eb65365aa02ee9fb0a653ce5",
            1: '0xeaa0993e1d21c2103e4f172a20d29371fbaf6d06', // multi sig wallet
            4: '0xcbc70EcCd52bF3910CDC1455E6D2Bd45725F573D' // test multi sig wallet
        },
        sandExecutionAdmin: 'sandAdmin',
        // metaTransactionFundOwner: 0, // TODO
        // metaTransactionExecutor: 0, // TODO
        mintingFeeCollector: 'sandAdmin', // will receiver the fee from Asset minting
        sandBeneficiary: 'sandAdmin', // will be the owner of all initial SAND
        assetAdmin: 'sandAdmin', // can add super operator and change admin to Asset
        assetBouncerAdmin: 'sandAdmin', // setup the contract allowed to mint Assets
        sandSaleAdmin: 'sandAdmin', // can pause the sandSale and withdraw SAND
        genesisBouncerAdmin: 'sandAdmin', // can set who is allowed to mint
        commonMinterAdmin: 'sandAdmin', // can change the fees
        genesisMinter: 'deployer', // the first account allowed to mint genesis Assets
        assetAuctionFeeCollector: 'sandSaleBeneficiary',
        assetAuctionAdmin: 'sandAdmin',
        orbsBeneficiary: 'sandSaleBeneficiary',
        sandSaleBeneficiary: {
            default: 3,
            1: '0x9695ed5020BB47880738Db356678fe8cBc8FF60b', // TODO use another wallet ?
            4: '0xcbc70EcCd52bF3910CDC1455E6D2Bd45725F573D',
        },
        bundleSandSaleManager: 'sandAdmin',
        bundleSandSaleAdmin: 'sandAdmin',
        bundleSandSaleBeneficiary: 'sandSaleBeneficiary',
        landSaleBeneficiary: 'sandSaleBeneficiary',
        landAdmin: 'sandAdmin',
        landSaleAdmin: 'sandAdmin',

        // testing
        others: {
            default: 'from:5',
            deployments: ''
        }
    },
    solcSettings: {
        optimizer: {
            enabled: true,
            runs: 2000, // TODO per contract
        }
    }
};
