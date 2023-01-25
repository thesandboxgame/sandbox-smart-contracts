/**
 * How to use:
 *  - yarn execute <NETWORK> ./scripts/giveaway/regenerate.ts
 */
import fs from 'fs';
import path from 'path';
import tsbApi from './tsb-api';
import {
  getClaimTxs,
  getProofsFileData,
  getMultiGiveawayPaths,
  createtMultigiveawayBasePath,
  getOutputBasePath,
} from './utils';

const main = async () => {
  createtMultigiveawayBasePath();
  const giveaways = getMultiGiveawayPaths();

  for (const giveaway of giveaways) {
    const claim = await tsbApi.getClaim(giveaway);
    const proofsFileData = getProofsFileData(giveaway);

    if (proofsFileData) {
      const basePath = getOutputBasePath();
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
        let resultFileCSVContent =
          'type,contractAddress,tokenId,amount,address\r\n';
        result.forEach((r) => {
          r.erc1155.forEach(
            (entry: {
              ids: Array<string>;
              values: Array<number>;
              contractAddress: string;
            }) => {
              entry.ids.forEach((assetId, assetIndex) => {
                resultFileCSVContent += `ERC1155,${entry.contractAddress},${assetId},${entry.values[assetIndex]},${r.to}\r\n`;
              });
            }
          );
          r.erc721.forEach(
            (entry: {ids: Array<string>; contractAddress: string}) => {
              entry.ids.forEach((assetId: string) => {
                resultFileCSVContent += `ERC721,${entry.contractAddress},${assetId},1,${r.to}\r\n`;
              });
            }
          );
          r.erc20.amounts.forEach((amount: string, index: number) => {
            const contractAddress = r.erc20.contractAddresses[index];
            resultFileCSVContent += `ERC20,${contractAddress},,${amount},${r.to}\r\n`;
          });
        });
        fs.writeFileSync(resultFileCSV, resultFileCSVContent);
      }
    } else {
      console.log(`${claim.name} proof file missing.`);
    }
  }

  console.log('done!');
};

main().catch((err) => console.error(err));
