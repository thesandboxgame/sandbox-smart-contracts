/**
 * How to use:
 *  - yarn execute <NETWORK> ./scripts/gathering/generateERC1155GiveawayJson.ts <CSVFile> <ResultFilename>
 *
 * CSVFile: The relative path of the CSV giveaway file (should have columns (aka first line) =>  Address,TokenID,Amount). see data/giveaways/multi_giveaway_1/giveaway_mauer.csv
 * ResultFilename: The result JSON filename without ".json". This file will be written in data/giveaways/multi_giveaway_1/
 */

import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import csv from 'csv-parser';
import {ethers} from 'hardhat';
import type {AssetClaimData, ERC1155data} from './giveawayData';

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

const assetsByAdress = new Map<string, ERC1155data>();

(async () => {
  const assetContract = await ethers.getContract('Asset');

  const csvFilePath = path.resolve(__dirname, csvFile);

  const assetClaims: AssetClaimData[] = [];

  fs.createReadStream(csvFilePath)
    .pipe(csv())
    .on('data', function (data) {
      const uppercaseAddress = data.Address.toLowerCase();
      if (!assetsByAdress.has(uppercaseAddress)) {
        const erc1155data: ERC1155data = {
          ids: [data.TokenID],
          values: [Number(data.Amount)],
          contractAddress: assetContract.address,
        };
        assetsByAdress.set(uppercaseAddress, erc1155data);
      } else {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const erc1155data: ERC1155data = assetsByAdress.get(uppercaseAddress)!;
        erc1155data.ids.push(data.TokenID);
        erc1155data.values.push(Number(data.Amount));
      }
    })
    .on('end', function () {
      for (const data of assetsByAdress.entries()) {
        assetClaims.push({
          to: data[0],
          erc1155: [data[1]],
          erc721: [],
          erc20: {
            amounts: [],
            contractAddresses: [],
          },
        });
      }

      fs.writeFileSync(
        `data/giveaways/multi_giveaway_1/${resultFilename}.json`,
        JSON.stringify(assetClaims, null, '  ')
      );
    });
})();
