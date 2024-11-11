import '@nomicfoundation/hardhat-toolbox';
import {HardhatUserConfig} from 'hardhat/config';
import 'hardhat-storage-layout';
import 'hardhat-contract-sizer';
import 'hardhat-deploy';

const config: HardhatUserConfig = {
  // solidity compiler version may be updated for new packages as required
  // to ensure packages use up-to-date dependencies
  namedAccounts: {
    assetAdmin: 0,
    deployer: 0,
    sandAdmin: 1,
    backendAuthWallet: 2,
    landSaleBeneficiary: 0,
    backendReferralWallet: 0,
    landSaleFeeRecipient: 0,
    landSaleAdmin: 0,
  },
  networks: {
    localhost: {
      live: false,
      saveDeployments: true,
      tags: ['local'],
      allowUnlimitedContractSize: true,
    },
    hardhat: {
      live: false,
      saveDeployments: true,
      tags: ['hardhat'],
      allowUnlimitedContractSize: true,
    },
  },
  solidity: {
    compilers: [
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
        version: '0.8.2',
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
