/**
 * How to use:
 *  - yarn execute <NETWORK> ./scripts/gathering/generateLandOwner.ts <blockNumber>
 */
import 'dotenv/config';
import 'isomorphic-unfetch';
import {createClient} from '@urql/core';

import ObjectsToCsv from 'objects-to-csv';

async function query<T>(
  queryString: string,
  field: string,
  variables: Record<string, unknown>
): Promise<T[]> {
  const first = 1000;
  let entries: T[] = [];
  // Max value for x coordinate is 407
  for (let x_gte = 0; x_gte < 408; x_gte += 2) {
    const x_lt = x_gte + 2;
    const result = await client
      .query(queryString, {first, x_gte, x_lt, ...variables})
      .toPromise();
    const data = result.data;
    let newEntries = [];
    if (data) {
      newEntries = data[field];
    }
    if (!entries) {
      newEntries = [];
    }
    entries = entries.concat(newEntries);
  }
  return entries;
}

const client = createClient({
  url: 'https://api.thegraph.com/subgraphs/name/pixowl/sandbox-stats',
});

const queryString = `
query($blockNumber: Int! $first: Int! $x_gte: Int! $x_lt: Int!) {
  lands(first: $first where: {x_gte: $x_gte, x_lt: $x_lt} block: {number: $blockNumber} orderBy: id orderDirection: asc){
    id
    owner
  }
}
`;

const args = process.argv.slice(2);
const blockNumber = parseInt(args[0]);

void (async () => {
  console.log('Fetching data..');
  const landOwners: {id: string; owner: string}[] = await query(
    queryString,
    'lands',
    {
      blockNumber,
    }
  );

  const entries = landOwners.map((landOwner) => ({
    id: landOwner.id,
    owner: landOwner.owner,
  }));

  const csv = new ObjectsToCsv(entries);

  // Save to file:
  await csv.toDisk(`./landIdToOwnerId_${blockNumber}.csv`);
  console.log(`CSV generated: landIdToOwnerId_${blockNumber}.csv`);
})();
