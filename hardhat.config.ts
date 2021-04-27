import 'dotenv/config';
import {HardhatUserConfig} from 'hardhat/types';
import 'hardhat-deploy';
import '@nomiclabs/hardhat-ethers'; // aliased to hardhat-deploy-ethers
import 'hardhat-gas-reporter';
import '@openzeppelin/hardhat-upgrades';
import 'solidity-coverage';
import 'hardhat-contract-sizer';
import {node_url, accounts} from './utils/network';

const config: HardhatUserConfig = {
  gasReporter: {
    currency: 'USD',
    gasPrice: 100,
    enabled: process.env.REPORT_GAS ? true : false,
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
    maxMethodDiff: 10,
  },
  mocha: {
    timeout: 0,
  },
  solidity: {
    compilers: [
      {
        version: '0.8.2',
        settings: {
          optimizer: {
            enabled: true,
            runs: 2000,
          },
        },
      },
      {
        version: '0.7.5',
        settings: {
          optimizer: {
            enabled: true,
            runs: 2000,
          },
        },
      },
      {
        version: '0.6.5',
        settings: {
          optimizer: {
            enabled: true,
            runs: 2000,
          },
        },
      },
      {
        version: '0.5.9',
        settings: {
          optimizer: {
            enabled: true,
            runs: 2000,
          },
        },
      },
    ],
  },
  namedAccounts: {
    deployer: {
      default: 1,
      1: '0x18dd4e0eb8699eA4FeE238dE41ECfb95e32272f8',
      rinkeby: '0x8A0e83DE499d7543CF486974a6196a35B5F573E7',
    }, // deploy contracts and make sure they are set up correctly

    sandAdmin: {
      default: 2,
      1: '0xeaa0993e1d21c2103e4f172a20d29371fbaf6d06',
      rinkeby: '0xa4519D601F43D0b8f167842a367465681F652252',
    }, // can add super operators and change admin

    liquidityRewardProvider: {
      default: 'sandBeneficiary',
      1: '0x8FFA64FB50559c3Ff09a1022b84B2c5233ed8068',
    },
    liquidityRewardAdmin: 'sandAdmin',

    kyberDepositor: {
      default: 'sandBeneficiary',
      1: '0x8FFA64FB50559c3Ff09a1022b84B2c5233ed8068',
    },

    sandExecutionAdmin: 'sandAdmin', // can add execution extension to SAND (used for Native metatx support)
    mintingFeeCollector: 'sandAdmin', // will receiver the fee from Asset minting
    sandBeneficiary: 'sandAdmin', // will be the owner of all initial SAND
    assetAdmin: 'sandAdmin', // can add super operator and change admin to Asset
    assetMinterAdmin: 'sandAdmin', // can set metaTxProcessors & types
    assetBouncerAdmin: 'sandAdmin', // setup the contract allowed to mint Assets
    sandSaleAdmin: 'sandAdmin', // can pause the sandSale and withdraw SAND
    genesisBouncerAdmin: 'sandAdmin', // can set who is allowed to mint
    defaultMinterAdmin: 'sandAdmin', // can change the fees
    genesisMinter: 'deployer', // the first account allowed to mint genesis Assets
    assetAuctionFeeCollector: 'sandSaleBeneficiary', // collect fees from asset auctions
    assetAuctionAdmin: 'sandAdmin', // can change fee collector

    sandSaleBeneficiary: {
      default: 3,
      1: '0x9695ed5020BB47880738Db356678fe8cBc8FF60b', // TODO use another wallet ?
      rinkeby: '0x60927eB036621b801491B6c5e9A60A8d2dEeD75A',
    },

    Foundation: {
      default: 5,
      1: '', // TODO
    },

    StakingPool: {
      default: 6,
      1: '', // TODO
    },

    treasury: {
      default: 'sandSaleBeneficiary',
      rinkeby: 'sandSaleBeneficiary',
      1: '0x4489590a116618B506F0EfE885432F6A8ED998E9',
    },

    landSaleBeneficiary: {
      default: 'sandSaleBeneficiary',
      rinkeby: 'sandSaleBeneficiary',
      1: 'treasury',
    }, // updated to company treasury wallet 9th September - collect funds from land sales

    catalystAssetFeeRecipient: 'treasury',

    landSaleFeeRecipient: {
      default: 3,
      rinkeby: 5,
      1: '0x0EB04462D69B1D267d269377E34f60b9De1c8510',
    }, // collect 5% fee from land sales (prior to implementation of FeeDistributor)

    landAdmin: {
      default: 2,
      1: '0xeaa0993e1d21c2103e4f172a20d29371fbaf6d06',
      rinkeby: '0xa4519D601F43D0b8f167842a367465681F652252',
    }, // can add super operators and change admin

    gemsAndCatalystsAdmin: 'sandAdmin',
    assetAttributesRegistryAdmin: 'sandAdmin',
    proxyAdminOwner: {
      default: 2,
      1: '0xeaa0993e1d21c2103e4f172a20d29371fbaf6d06',
      rinkeby: '0xa4519D601F43D0b8f167842a367465681F652252',
    },

    landSaleAdmin: 'sandAdmin', // can enable currencies
    gameTokenAdmin: 'sandAdmin', // can set minter address
    gameTokenFeeBeneficiary: 'treasury', // receives fees from GAME token  minting / Mods
    estateAdmin: 'sandAdmin', // can add super operators and change admin
    P2PERC721SaleAdmin: 'sandAdmin', // can set fees
    backendReferralWallet: {
      // default is computed from private key:
      // "0x4242424242424242424242424242424242424242424242424242424242424242"
      default: '0x17c5185167401eD00cF5F5b2fc97D9BBfDb7D025',
      1: '0x3044719d139F866a44c988823513eCB93060bF1b',
      rinkeby: '0xB7060D3FeCAC3AE1F0A0AA416E3e8E472257950e',
    },
    sandboxAccount: {
      default: 4,
      1: '0x7A9fe22691c811ea339D9B73150e6911a5343DcA',
      rinkeby: '0x5BC3D5A39a50BE2348b9C529f81aE79f00945897', // Leon account on demo.sandbox
    },
    extraCatalystAndGemMinter: {
      default: null,
      1: null,
      rinkeby: '0x5BC3D5A39a50BE2348b9C529f81aE79f00945897', // Leon account on demo.sandbox
    },
    collectionCatalystMigrationsAdmin: 'sandAdmin', // TODO use special account or deployer ?
    catalystMinter: 'sandAdmin', // account that can mint catalysts
    catalystAdmin: 'sandAdmin', // can set minter and admin for catatalyt, as well as super operators
    gemAdmin: 'sandAdmin', // can set minter and admin for gems, as well as super operators
    gemMinter: 'sandAdmin', // account that can mint gems
    catalystRegistryAdmin: 'sandAdmin', // can change the minter
    catalystMinterAdmin: 'sandAdmin', // control the fees and which catalyst are allowed
    starterPackAdmin: 'sandAdmin', // can change price
    starterPackSaleBeneficiary: 'treasury', // collect funds from starter pack sales
    backendMessageSigner: 'backendReferralWallet', // account that sign message for the starter pack
    kyberLiquidityProvider: 'sandBeneficiary', //TODO check what should be the value

    gemsCatalystsRegistryAdmin: 'sandAdmin',
  },
  networks: {
    hardhat: {
      accounts: accounts(process.env.HARDHAT_FORK),
      forking: process.env.HARDHAT_FORK
        ? {
            url: node_url(process.env.HARDHAT_FORK),
            blockNumber: process.env.HARDHAT_FORK_NUMBER
              ? parseInt(process.env.HARDHAT_FORK_NUMBER)
              : undefined,
          }
        : undefined,
      deploy: ['deploy-for-test', 'deploy'],
    },
    localhost: {
      url: 'http://localhost:8545',
      accounts: accounts(),
    },
    rinkeby_test: {
      url: node_url('rinkeby'),
      accounts: accounts('rinkeby_test'),
    },
    rinkeby: {
      url: node_url('rinkeby'),
      accounts: accounts('rinkeby'),
    },
    mainnet: {
      url: node_url('mainnet'),
      accounts: accounts('mainnet'),
    },
  },
  paths: {
    sources: 'src',
  },

  external: process.env.HARDHAT_FORK
    ? {
        deployments: {
          hardhat: ['deployments/' + process.env.HARDHAT_FORK],
        },
      }
    : undefined,
};

export default config;
