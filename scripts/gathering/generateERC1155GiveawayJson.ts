/**
 * How to use:
 *  - yarn execute <NETWORK> ./setup/generateERC1155GiveawayJson.ts <CSVFile> <ResultFilename>
 *
 * CSVFile: The relative path of the CSV giveaway file (should have columns (aka first line) =>  Address,TokenID,Amount). see data/giveaways/multi_giveaway_1/giveaway_mauer.csv
 * ResultFilename: The result JSON filename without ".json". This file will be written in data/giveaways/multi_giveaway_1/
 */

import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import csv from 'csv-parser';
import {ethers} from 'hardhat';
import type {AssetClaimData} from './giveawayData';

const args = process.argv.slice(2);

const csvFile = args[0];
const resultFilename = args[1];
if (!csvFile || csvFile === '') {
  throw new Error(`csvFile need to be specified`);
}
if (!resultFilename || resultFilename === '') {
  throw new Error(`resultFilename need to be specified`);
}

console.log('file: ', csvFile);
console.log('filename:', resultFilename);

(async () => {
  const assetContract = await ethers.getContract('Asset');

  const csvFilePath = path.resolve(__dirname, csvFile);

  const assetClaims: AssetClaimData[] = [];

  fs.createReadStream(csvFilePath)
    .pipe(csv())
    .on('data', function (data) {
      console.log(data);
      assetClaims.push({
        to: data.Address,
        erc1155: [
          {
            ids: [data.TokenID],
            values: [Number(data.Amount)],
            contractAddress: assetContract.address,
          },
        ],
        erc721: [],
        erc20: {
          amounts: [],
          contractAddresses: [],
        },
      });
    })
    .on('end', function () {
      fs.writeFileSync(
        `data/giveaways/multi_giveaway_1/${resultFilename}.json`,
        JSON.stringify(assetClaims, null, '  ')
      );
    });
})();
