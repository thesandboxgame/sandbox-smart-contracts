import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import csv from 'csv-parser';

const NFTIds = [
  '106914169990095390281037231343508379541260342522117732053367995686304065005572', // barbarian
  '106914169990095390281037231343508379541260342522117732053367995686304065005571', // druid
  '106914169990095390281037231343508379541260342522117732053367995686304065005570', // paladin
  '106914169990095390281037231343508379541260342522117732053367995686304065005569', // ranger
  '106914169990095390281037231343508379541260342522117732053367995686304065005568', // wizard
];

type ERC1155data = {
  ids: string[];
  values: number[];
  contractAddress: string;
};
(async () => {
  const csvFilePath = path.resolve(
    __dirname,
    '../../data/giveaways/multi_giveaway_red_village/giveaway_red_village.csv'
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
      const ids: string[] = [];
      const amounts: number[] = [];

      if (data.Barbarian) {
        ids.push(NFTIds[0]);
        amounts.push(parseInt(data.Barbarian, 10));
      }
      if (data.Druid) {
        ids.push(NFTIds[1]);
        amounts.push(parseInt(data.Druid, 10));
      }
      if (data.Paladin) {
        ids.push(NFTIds[2]);
        amounts.push(parseInt(data.Paladin, 10));
      }
      if (data.Wizard) {
        ids.push(NFTIds[3]);
        amounts.push(parseInt(data.Wizard, 10));
      }
      assetClaims.push({
        to: data.Address,
        erc1155: [
          {
            ids: ids,
            values: amounts,
            contractAddress: '0xa342f5D851E866E18ff98F351f2c6637f4478dB5',
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
        'data/giveaways/multi_giveaway_red_village/assets_mainnet.json',
        JSON.stringify(assetClaims, null, '  ')
      );
    });
})();
