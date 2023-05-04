/**
 * How to use:
 *  - yarn execute <NETWORK> ./scripts/giveaway/search-duplicates.ts
 */
import fs from 'fs';
import {network} from 'hardhat';
import {
  createtMultigiveawayBasePath,
  getMultiGiveawayPaths,
  getProofsFileData,
} from './utils';

const main = () => {
  const hashMap: {
    [key: string]: {
      files: Array<number>;
    };
  } = {};

  createtMultigiveawayBasePath();
  const giveaways = getMultiGiveawayPaths();

  for (const giveaway of giveaways) {
    const data = getProofsFileData(giveaway);
    data.forEach((entry) => {
      if (!entry.salt) {
        throw new Error(
          `missing salt for giveaway ${giveaway} and wallet address ${entry.to}`
        );
      }
      if (hashMap[entry.salt]) {
        hashMap[entry.salt].files.push(giveaway);
      } else {
        hashMap[entry.salt] = {
          files: [giveaway],
        };
      }
    });
  }

  const duplicates = Object.entries(hashMap).filter(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    ([_key, value]) => value.files.length > 1
  );

  console.log(`writing ${duplicates.length} duplicated records...`);

  const basePath = `${__dirname}/output/${network.name}`;

  if (!fs.existsSync(basePath)) {
    fs.mkdirSync(basePath, {recursive: true});
  }

  const fileName = `${basePath}/duplicates.csv`;

  fs.writeFileSync(fileName, 'salt,giveaways\r\n');
  duplicates.forEach((e) => {
    const line = `${e[0]},"${e[1].files.join(',')}"`;
    fs.writeFileSync(fileName, `${line}\r\n`, {flag: 'a+'});
  });

  console.log('done!');
};

try {
  main();
} catch (err) {
  console.error(err);
}
