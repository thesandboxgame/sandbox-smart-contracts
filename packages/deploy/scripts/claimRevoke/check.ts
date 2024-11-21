/**
 * How to use:
 *  - yarn ts-node scripts/claimRevoke/check.ts
 * This script always use: ./enabled_claims_denied_users.csv
 * This script always use: ./event_data.csv
 */
import csv from "csv-parser";
import * as fs from "fs";
import * as path from "path";
import { ethers, Result } from "ethers";

const CHUNK_SIZE = 1000;
type IDS = { [k: string]: { user_id: string; claim_id: string } };

async function main(claimsFilename: string, eventsFilename: string) {
  const ids: IDS = await new Promise((resolve) => {
    const ret: IDS = {};
    fs.createReadStream(claimsFilename)
      .pipe(csv())
      .on("data", (data) => {
        const k = BigInt(data.claim_id).toString();
        ret[k] = data;
      })
      .on("end", () => {
        resolve(ret);
      });
  });
  const eventData: string[] = await new Promise((resolve) => {
    const ret: string[] = [];
    fs.createReadStream(eventsFilename)
      .pipe(csv())
      .on("data", (data) => {
        ret.push(data.data);
      })
      .on("end", () => {
        resolve(ret);
      });
  });

  const coder = ethers.AbiCoder.defaultAbiCoder();
  for (const d of eventData) {
    const result: Result = coder.decode(["uint256[]"], d);
    for (const r of result[0]) {
      const k = r.toString();
      if (ids[k]) {
        delete ids[k];
      } else {
        // console.log(`this one was revoked somewhere else or duplicated which is ok ${k}`);
      }
    }
  }
  console.log(`"user_id","claim_id"`);
  for (const e in ids) {
    const v = ids[e];
    console.log(`"${v.user_id}","${v.claim_id}"`);
  }
}

main(
  path.join(__dirname, "enabled_claims_denied_users.csv"),
  path.join(__dirname, "event_data.csv")
).catch((err) => console.error(err));
