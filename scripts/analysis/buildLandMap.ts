/*
This scripts requires the following arguments:
  - sourceNetwork: the network where the lands were originally minted. e.g. 'mainnet'

Executio example:
yarn execute localhost scripts/analysis/verifyLandOwnership.ts --sourceNetwork rinkeby
It  will verify if the owners of the land tokens from the source network are the same as the owners of the land tokens in the current network.
*/

import BN from 'bn.js';
import {BigNumber} from 'ethers';
import fs from 'fs-extra';
import {ethers} from 'hardhat';
import minimist from 'minimist';

(async () => {
  const landContract = await ethers.getContract('Land');
  const size = 1;
  const GRID_SIZE = 408;

  for (let x = 0; x < 408; x += size) {
    for (let y = 0; y < 408; y += size) {
      const tokenId = x + y * GRID_SIZE;

      try {
        const owner = await landContract.callStatic.ownerOf(tokenId.toString());
        console.log(owner);
      } catch (error) {
        console.log(x, y, tokenId.toString());
      }
    }
  }
})();
