import '@nomicfoundation/hardhat-toolbox';
import {HardhatUserConfig} from 'hardhat/config';
import 'hardhat-storage-layout';
import 'hardhat-contract-sizer';
import '@openzeppelin/hardhat-upgrades';

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
  mocha: {
    ...(!process.env.CI ? {} : {invert: true, grep: '@skip-on-ci'}),
  },
  networks: {
    hardhat: {allowUnlimitedContractSize: true},
  },
};
export default config;
