/**
 * How to use:
 *  - yarn ts-node scripts/claimRevoke/split.ts
 */
// @ts-ignore
import csv from 'csv-parser';
import * as fs from 'fs';
import * as path from 'path';

const CHUNK_SIZE = 1000;

async function main() {
  const filename = path.join(__dirname, 'enabled_claims_denied_users.csv');
  const ids: string[] = await new Promise((resolve) => {
    const ret: string[] = [];
    fs.createReadStream(filename)
      .pipe(csv())
      .on('data', (data) => {
        ret.push(BigInt(data.blockchainclaimid).toString());
      })
      .on('end', () => {
        resolve(ret);
      });
  });
  fs.mkdirSync(path.join(__dirname, 'chunks'));
  fs.mkdirSync(path.join(__dirname, 'done_chunks'));
  const chunks = [];
  let j = 0;
  for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
    fs.writeFileSync(
      path.join(__dirname, 'chunks', `chunk_${j++}.json`),
      JSON.stringify(ids.slice(i, i + CHUNK_SIZE), null, 4)
    );
  }
}

main().catch((err) => console.error(err));
