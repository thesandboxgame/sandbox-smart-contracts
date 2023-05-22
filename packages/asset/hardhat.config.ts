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
    catalystAdmin: "0xB37d8F5d1fEab932f99b2dC8ABda5F413043400B", // testing wallet
    catalystMinter: "0xB37d8F5d1fEab932f99b2dC8ABda5F413043400B", // testing wallet
    catalystRoyaltyRecipient: "0xB37d8F5d1fEab932f99b2dC8ABda5F413043400B", // testing wallet
    trustedForwarder: "0xf5D0aDF879b717baA5c444B23D7Df0D5e3e3cBD0", // fake
    assetAdmin: "upgradeAdmin",
    tsbAssetMinter: "upgradeAdmin",
    uriSetter: "upgradeAdmin",
    backendSigner: "upgradeAdmin",
  },
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      forking: {
        enabled: true,
        blockNumber: 16000000,
        url: process.env.RPC_URL || "http://localhost:8545",
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
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : undefined,
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
