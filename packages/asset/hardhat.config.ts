import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomiclabs/hardhat-ethers";
import "hardhat-deploy";
import dotenv from "dotenv";
dotenv.config();

const config: HardhatUserConfig = {
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
    deployer: {
      default: 0,
    },
    upgradeAdmin: {
      default: 1,
    },
    assetAdmin: "upgradeAdmin",
    catalystAdmin: "upgradeAdmin",
    catalystMinter: "upgradeAdmin",
    uriSetter: "upgradeAdmin",
    revealer: "upgradeAdmin",
  },
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      forking: {
        enabled: true,
        blockNumber: 16000000,
        url: "https://mainnet.infura.io/v3/f24e105566724643bd574ed65ff8bd5e",
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
      url: "https://rpc-mumbai.maticvigil.com",
      accounts: [process.env.PRIVATE_KEY!],
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
