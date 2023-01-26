/**
 * How to use:
 *  - yarn execute <NETWORK> ./scripts/giveaway/totals.ts
 */
import fs from 'fs';
import {MultiClaim} from '../../lib/merkleTreeHelper';
import tsbApi from './tsb-api';
import {
  getMultiGiveawayPaths,
  createtMultigiveawayBasePath,
  getOutputBasePath,
} from './utils';

const main = async () => {
  createtMultigiveawayBasePath();
  const giveaways = getMultiGiveawayPaths();
  const outputBasePath = getOutputBasePath();
  const result = [];
  for (const giveaway of giveaways) {
    const claim = await tsbApi.getClaim(giveaway);
    const file = `${outputBasePath}/${giveaway}.json`;
    const buffer = fs.readFileSync(file);
    const fileContent = JSON.parse(buffer.toString());
    result.push({
      claim,
      total: (fileContent as Array<MultiClaim>).length,
    });
  }

  result
    .sort((a, b) => a.claim.id - b.claim.id)
    .forEach(
      (e: {
        claim: {id: number; name: string; rootHash: string};
        total: number;
      }) => {
        console.log(
          `${e.claim.id} - ${e.claim.name.trim()} (${e.claim.rootHash}) -> ${
            e.total
          }`
        );
      }
    );

  console.log('done!');
};

main().catch((err) => console.error(err));
