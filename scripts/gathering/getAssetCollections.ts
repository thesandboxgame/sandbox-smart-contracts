import 'dotenv/config';
import fs from 'fs-extra';
import {TheGraph} from '../utils/thegraph';

const theGraph = new TheGraph(
  'https://api.thegraph.com/subgraphs/name/pixowl/the-sandbox'
);

const queryString = `
query($blockNumber: Int! $first: Int! $lastId: ID!) {
  assetCollections(first: $first where: {id_gt: $lastId}, block: {number: $blockNumber}) {
    id
    supply
    numTokenTypes
    tokens {
      id
      owner {
        id
      }
      supply
    }
  }
}
`;

const blockNumber = 11593528; // Jan-05-2021 08:47:59 AM +UTC

(async () => {
  const assetCollections: {id: string}[] = await theGraph.query(
    queryString,
    'assetCollections',
    {
      blockNumber,
    }
  );
  console.log(assetCollections.length);

  // write to disk
  fs.ensureDirSync('tmp');
  fs.writeFileSync(
    'tmp/asset_collections.json',
    JSON.stringify(assetCollections, null, '  ')
  );
})();
