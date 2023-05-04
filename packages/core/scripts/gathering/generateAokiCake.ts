import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import csv from 'csv-parser';
import {ethers} from 'hardhat';

type ERC1155data = {
  ids: string[];
  values: number[];
  contractAddress: string;
};

void (async () => {
  const assetContract = await ethers.getContract('Asset');

  const csvFilePath = path.resolve(
    __dirname,
    '../../data/giveaways/multi_giveaway_1/Aokiverse_cake.csv'
  );

  const assetClaims: {
    to: string;
    erc1155: ERC1155data[];
    erc721: never[];
    erc20: {amounts: never[]; contractAddresses: never[]};
  }[] = [];

  fs.createReadStream(csvFilePath)
    .pipe(csv())
    .on('data', function (data) {
      console.log(data);
      assetClaims.push({
        to: data.Address,
        erc1155: [
          {
            ids: [
              '55464657044963196816950587289035428064568320970692304673817341489688403249152',
            ],
            values: [1],
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
        'data/giveaways/multi_giveaway_1/giveaway_Aoki_cake.json',
        JSON.stringify(assetClaims, null, '  ')
      );
    });
})();
