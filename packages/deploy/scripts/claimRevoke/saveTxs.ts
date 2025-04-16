/**
 * Get the transactions from the tx group
 * How to use:
 *  - yarn ts-node scripts/claimRevoke/saveTxs.ts
 */
import {configDotenv} from 'dotenv';
import {Defender} from '@openzeppelin/defender-sdk';
import {PaginatedTransactionResponse} from '@openzeppelin/defender-sdk-relay-signer-client/lib/models/transactions';
import * as fs from 'node:fs';
// @ts-ignore
import path from 'path';

async function main() {
  configDotenv();
  if (!process.env.RELAYER_API_KEY || !process.env.RELAYER_API_SECRET) {
    throw new Error('Missing env vars RELAYER_API_KEY, RELAYER_API_SECRET');
  }
  const defender = new Defender({
    relayerApiKey: process.env.RELAYER_API_KEY,
    relayerApiSecret: process.env.RELAYER_API_SECRET,
  });
  const LIMIT = 30;
  const txs = [];
  let status = await defender.relaySigner.listTransactions({limit: LIMIT});
  for (let i = 0; ; i++) {
    const t = status as PaginatedTransactionResponse;
    console.log(i, t.items.length);
    txs.push(...t.items);
    if (!t.next) {
      console.log('done');
      break;
    }
    status = await defender.relaySigner.listTransactions({
      next: t.next,
      limit: LIMIT,
    });
  }
  console.log('TOTAL', txs.length);
  fs.writeFileSync(
    path.join(__dirname, 'txs_data.json'),
    JSON.stringify(txs, null, 4)
  );
}

main().catch((err) => console.error(err));
