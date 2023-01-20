import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import tsbApi from './tsb-api';
import {
  isPolygon,
  getClaimTxs,
  getMultiGiveawayFiles,
  getProofsFileData,
  multigiveawayPath,
} from './utils';

const main = async () => {
  if (!fs.existsSync(multigiveawayPath)) {
    throw new Error(`Directory not exists: ${multigiveawayPath}`);
  }

  const giveaways = getMultiGiveawayFiles();

  for (const giveaway of giveaways) {
    const claim = await tsbApi.getClaim(giveaway);
    const proofsFileData = getProofsFileData(giveaway);

    if (proofsFileData) {
      const subPath = isPolygon ? 'polygon' : 'mumbai';
      const basePath = `${__dirname}/output/${subPath}`;

      if (!fs.existsSync(basePath)) {
        fs.mkdirSync(basePath, {recursive: true});
      }

      const resultFileJSON = path.join(basePath, `${giveaway}.json`);

      if (fs.existsSync(resultFileJSON)) {
        console.log(`${claim.name} already processed.`);
      } else {
        console.log(`getting claim transactions for ${claim.name}...`);
        const claimed = await getClaimTxs(claim.rootHash);
        const result = [];

        for (let i = 0; i < proofsFileData.length; i++) {
          const entry = proofsFileData[i];
          const wallet = entry.to.toLowerCase();
          const isClaimed = claimed.some((claim) => claim.wallet.id === wallet);

          if (!isClaimed) {
            const {erc20, erc1155, erc721, to} = entry;
            result.push({
              erc20,
              erc1155,
              erc721,
              to,
            });
          }

          console.log(`${claim.name} - ${i + 1}/${proofsFileData.length}`);
        }

        fs.writeFileSync(resultFileJSON, JSON.stringify(result));

        const resultFileCSV = path.join(basePath, `${giveaway}.csv`);

        fs.writeFileSync(
          resultFileCSV,
          'type,contractAddress,tokenId,amount,address\r\n'
        );

        result.forEach((r) => {
          r.erc20.amounts.forEach((amount: string, index: number) => {
            const contractAddress = r.erc20.contractAddresses[index];
            fs.writeFileSync(
              resultFileCSV,
              `ERC20,${contractAddress},,${amount},${r.to}\r\n`,
              {
                flag: 'a+',
              }
            );
          });
        });
      }
    } else {
      console.log(`${claim.name} proof file missing.`);
    }
  }

  console.log('done!');
};

main().catch((err) => console.error(err));
