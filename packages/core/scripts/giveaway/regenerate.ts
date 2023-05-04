/**
 * How to use:
 *  - yarn execute <NETWORK> ./scripts/giveaway/regenerate.ts
 */
import fs from 'fs';
import csv from 'csv-parser';
import {
  ERC1155Claim,
  ERC721Claim,
  MultiClaim,
} from '../../lib/merkleTreeHelper';
import tsbApi from './tsb-api';
import {
  getClaimTxs,
  getProofsFileData,
  getMultiGiveawayPaths,
  createtMultigiveawayBasePath,
  getOutputBasePath,
} from './utils';

const createClaimFiles = async (
  bannedWallets: Array<{user_wallet: string}>
) => {
  createtMultigiveawayBasePath();
  const giveaways = getMultiGiveawayPaths();
  const basePath = getOutputBasePath();

  if (!fs.existsSync(basePath)) {
    fs.mkdirSync(basePath, {recursive: true});
  }

  for (const giveaway of giveaways) {
    const claim = await tsbApi.getClaim(giveaway);
    const proofsFileData = getProofsFileData(giveaway);
    const isBanned = (walletAddress: string): boolean => {
      return bannedWallets.some(
        ({user_wallet}) =>
          user_wallet.toLowerCase() === walletAddress.toLowerCase()
      );
    };

    if (proofsFileData) {
      const resultFileJSON = `${basePath}/${giveaway}.json`;

      if (fs.existsSync(resultFileJSON)) {
        console.log(`${claim.name} already processed.`);
      } else {
        console.log(`getting claim transactions for ${claim.name}...`);

        const claimed = await getClaimTxs(claim.rootHash);
        const result: Array<MultiClaim> = [];
        const bannedResult: Array<MultiClaim> = [];
        const bannedResultFileJSON = `${basePath}/${giveaway}_banned.json`;
        const resultFileCSV = `${basePath}/${giveaway}.csv`;

        for (let i = 0; i < proofsFileData.length; i++) {
          const entry = proofsFileData[i];
          const wallet = entry.to.toLowerCase();
          const isClaimed = claimed.some((claim) => claim.wallet.id === wallet);
          const banned = isBanned(entry.to);

          if (!isClaimed) {
            const {erc20, erc1155, erc721, to} = entry;
            const newEntry = {
              erc20,
              erc1155,
              erc721,
              to,
            };
            if (banned) {
              bannedResult.push(newEntry);
            } else {
              result.push(newEntry);
            }
          }

          console.log(`${claim.name} - ${i + 1}/${proofsFileData.length}`);
        }

        fs.writeFileSync(resultFileJSON, JSON.stringify(result));
        if (bannedResult.length) {
          fs.writeFileSync(bannedResultFileJSON, JSON.stringify(bannedResult));
        }

        let resultFileCSVContent =
          'type,contractAddress,tokenId,amount,address\r\n';
        result.forEach((r) => {
          r.erc1155.forEach((entry: ERC1155Claim) => {
            entry.ids.forEach((assetId, assetIndex) => {
              resultFileCSVContent += `ERC1155,${entry.contractAddress},${assetId},${entry.values[assetIndex]},${r.to}\r\n`;
            });
          });
          r.erc721.forEach((entry: ERC721Claim) => {
            entry.ids.forEach((assetId: number) => {
              resultFileCSVContent += `ERC721,${entry.contractAddress},${assetId},1,${r.to}\r\n`;
            });
          });
          r.erc20.amounts.forEach((amount: number, index: number) => {
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
};

const main = async () => {
  const bannedWallets: Array<{user_wallet: string}> = [];
  const bannedWalletsFile = `${__dirname}/deny_list_wallets.csv`;
  if (!fs.existsSync(bannedWalletsFile)) {
    throw new Error(`The file does not exist: ${bannedWalletsFile}`);
  }
  fs.createReadStream(bannedWalletsFile)
    .pipe(csv(['user_wallet']))
    .on('data', (data) => bannedWallets.push(data))
    .on('end', () => {
      void createClaimFiles(bannedWallets).then(() => {
        console.log('done!');
      });
    });
};

main().catch((err) => console.error(err));
