import {HardhatUserConfig} from 'hardhat/config';
import '@nomicfoundation/hardhat-chai-matchers';
import 'solidity-coverage';
import '@openzeppelin/hardhat-upgrades';

const config: HardhatUserConfig = {
  paths: {
    sources: './contracts',
  },
  solidity: {
    compilers: [
      {
        version: '0.8.18',
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
