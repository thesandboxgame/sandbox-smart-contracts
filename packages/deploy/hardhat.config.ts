import 'dotenv/config';
import '@nomicfoundation/hardhat-chai-matchers';
import '@nomicfoundation/hardhat-network-helpers';
import '@nomiclabs/hardhat-ethers';
import 'hardhat-deploy';
import {addForkingSupport, addNodeAndMnemonic} from './utils/hardhatConfig';
import './tasks/importedPackages';

// Package name : solidity source code path
const importedPackages = {
  '@sandbox-smart-contracts/giveaway': 'contracts/SignedMultiGiveaway.sol',
};

const namedAccounts = {
  deployer: {
    default: 1,
    mainnet: '0xe19ae8F9B36Ca43D12741288D0e311396140DF6F',
    polygon: '0x7074BB056C53ACC0b6091dd3FAe591aa3A4acC88',
    goerli: '0xA796AE911621E00809E0E7C8f0AD6BF118E5139e',
    mumbai: '0x5F890c9522dCE5670d741D4277BFCC2d9cA8Af02',
  }, // deploy contracts and make sure they are set up correctly

  sandAdmin: {
    default: 2,
    mainnet: '0x6ec4090d0F3cB76d9f3D8c4D5BB058A225E560a1',
    polygon: '0xfD30a48Bc6c56E24B0ebF1B0117d750e2CFf7531',
    goerli: '0x39D01ecc951C2c1f20ba0549e62212659c4d1e06',
    mumbai: '0x49c4D4C94829B9c44052C5f5Cb164Fc612181165',
  }, // can add super operators and change admin

  upgradeAdmin: 'sandAdmin',

  backendInstantGiveawayWallet: {
    // default is computed from private key:
    // "0x4242424242424242424242424242424242424242424242424242424242424242"
    default: '0x17c5185167401eD00cF5F5b2fc97D9BBfDb7D025',
    polygon: '0x45966Edc0cB7D14f6383921d76963b1274a2c95A',
  },
};

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

const compilers = [
  '0.8.18',
  '0.8.15',
  '0.8.2',
  '0.7.5',
  '0.7.6',
  '0.6.5',
  '0.5.9',
].map((version) => ({
  version,
  settings: {
    optimizer: {
      enabled: true,
      runs: 2000,
    },
  },
}));

const config = addForkingSupport({
  importedPackages,
  namedAccounts,
  networks: addNodeAndMnemonic(networks),
  mocha: {
    timeout: 0,
    ...(!process.env.CI ? {} : {invert: true, grep: '@skip-on-ci'}),
  },
  solidity: {
    compilers,
  },
});
export default config;
