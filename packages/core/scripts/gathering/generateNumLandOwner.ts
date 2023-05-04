/**
 * How to use:
 *  - yarn execute <NETWORK> ./scripts/gathering/generateNumLandOwner.ts <blockNumber>
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
  const first = 100;
  let lastId = '0x0';
  let numEntries = first;
  let entries: T[] = [];
  while (numEntries === first) {
    const result = await client
      .query(queryString, {first, lastId, ...variables})
      .toPromise();
    const data = result.data;
    let newEntries = [];
    if (data) {
      newEntries = data[field];
    }
    if (!entries) {
      newEntries = [];
    }
    numEntries = newEntries.length;
    if (numEntries > 0) {
      const newLastId = newEntries[numEntries - 1].id;
      lastId = newLastId;
    }
    entries = entries.concat(newEntries);
  }
  return entries;
}

const client = createClient({
  url: 'https://api.thegraph.com/subgraphs/name/pixowl/the-sandbox',
});

const queryString = `
query($blockNumber: Int! $first: Int! $lastId: ID!) {
    owners(first: $first where: {numLands_gt: 0 id_gt: $lastId} block: {number: $blockNumber}) {
      id
      numLands
    }
}
`;

const args = process.argv.slice(2);
const blockNumber = parseInt(args[0]);

void (async () => {
  const landOwners: {id: string; numLands: string}[] = await query(
    queryString,
    'owners',
    {blockNumber}
  );
  console.log(landOwners.length);

  const entries = landOwners.map((landOwner) => ({
    id: landOwner.id,
    numLands: landOwner.numLands,
  }));

  const csv = new ObjectsToCsv(entries);

  // Save to file:
  await csv.toDisk(`./numLands_${blockNumber}.csv`);
  console.log(`CSV generated: numLands_${blockNumber}.csv`);
})();
