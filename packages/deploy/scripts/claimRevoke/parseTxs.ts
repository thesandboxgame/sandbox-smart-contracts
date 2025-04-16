/**
 * Get the transactions from the tx group
 * How to use:
 *  - yarn hardhat run --network <NETWORK> scripts/claimRevoke/parseTxs.ts
 */
import * as fs from 'node:fs';
// @ts-ignore
import path from 'path';
import {RelayerTransaction} from '@openzeppelin/defender-sdk-relay-signer-client/lib/models/transactions';
// @ts-ignore
import {deployments, ethers} from 'hardhat';
// @ts-ignore
import csv from 'csv-parser';

async function getIds(): Promise<bigint[]> {
  const filename = path.join(__dirname, 'enabled_claims_denied_users.csv');
  return await new Promise((resolve) => {
    const ret: bigint[] = [];
    fs.createReadStream(filename)
      .pipe(csv())
      .on('data', (data) => {
        ret.push(BigInt(data.blockchainclaimid));
      })
      .on('end', () => {
        resolve(ret);
      });
  });
}

async function main() {
  const txs = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'txs_data.json'), 'utf-8')
  ) as RelayerTransaction[];
  console.log(
    txs.filter((x) => x.to != '0x3d49b60783dB5FA4341355f31e4D9CBa63E53035')
  );
  const ids = await getIds();
  const signedMultiGiveaway = await deployments.get('SignedMultiGiveaway');
  const iface = new ethers.Interface(signedMultiGiveaway.abi);
  const decodedIds = new Set<BigInt>();
  for (const t of txs) {
    const decoded = iface.decodeFunctionData('revokeClaims', t.data);
    decoded[0].forEach((x) => decodedIds.add(x));
  }
  const vals = Array.from(decodedIds.values());
  console.log(ids.length, vals.length);
  console.log(
    'diff',
    ids.filter((x) => !decodedIds.has(x))
  );
}

main().catch((err) => console.error(err));
