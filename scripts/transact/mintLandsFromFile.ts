import BN from 'bn.js';
import fs from 'fs-extra';
import {ethers, deployments} from 'hardhat';

const networkName = 'rinkeby';
const filePath = `tmp/${networkName}-landOwners.json`;
const errorFilePath = 'tmp/mintLandErrors.json';

(async () => {
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

  // set contract admin as minter and verify
  await execute('Land', {from: admin}, 'setMinter', admin, true);
  const isMinter = await LandContract.callStatic.isMinter(admin);
  if (!isMinter)
    throw new Error('admin is not minter even after calling setMinter');

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

  console.log(`Error count is ${errors.length}`);
  if (errors.length > 0) {
    fs.ensureDirSync('tmp');
    console.log(`writing errors to ${errorFilePath}`);
    fs.writeFileSync(errorFilePath, JSON.stringify(errors));
  }
})();
