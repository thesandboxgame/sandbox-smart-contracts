import 'dotenv/config';
import fs from 'fs-extra';
import {TheGraph} from '../utils/thegraph';
import {getBlockArgs} from '../utils/utils';

const blockNumber = getBlockArgs(0);

const theGraph = new TheGraph(
  'https://api.thegraph.com/subgraphs/name/pixowl/the-sandbox'
);

const queryString = `
query($blockNumber: Int! $first: Int! $lastId: ID!) {
  assetCollections(first: $first where: {id_gt: $lastId}, block: {number: $blockNumber}) {
    id
    supply
    numTokenTypes
    tokenURI
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
