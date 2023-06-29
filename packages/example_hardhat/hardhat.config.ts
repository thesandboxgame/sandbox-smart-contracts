import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-chai-matchers";
import "hardhat-deploy";
import "@nomiclabs/hardhat-ethers";
import "solidity-coverage";
import dotenv from "dotenv";
dotenv.config();

const config: HardhatUserConfig = {
  paths: {
    sources: "./contracts",
  },
  // solidity compiler version may be updated for new packages as required
  // to ensure packages use up-to-date dependencies
  solidity: {
    compilers: [
      {
        version: "0.8.18",
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
    // *namedAccounts should match packages/core/hardhat.config.ts if using existing roles*
    // new namedAccounts may be added at the end of this list as required
    //------EXAMPLE NAMED ACCOUNTS FROM CORE---------------------------------------//
    deployer: {
      default: 1,
      goerli: '0xA796AE911621E00809E0E7C8f0AD6BF118E5139e',
      mumbai: '0x5F890c9522dCE5670d741D4277BFCC2d9cA8Af02',
    }, // deploy contracts and make sure they are set up correctly
    sandAdmin: {
      default: 2,
      mainnet: '0xeaa0993e1d21c2103e4f172a20d29371fbaf6d06',
      goerli: '0x39D01ecc951C2c1f20ba0549e62212659c4d1e06',
      mumbai: '0x49c4D4C94829B9c44052C5f5Cb164Fc612181165',
    }, // can add super operators and change admin
    backendAuthWallet: {
      // default is computed from private key:
      // "0x4242424242424242424242424242424242424242424242424242424242424242"
      default: '0x17c5185167401eD00cF5F5b2fc97D9BBfDb7D025',
      goerli: '0x0c72f82B46f034025622731c271bdf06B848Ed77',
      mumbai: '0x0c72f82B46f034025622731c271bdf06B848Ed77',
    },
    //------NEW NAMED ACCOUNTS HERE------------------------------------------------//
  },
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      forking: {
        enabled: false, // * note: if set to true then CI will fail *
        blockNumber: 16000000,
        url: process.env.ETH_NODE_URI_POLYGON || "http://localhost:8545",
      },
      loggingEnabled: false,
      chainId: 1337,
      allowUnlimitedContractSize: false,
      mining: {
        auto: true,
        interval: 1000,
        mempool: {
          order: "fifo",
        },
      },
    },
    "polygon-mumbai": {
      url: process.env.ETH_NODE_URI_MUMBAI,
      accounts: process.env.MNEMONIC_MUMBAI ? [process.env.MNEMONIC_MUMBAI] : undefined,
      chainId: 80001,
      verify: {
        etherscan: {
          apiKey: process.env.ETHERSCAN_API_KEY,
          apiUrl: "https://api-mumbai.polygonscan.com/",
        },
      },
    },
    
  },
};

export default config;
