/**
 * How to use:
 *  - npx ts-node ./scripts/utils/splitLandIdsForTunnelMigration.ts
 */
import fs from 'fs-extra';

const tokensSnapshotL1 = JSON.parse(
  fs.readFileSync('./tunnel_mainnet.json').toString()
);
const tokensSnapshotL2 = JSON.parse(
  fs.readFileSync('./tunnel-polygon.json').toString()
);

interface TokenData {
  id: string;
  owner: {
    id: string;
  };
}
// fetch common IDs
function getCommonElement(arr1: Array<TokenData>, arr2: Array<TokenData>) {
  let pointer = 0;
  const output = [];
  for (let i = 0; i < arr1.length; ++i) {
    for (let j = pointer; j < arr2.length; ++j) {
      if (arr1[i].id == arr2[j].id) {
        pointer = j;
        output.push(parseInt(arr1[i].id));
      }
    }
  }
  return output;
}

const commonIds = getCommonElement(tokensSnapshotL1, tokensSnapshotL2);

let remainingTokenOnL2 = [];
for (let i = 0; i < tokensSnapshotL2.length; i++) {
  remainingTokenOnL2.push(parseInt(tokensSnapshotL2[i].id));
}
for (let i = 0; i < commonIds.length; i++) {
  remainingTokenOnL2 = remainingTokenOnL2.filter(
    (element: number) => element != commonIds[i]
  );
}

fs.writeFile(
  'tunnel_land_common_ids.json',
  JSON.stringify(commonIds),
  (err) => {
    if (err) console.log(err);
    else {
      console.log('tunnel_land_common_ids.json File written successfully');
    }
  }
);
fs.writeFile(
  'tunnel_polygon_unique_ids.json',
  JSON.stringify(remainingTokenOnL2),
  (err) => {
    if (err) console.log(err);
    else {
      console.log('tunnel_polygon_unique_ids.json File written successfully');
    }
  }
);
