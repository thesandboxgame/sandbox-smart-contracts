import 'dotenv/config';
import {TheGraph} from '../utils/thegraph';
import {getBlockArgs} from '../utils/utils';
import fs from 'fs';
// import {write} from '../utils/spreadsheet';

const blockNumber = getBlockArgs(0);

const args = process.argv.slice(2);
const assetId = args[1];
if (!assetId || assetId === '') {
  throw new Error(`assetId need to be specified`);
}

const theGraph = new TheGraph(
  'https://api.thegraph.com/subgraphs/name/pixowl/staking'
);

const queryString = `
query($blockNumber: Int! $first: Int! $lastId: ID!) {
    stakers(first: $first where: {id_gt: $lastId} block: {number: $blockNumber}) {
      id
    }
}
`;

void (async () => {
  const stakers: {
    id: string;
  }[] = await theGraph.query(queryString, 'stakers', {
    blockNumber,
  });

  console.log({numStakers: stakers.length});

  // const entries: string[][] = [];
  // for (const staker of stakers) {
  //   entries.push([staker.id]);
  // }
  // const sheetId = {
  //   document: '156GmrmCts4iCc3xNEnECcha1N3eKqNmbdiZhrxtB068',
  //   sheet: 'Sheet1',
  // };
  // // await write(sheetId, {values: [['ADDRESSES', 'AMOUNTS']], range: 'C1:D1'});
  // await write(sheetId, {values: [['ADDRESSES']], range: 'C1:C'});
  // await write(sheetId, {
  //   values: entries,
  //   // range: 'C2:D' + (entries.length + 2),
  //   range: 'C2:C' + (entries.length + 2),
  // });

  const assetClaims = [];

  for (const staker of stakers) {
    assetClaims.push({
      reservedAddress: staker.id,
      assetIds: [assetId],
      assetValues: [1],
    });
  }
  fs.writeFileSync(
    'data/asset_giveaway_2/assets.json',
    JSON.stringify(assetClaims, null, '  ')
  );
})();
