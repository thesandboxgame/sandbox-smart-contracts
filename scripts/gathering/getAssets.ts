import 'dotenv/config';
import fs from 'fs-extra';
import {TheGraph} from '../utils/thegraph';

const theGraph = new TheGraph(
  'https://api.thegraph.com/subgraphs/name/pixowl/the-sandbox'
);

const queryString = `
query($blockNumber: Int! $first: Int! $lastId: ID!) {
    owners(first: $first where: {numAssets_gt: 0 id_gt: $lastId} block: {number: $blockNumber}) {
      id
      numAssets
      assetTokens {
        token {
          id
          collection {
            id
            supply
            tokenURI
          }
          rarity
          supply
        }
        quantity
      }
    }
}
`;

const blockNumber = 11593528; // Jan-05-2021 08:47:59 AM +UTC

(async () => {
  const assetOwners: {id: string}[] = await theGraph.query(
    queryString,
    'owners',
    {
      blockNumber,
    }
  );
  console.log(assetOwners.length);

  // write to disk
  fs.ensureDirSync('tmp');
  fs.writeFileSync(
    'tmp/asset_owners.json',
    JSON.stringify(assetOwners, null, '  ')
  );
})();
