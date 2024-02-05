import '@nomicfoundation/hardhat-toolbox';
import '@openzeppelin/hardhat-upgrades';
import {HardhatUserConfig} from 'hardhat/config';
import 'hardhat-storage-layout';
import 'hardhat-contract-sizer';

const config: HardhatUserConfig = {
  // solidity compiler version may be updated for new packages as required
  // to ensure packages use up-to-date dependencies
  solidity: {
    compilers: [
      {
        version: '0.8.23',
        settings: {
          optimizer: {
            enabled: true,
            runs: 2000,
          },
        },
      },
    ],
  },
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true,
    },
  },
};
export default config;
