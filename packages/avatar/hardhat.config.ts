import '@nomicfoundation/hardhat-toolbox';
import {HardhatUserConfig} from 'hardhat/config';
import '@openzeppelin/hardhat-upgrades';
import 'hardhat-contract-sizer';

const config: HardhatUserConfig = {
  mocha: {
    timeout: 0,
    ...(!process.env.CI ? {} : {invert: true, grep: '@skip-on-ci'}),
  },
  solidity: {
    compilers: [
      {
        version: '0.8.18',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: '0.8.15',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: '0.8.2', // needed to compile fake PolygonSand to actually test with the sand implementation
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
