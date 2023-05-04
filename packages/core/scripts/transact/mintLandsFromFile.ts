/*
This scripts requires the following arguments:
  - sourceNetwork: the network where the lands were originally minted. e.g. 'mainnet'

Executio example:
yarn execute localhost scripts/transact/mintLandsFromFile.ts --sourceNetwork rinkeby
(it will mint the lands from the rinkeby output if exists into the localhost-network Land deployment)
*/

import fs from 'fs-extra';
import {deployments, ethers} from 'hardhat';
import minimist from 'minimist';

const {execute, read} = deployments;

type Land = {
  coordinateX: string;
  coordinateY: string;
  size: string;
  tokenId: string;
};
type LandOwnersMap = {[owner: string]: Land[]};

const gasLimits: {[size: string]: number} = {
  '1': 250000, // 1x1
  '3': 300000, // 3x3
  '9': 450000, // 6x6
  '12': 950000, // 12x12
  '24': 3050000, // 24x24
};

async function getOwnerOf(tokenId: string) {
  let owner = null;
  try {
    owner = await read('Land', {}, 'ownerOf', tokenId);
  } catch (e) {
    // console.log(e.message)
  }
  return owner;
}

function log(msg: string) {
  console.log(`${new Date().toISOString()} - ${msg}`);
}

void (async () => {
  const argv = minimist(process.argv.slice(2));
  if (!argv.sourceNetwork) throw new Error('sourceNetwork argument is missing');
  const sourceNetwork = argv.sourceNetwork;
  const filePath = `tmp/${sourceNetwork}-landOwners.json`;
  const errorFilePath = `tmp/${sourceNetwork}-mintLandErrors.json`;
  const errors = [];

  if (!fs.existsSync(filePath))
    throw new Error(`file ${filePath} does not exist'`);
  const landOwners: LandOwnersMap = JSON.parse(
    fs.readFileSync(filePath).toString()
  );

  const LandContract = await ethers.getContract('Land');
  if (!LandContract) throw new Error('Land contract not found');
  const admin = await LandContract.callStatic.getAdmin();
  log(`land admin is: ${admin}`);

  const isMinter = await LandContract.callStatic.isMinter(admin);
  if (!isMinter) {
    log(`setting ${admin} as minter`);
    await execute('Land', {from: admin, log: true}, 'setMinter', admin, true);
  }

  const owners = Object.keys(landOwners);
  const total = owners.reduce(
    (acc, owner) => acc + landOwners[owner].length,
    0
  );
  log(`total quads to mint: ${total}`);
  for (const landOwner of owners) {
    const lands: Land[] = landOwners[landOwner];
    log(
      `${owners.indexOf(landOwner) + 1}/${owners.length} - minting ${
        lands.length
      }; owner ${landOwner}`
    );
    for (const land of lands) {
      try {
        const owner = await getOwnerOf(land.tokenId);
        if (owner) {
          log(
            `${lands.indexOf(land) + 1}/${lands.length} - SKIP - mintQuad ${
              land.tokenId
            }; owner ${owner}`
          );
          continue;
        }
        log(
          `${lands.indexOf(land) + 1}/${lands.length} - EXEC - mintQuad ${
            land.tokenId
          }; owner ${landOwner}`
        );
        await execute(
          'Land',
          {from: admin, log: true, gasLimit: gasLimits[land.size] || 3050000},
          'mintQuad',
          landOwner,
          land.size,
          land.coordinateX,
          land.coordinateY,
          0
        );
      } catch (error) {
        console.error(error);
        console.error(land);
        if (error instanceof Error) {
          errors.push({
            ...land,
            mintResult: error.message,
          });
        }
      }
    }
  }

  log(`removing ${admin} as minter`);
  await execute('Land', {from: admin, log: true}, 'setMinter', admin, false);

  log(`Error count is ${errors.length}`);
  if (errors.length > 0) {
    fs.outputJSONSync(errorFilePath, errors);
  }
})();
