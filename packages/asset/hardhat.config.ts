import {HardhatUserConfig} from 'hardhat/config';
import '@nomicfoundation/hardhat-chai-matchers';
import 'hardhat-deploy';
import '@nomiclabs/hardhat-ethers';
import 'solidity-coverage';
import dotenv from 'dotenv';
import '@openzeppelin/hardhat-upgrades';
dotenv.config();

const config: HardhatUserConfig = {
  paths: {
    sources: './contracts',
  },
  solidity: {
    compilers: [
      {
        version: '0.8.18',
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
      default: 0,
    },
    sandAdmin: {
      default: 0, // TODO: make same as core
    },
    upgradeAdmin: 'sandAdmin',
    catalystRoyaltyRecipient: '0xB37d8F5d1fEab932f99b2dC8ABda5F413043400B', // testing wallet // TODO: from where ????
    trustedForwarder: '0xf5D0aDF879b717baA5c444B23D7Df0D5e3e3cBD0', // fake
    assetAdmin: 'sandAdmin',
    assetCreateAdmin: 'sandAdmin',
    assetRevealAdmin: 'sandAdmin',
    catalystMinter: 'sandAdmin',
    catalystAdmin: 'sandAdmin',
    tsbAssetMinter: 'sandAdmin', // For Special Minting of TSB Exclusive assets only
    authValidatorAdmin: 'sandAdmin',
    uriSetter: 'sandAdmin',
    backendAuthWallet: {
      default: 2,
    },
  },
  defaultNetwork: 'hardhat',
  networks: {
    hardhat: {
      forking: {
        enabled: false, // note: if set to true then CI will fail
        blockNumber: 16000000,
        url: process.env.ETH_NODE_URI_POLYGON || 'http://localhost:8545',
      },
      loggingEnabled: false,
      chainId: 1337,
      allowUnlimitedContractSize: false,
      mining: {
        auto: true,
        interval: 1000,
        mempool: {
          order: 'fifo',
        },
      },
    },
    'polygon-mumbai': {
      url: 'https://rpc-mumbai.maticvigil.com',
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : undefined,
      chainId: 80001,
      verify: {
        etherscan: {
          apiKey: process.env.ETHERSCAN_API_KEY,
          apiUrl: 'https://api-mumbai.polygonscan.com/',
        },
      },
    },
  },
};

export default config;
