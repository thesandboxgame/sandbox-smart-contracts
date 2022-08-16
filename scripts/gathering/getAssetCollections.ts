import 'dotenv/config';
import fs from 'fs-extra';
import hre from 'hardhat';
import {TheGraph} from '../utils/thegraph';
import {getBlockArgs} from '../utils/utils';
const blockNumber = getBlockArgs(0);
const graphUrl =
  process.env[`SANDBOX_GRAPH_URL_${hre.network.name.toUpperCase()}`] || '';
const theGraph = new TheGraph(graphUrl);
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

void (async () => {
  const assetCollections: {id: string}[] = await theGraph.query(
    queryString,
    'assetCollections',
    {blockNumber}
  );
  console.log(assetCollections.length);
  fs.outputJSONSync('tmp/asset_collections.json', assetCollections);
})();
