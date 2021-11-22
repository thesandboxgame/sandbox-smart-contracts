import 'dotenv/config';
import fs from 'fs';
import 'isomorphic-unfetch';
import {createClient} from '@urql/core';
import {write} from '../utils/spreadsheet';

import ObjectsToCsv from 'objects-to-csv';

async function query<T>(
  queryString: string,
  field: string,
  variables: Record<string, unknown>
): Promise<T[]> {
  const first = 1000;
  let lastId = 0x0;
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
      if (lastId === newLastId) {
        console.log('same query, stop');
        break;
      }
      lastId = newLastId;
    }
    entries = entries.concat(newEntries);
  }
  return entries;
}

const client = createClient({
  url: 'https://api.thegraph.com/subgraphs/name/pixowl/sandbox-stats',
});

const queryString = `
query($blockNumber: Int! $first: Int! $lastId: ID!) {
  lands(first: $first where: {id_gt: $lastId} block: {number: $blockNumber} orderBy: id orderDirection: asc){
    id
    owner
  }
}
`;

const blockNumber = 9664970; // Dec-12-2020 12:59:57 PM +UTC
//const blockNumber = 9000000; // Dec-12-2020 12:59:57 PM +UTC

(async () => {
  const landOwners: {id: string; owner: string}[] = await query(
    queryString,
    'lands',
    {
      blockNumber,
    }
  );
  console.log(landOwners.length);
  console.log(landOwners[5]);

  const entries = landOwners.map((landOwner) => ({
    id: landOwner.id,
    owner: landOwner.owner,
  }));

  const csv = new ObjectsToCsv(entries);

  // Save to file:
  await csv.toDisk('./landIdToOwnerId_9664970.csv');

  // Return the CSV file as string:
  console.log(await csv.toString());
})();
