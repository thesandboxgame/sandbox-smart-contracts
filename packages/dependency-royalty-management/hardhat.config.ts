import '@nomicfoundation/hardhat-toolbox';
import {HardhatUserConfig} from 'hardhat/config';
import 'solidity-coverage';
import '@openzeppelin/hardhat-upgrades';

const config: HardhatUserConfig = {
  // solidity compiler version may be updated for new packages as required
  // to ensure packages use up-to-date dependencies
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
