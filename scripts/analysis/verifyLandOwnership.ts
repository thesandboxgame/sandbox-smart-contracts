import BN from 'bn.js';
import fs from 'fs-extra';
import {ethers} from 'hardhat';

const networkName = 'rinkeby';
const landOwnersFilePath = `tmp/${networkName}-landOwners.json`;
const errorFilePath = 'tmp/verificationLandErrors.json';

(async () => {
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
  const landOwners: landOwnersMap = JSON.parse(
    fs.readFileSync(landOwnersFilePath).toString()
  );

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
    fs.ensureDirSync('tmp');
    fs.writeFileSync(errorFilePath, JSON.stringify(errors));
  }
})();
