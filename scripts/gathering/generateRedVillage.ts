import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import csv from 'csv-parser';
import {ethers} from 'hardhat';

const NFTIds = {
  barbarian:
    '106914169990095390281037231343508379541260342522117732053367995686304065005572', // barbarian
  druid:
    '106914169990095390281037231343508379541260342522117732053367995686304065005571', // druid
  paladin:
    '106914169990095390281037231343508379541260342522117732053367995686304065005570', // paladin
  ranger:
    '106914169990095390281037231343508379541260342522117732053367995686304065005569', // ranger
  wizard:
    '106914169990095390281037231343508379541260342522117732053367995686304065005568', // wizard
};

type ERC1155data = {
  ids: string[];
  values: number[];
  contractAddress: string;
};

void (async () => {
  const assetContract = await ethers.getContract('Asset');

  const csvFilePath = path.resolve(
    __dirname,
    '../../data/giveaways/multi_giveaway_1/giveaway_red_village.csv'
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
        ids.push(NFTIds.barbarian);
        amounts.push(parseInt(data.Barbarian, 10));
      }
      if (data.Druid) {
        ids.push(NFTIds.druid);
        amounts.push(parseInt(data.Druid, 10));
      }
      if (data.Paladin) {
        ids.push(NFTIds.paladin);
        amounts.push(parseInt(data.Paladin, 10));
      }
      if (data.Ranger) {
        ids.push(NFTIds.ranger);
        amounts.push(parseInt(data.Ranger, 10));
      }
      if (data.Wizard) {
        ids.push(NFTIds.wizard);
        amounts.push(parseInt(data.Wizard, 10));
      }
      assetClaims.push({
        to: data.Address,
        erc1155: [
          {
            ids: ids,
            values: amounts,
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
        'data/giveaways/multi_giveaway_1/giveaway_red_village.json',
        JSON.stringify(assetClaims, null, '  ')
      );
    });
})();
