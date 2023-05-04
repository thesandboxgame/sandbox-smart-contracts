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

void (async () => {
  const assetOwners: {id: string}[] = await theGraph.query(
    queryString,
    'owners',
    {blockNumber}
  );
  console.log(assetOwners.length);
  fs.outputJSONSync('tmp/asset_owners.json', assetOwners);
})();
