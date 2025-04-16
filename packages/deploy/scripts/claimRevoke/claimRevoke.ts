/**
 * How to use:
 *  create the chunks and done_chunks directories
 *  call split to split the chunks
 *  - yarn hardhat run --network <NETWORK> scripts/claimRevoke/claimRevoke.ts
 * This script always use: ./enabled_claims_denied_users.csv
 * This script needs: RELAYER_API_KEY and RELAYER_API_SECRET
 */
import {RelayerGroupStatus} from '@openzeppelin/defender-sdk-relay-signer-client';
import {configDotenv} from 'dotenv';
import {Defender} from '@openzeppelin/defender-sdk';
import {
  DefenderRelayProvider,
  DefenderRelaySigner,
} from '@openzeppelin/defender-sdk-relay-signer-client/lib/ethers';
import {ApiRelayerParams} from '@openzeppelin/defender-sdk-relay-signer-client/lib/models/relayer';
// @ts-ignore
import {deployments, ethers} from 'hardhat';
import * as fs from 'node:fs';
// @ts-ignore
import path from 'path';

async function getChunks() {
  const regexp = /^chunk_([0-9]+)\.json$/g;
  const files = fs.readdirSync(path.join(__dirname, 'chunks'));
  return files
    .map((x) => Array.from(x.matchAll(regexp)))
    .filter((x) => x.length > 0)
    .map((x) => x[0][1]);
}

async function main() {
  configDotenv();
  if (!process.env.RELAYER_API_KEY || !process.env.RELAYER_API_SECRET) {
    throw new Error('Missing env vars RELAYER_API_KEY, RELAYER_API_SECRET');
  }
  console.log('using ethers version ', ethers.version);
  const chunks = await getChunks();

  const defender = new Defender({
    relayerApiKey: process.env.RELAYER_API_KEY,
    relayerApiSecret: process.env.RELAYER_API_SECRET,
  });
  const relayerStatus =
    (await defender.relaySigner.getRelayerStatus()) as RelayerGroupStatus;
  const rAddresses = relayerStatus.relayers.map((x) => x.address);
  console.log('relayer addresses', rAddresses);

  const credentials = {
    apiKey: process.env.RELAYER_API_KEY,
    apiSecret: process.env.RELAYER_API_SECRET,
  } as ApiRelayerParams;
  const provider = new DefenderRelayProvider(credentials);
  const signedMultiGiveaway = await deployments.get('SignedMultiGiveaway');
  console.log('signedMultiGiveaway.address', signedMultiGiveaway.address);

  await Promise.allSettled(
    rAddresses.map(async (rAddress, rIdx) => {
      const signer = new DefenderRelaySigner(credentials, provider, rAddress, {
        speed: 'fast',
        ethersVersion: 'v6',
      });
      const contract = await ethers.getContract('SignedMultiGiveaway', signer);
      while (chunks.length > 0) {
        const idx = chunks.shift();

        const fileName = `chunk_${idx}.json`;
        const src = path.join(__dirname, 'chunks', fileName);
        const chunk = JSON.parse(fs.readFileSync(src, 'utf-8'));
        console.log(
          `sending tx for chunk ${idx}, chunk len ${chunk.length}, using contract ${rIdx}`
        );
        const tx = await contract.revokeClaims(chunk);
        const receipt = await tx.wait();
        console.log('contract', rIdx, receipt.blockNumber, receipt.hash);
        fs.renameSync(src, path.join(__dirname, 'done_chunks', fileName));
        // const status =
        //   (await defender.relaySigner.getRelayerStatus()) as RelayerGroupStatus;
        // const myStatus = status.relayers.filter((x) => x.address == rAddress);
        // console.log(rIdx, myStatus);
      }
    })
  );
}

main().catch((err) => console.error(err));
