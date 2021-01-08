import 'dotenv/config';
import fs from 'fs-extra';
import {TheGraph} from '../utils/thegraph';

const theGraph = new TheGraph(
  'https://api.thegraph.com/subgraphs/name/pixowl-ron/asset-claims'
);

const queryString = `
query($blockNumber: Int! $first: Int! $lastId: ID!) {
  claims(first: $first where: {id_gt: $lastId}, block: {number: $blockNumber}) {
    id
    assetIDs
    assetValues
  }
}
`;

const blockNumber = 11593528; // Jan-05-2021 08:47:59 AM +UTC

type ClaimData = {
  reservedAddress: string;
  assetIds: string[];
  assetValues: number[];
};

(async () => {
  const claims: {
    id: string;
    assetIDs: string[];
    assetValues: string[];
  }[] = await theGraph.query(queryString, 'claims', {
    blockNumber,
  });
  console.log(claims.length);

  const claimsData: ClaimData[] = [];

  for (const claim of claims) {
    claimsData.push({
      reservedAddress: claim.id,
      assetIds: claim.assetIDs,
      assetValues: claim.assetValues.map((s) => parseInt(s)),
    });
  }

  // write to disk
  fs.ensureDirSync('tmp');
  fs.writeFileSync(
    'tmp/asset_claims.json',
    JSON.stringify(claimsData, null, '  ')
  );
})();
