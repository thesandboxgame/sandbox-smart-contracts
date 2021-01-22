import 'dotenv/config';
import {TheGraph} from '../utils/thegraph';
import {getBlockArgs} from '../utils/utils';
import {write} from '../utils/spreadsheet';

const blockNumber = getBlockArgs(0);

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

(async () => {
  const stakers: {
    id: string;
  }[] = await theGraph.query(queryString, 'stakers', {
    blockNumber,
  });

  const entries: string[][] = [];

  for (const staker of stakers) {
    entries.push([staker.id]);
  }

  const sheetId = {
    document: '156GmrmCts4iCc3xNEnECcha1N3eKqNmbdiZhrxtB068',
    sheet: 'Sheet1',
  };
  // await write(sheetId, {values: [['ADDRESSES', 'AMOUNTS']], range: 'C1:D1'});
  await write(sheetId, {values: [['ADDRESSES']], range: 'C1:C'});
  await write(sheetId, {
    values: entries,
    // range: 'C2:D' + (entries.length + 2),
    range: 'C2:C' + (entries.length + 2),
  });

  // TODO ?
  // const assetClaims = [];

  // for (const landOwner of landOwners) {
  //   assetClaims.push({
  //     reservedAddress: landOwner.id,
  //     assetIds: [
  //       '55464657044963196816950587289035428064568320970692304673817341489687505668096',
  //     ],
  //     assetValues: [1],
  //   });
  // }
  // fs.writeFileSync(
  //   'data/asset_giveaway_1/assets_mainnet.json',
  //   JSON.stringify(assetClaims, null, '  ')
  // );
})();
