import '@nomicfoundation/hardhat-toolbox';
import '@openzeppelin/hardhat-upgrades';
import {HardhatUserConfig} from 'hardhat/config';
import 'hardhat-contract-sizer';
import 'hardhat-gas-reporter';

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
  contractSizer: {
    alphaSort: true,
    disambiguatePaths: false,
    runOnCompile: true,
    strict: true,
    except: ['mocks', '@openzeppelin', '@sandbox-smart-contracts'],
  },
  gasReporter: {
    enabled: true,
    excludeContracts: ['mocks', '@openzeppelin'],
  },
  mocha: {
    ...(!process.env.CI ? {} : {invert: true, grep: '@skip-on-ci'}),
  },
};
export default config;
