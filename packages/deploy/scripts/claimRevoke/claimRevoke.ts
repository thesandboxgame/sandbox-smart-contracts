/**
 * How to use:
 *  - yarn hardhat run --network <NETWORK> scripts/claimRevoke/claimRevoke.ts
 * This script always use: ./enabled_claims_denied_users.csv
 * This script needs: RELAYER_API_KEY and RELAYER_API_SECRET
 */
import {ethers} from 'hardhat';
import csv from 'csv-parser';
import * as fs from 'fs';
import {
  DefenderRelayProvider,
  DefenderRelaySigner,
} from '@openzeppelin/defender-sdk-relay-signer-client/lib/ethers';
import * as path from 'path';

const CHUNK_SIZE = 1000;

async function main(filename: string) {
  if (
    !process.env.RELAYER_API_KEY ||
    !process.env.RELAYER_API_SECRET ||
    !process.env.RELAYER_ADDRESS
  ) {
    throw new Error(
      'Missing env vars RELAYER_API_KEY, RELAYER_API_SECRET and RELAYER_ADDRESS'
    );
  }

  const ids: BitInt[] = ([] = await new Promise((resolve) => {
    const ret: {user_id: string; claim_id: string}[] = [];
    fs.createReadStream(filename)
      .pipe(csv())
      .on('data', (data) => {
        ret.push(BigInt(data.claim_id));
      })
      .on('end', () => {
        resolve(ret);
      });
  }));
  const chunks = [];
  for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
    chunks.push(ids.slice(i, i + CHUNK_SIZE));
  }
  const credentials = {
    apiKey: process.env.RELAYER_API_KEY,
    apiSecret: process.env.RELAYER_API_SECRET,
    authConfig: undefined,
  };
  const provider = new DefenderRelayProvider(credentials);
  const signer = new DefenderRelaySigner(
    credentials,
    provider,
    process.env.RELAYER_ADDRESS,
    {speed: 'fast', ethersVersion: 'v6'}
  );
  const signedMultiGiveaway = await ethers.getContract(
    'SignedMultiGiveaway',
    signer
  );
  for (const [i, c] of chunks.entries()) {
    // if (i > 1) {
    //   console.log(`skip tx for chunk ${i} of ${chunks.length}`);
    //   continue;
    // }
    console.log(
      `sending tx for chunk ${i} of ${chunks.length}, len ${c.length}`
    );
    const tx = await signedMultiGiveaway.revokeClaims(c);
    const receipt = await tx.wait();
    console.log(receipt);
  }
}

main(path.join(__dirname, 'enabled_claims_denied_users.csv')).catch((err) =>
  console.error(err)
);
