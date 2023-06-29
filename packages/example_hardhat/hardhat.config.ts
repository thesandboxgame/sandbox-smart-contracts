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
    }, // deploy contracts and make sure they are set up correctly
    sandAdmin: {
      default: 2,
    }, // can add super operators and change admin
    backendAuthWallet: {
      // default is computed from private key:
      // "0x4242424242424242424242424242424242424242424242424242424242424242"
      default: '0x17c5185167401eD00cF5F5b2fc97D9BBfDb7D025',
    },
    //------NEW NAMED ACCOUNTS HERE------------------------------------------------//
  },
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      forking: {
        enabled: false, // * note: if set to true then CI will fail *
        blockNumber: 16000000,
        url: "http://localhost:8545",
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
  },
};

export default config;
