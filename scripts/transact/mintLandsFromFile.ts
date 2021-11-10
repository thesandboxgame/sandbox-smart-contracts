/*
This scripts requires the following arguments:
  - sourceNetwork: the network where the lands were originally minted. e.g. 'mainnet'

Executio example:
yarn execute localhost scripts/transact/mintLandsFromFile.ts --sourceNetwork rinkeby
(it will mint the lands from the rinkeby output if exists into the localhost-network Land deployment)
*/

import BN from 'bn.js';
import fs from 'fs-extra';
import {ethers, deployments} from 'hardhat';
import minimist from 'minimist';

(async () => {
  const argv = minimist(process.argv.slice(2));
  if (!argv.sourceNetwork) throw new Error('sourceNetwork argument is missing');
  const sourceNetwork = argv.sourceNetwork;
  const filePath = `tmp/${sourceNetwork}-landOwners.json`;
  const errorFilePath = `tmp/${sourceNetwork}-mintLandErrors.json`;
  const {execute} = deployments;
  const errors = [];
  type Land = {
    coordinateX: BN;
    coordinateY: BN;
    size: BN;
    tokenId: string;
  };
  type landOwnersMap = {[owner: string]: Land[]};

  if (!fs.existsSync(filePath))
    throw new Error(`file ${filePath} does not exist'`);
  const landOwners: landOwnersMap = JSON.parse(
    fs.readFileSync(filePath).toString()
  );

  const LandContract = await ethers.getContract('Land');
  if (!LandContract) throw new Error('Land contract not found');
  const admin = await LandContract.callStatic.getAdmin();
  console.log(`land admin is: ${admin}`);

  const adminWasOriginallyMinter = await LandContract.callStatic.isMinter(
    admin
  );
  if (!adminWasOriginallyMinter) {
    console.log(`admin ${admin} was not originally a minter`);
    await execute('Land', {from: admin}, 'setMinter', admin, true);
  }

  for (const landOwner in landOwners) {
    const lands: Land[] = landOwners[landOwner];
    for (const land of lands) {
      try {
        await execute(
          'Land',
          {from: admin},
          'mintQuad',
          landOwner,
          land.size,
          land.coordinateX,
          land.coordinateY,
          0
        );
      } catch (error) {
        if (error instanceof Error) {
          errors.push({
            ...land,
            mintResult: error.message,
          });
        }
      }
    }
  }

  if (!adminWasOriginallyMinter) {
    console.log('restoring admin-minter to original state');
    await execute('Land', {from: admin}, 'setMinter', admin, false);
  }

  console.log(`Error count is ${errors.length}`);
  if (errors.length > 0) {
    fs.outputJSONSync(errorFilePath, errors);
  }
})();
