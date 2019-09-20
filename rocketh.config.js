
module.exports = {
    contractSrcPath: ['src', 'contracts_common/src'],
    deploymentChainIds: ['1', '3', '4', '42', '18'],
    ganacheOptions: {
        debug: true,
        vmErrorsOnRPCResponse: true,
        gasLimit: '0x7a1200', // 8000000
    },
    stages: {
        // default: {
        //     matchRule: "startsWith",
        //     list: ["010_", "015_", "020_", "021_", "110_", "120_"]
        // },
        1: {
            matchRule: 'startsWith',
            list: ['010_', '015_', '020_', '021_', '110_', '120_', 'testingFolder/']
        }
    },
    accounts: {
        default: {
            type: 'mnemonic',
            num: 10,
        },
        4: { // ethereum rinkeby testnet
            type: 'mnemonic'
        },
        1: { // ethereum mainnet
            type: 'bitski'
        },
        18: { // thundercore testnet
            type: 'mnemonic',
            num: 10
        }
    },
    namedAccounts: {
        deployer: 0, // deploy contracts and make sure they are set up correctly
        sandAdmin: { // can add super operators and change admin
            default: 0,
            // 4: "0x5b4c9eae565c1ba9eb65365aa02ee9fb0a653ce5",
            1: '0xeaa0993e1d21c2103e4f172a20d29371fbaf6d06', // multi sig wallet
        },

        metaTransactionFundOwner: 0, // TODO
        metaTransactionExecutor: 0, // TODO
        mintingFeeCollector: 'sandAdmin', // will receiver the fee from Asset minting
        sandBeneficiary: 'sandAdmin', // will be the owner of all initial SAND
        sandUpgrader: 'sandAdmin', // can upgrade the Sand smart contract and change the upgrader
        assetAdmin: 'sandAdmin', // can add super operator and change admin to Asset
        assetBouncerAdmin: 'sandAdmin',
        genesisBouncerAdmin: 'sandAdmin',
        genesisMinter: 'sandAdmin',
        assetUpgrader: 'sandAdmin',
        orbsBeneficiary: 'sandAdmin',
        sandSaleBeneficiary: {
            default: 0,
            1: '0xeaa0993e1d21c2103e4f172a20d29371fbaf6d06', // TODO use another wallet ?
        },
        others: {
            default: 'from:3',
            deployments: ''
        }
    },
    solcSettings: {
        optimizer: {
            enabled: true,
            runs: 2000,
        }
    }
};
