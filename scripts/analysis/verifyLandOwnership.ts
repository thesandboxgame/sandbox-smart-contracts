/*
This scripts requires the following arguments:
  - sourceNetwork: the network where the lands were originally minted. e.g. 'mainnet'

Executio example:
yarn execute localhost scripts/analysis/verifyLandOwnership.ts --sourceNetwork rinkeby
It  will verify if the owners of the land tokens from the source network are the same as the owners of the land tokens in the current network.
*/

import BN from 'bn.js';
import fs from 'fs-extra';
import {ethers} from 'hardhat';
import minimist from 'minimist';

(async () => {
  const argv = minimist(process.argv.slice(2));
  if (!argv.sourceNetwork) throw new Error('sourceNetwork argument is missing');
  const sourceNetwork = argv.sourceNetwork;
  const landOwnersFilePath = `tmp/${sourceNetwork}-landOwners.json`;
  const errorFilePath = `tmp/${sourceNetwork}-verificationLandErrors.json`;
  const errors = [];
  let succesfulChecks = 0;
  type Land = {
    coordinateX: BN;
    coordinateY: BN;
    size: BN;
    tokenId: string;
  };
  type landOwnersMap = {[owner: string]: Land[]};

  // read original land owners file
  if (!fs.existsSync(landOwnersFilePath))
    throw new Error(`file ${landOwnersFilePath} does not exist'`);
  const landOwners: landOwnersMap = fs.readJSONSync(landOwnersFilePath);

  const LandContract = await ethers.getContract('Land');

  for (const landOwner in landOwners) {
    const lands: Land[] = landOwners[landOwner];
    for (const land of lands) {
      try {
        const ownerResult = await LandContract.callStatic.ownerOf(land.tokenId);
        if (ownerResult !== landOwner) {
          errors.push({
            ...land,
            ownerResult: ownerResult,
          });
        } else {
          succesfulChecks++;
        }
      } catch (error) {
        if (error instanceof Error) {
          errors.push({
            ...land,
            ownerResult: error.message,
          });
        }
      }
    }
  }

  console.log(`${succesfulChecks} checks were successful`);
  console.log(`Error count is ${errors.length}`);
  if (errors.length > 0) {
    fs.outputJSONSync(errorFilePath, errors);
  }
})();
