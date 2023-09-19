import '@nomicfoundation/hardhat-toolbox';
import {HardhatUserConfig} from 'hardhat/config';

/**
 * TAGS:
 *  - mainnet -> production networks (you must pay for gas!!!)
 *  - L1      -> Layer 1 networks
 *  - L2      -> Layer 2 networks
 */
const networks = {
  hardhat: {
    tags: ['L1', 'L2'],
    deploy: ['deploy_mocks/', 'deploy/'],
    companionNetworks: {
      l1: 'hardhat',
      l2: 'hardhat',
    },
    blockGasLimit:
      parseInt(process.env.HARDHAT_BLOCK_GAS_LIMIT || '0') || 30000000,
  },
  goerli: {
    tags: ['L1'],
    // gasPrice: 600000000000, // Uncomment in case of pending txs, and adjust gas
    companionNetworks: {
      l2: 'mumbai',
    },
  },
  mainnet: {
    tags: ['mainnet', 'L1'],
    companionNetworks: {
      l2: 'polygon',
    },
  },
  mumbai: {
    tags: ['L2'],
    companionNetworks: {
      l1: 'goerli',
    },
  },
  polygon: {
    tags: ['mainnet', 'L2'],
    companionNetworks: {
      l1: 'mainnet',
    },
  },
};

const config = {
  // solidity compiler version may be updated for new packages as required
  // to ensure packages use up-to-date dependencies
  solidity: {
    compilers: [
      {
        version: '0.8.19',
        settings: {
          optimizer: {
            enabled: true,
            runs: 2000,
          },
        },
      },
    ],
  },
};
export default config;
