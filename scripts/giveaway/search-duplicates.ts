import fs from 'fs';
import {
  isPolygon,
  getMultiGiveawayFiles,
  getProofsFileData,
  multigiveawayPath,
} from './utils';

const main = () => {
  const hashMap: {
    [key: string]: {
      files: Array<number>;
    };
  } = {};

  if (!fs.existsSync(multigiveawayPath)) {
    throw new Error(`Directory not exists: ${multigiveawayPath}`);
  }

  const giveaways = getMultiGiveawayFiles();

  for (const giveaway of giveaways) {
    const data = getProofsFileData(giveaway);
    if (data) {
      data.forEach((entry) => {
        if (hashMap[entry.salt]) {
          hashMap[entry.salt].files.push(giveaway);
        } else {
          hashMap[entry.salt] = {
            files: [giveaway],
          };
        }
      });
    }
  }

  const duplicates = Object.entries(hashMap).filter(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    ([_key, value]) => value.files.length > 1
  );

  const subPath = isPolygon ? 'polygon' : 'mumbai';
  const basePath = `${__dirname}/output/${subPath}`;

  if (!fs.existsSync(basePath)) {
    fs.mkdirSync(basePath, {recursive: true});
  }
  const fileName = `${basePath}/duplicates.csv`;

  fs.writeFileSync(fileName, 'salt,giveaways\r\n');
  duplicates.forEach((e) => {
    const line = `${e[0]},"${e[1].files.join(',')}"`;
    fs.writeFileSync(fileName, `${line}\r\n`, {flag: 'a+'});
    console.log(line);
  });

  console.log('done!');
};

try {
  main();
} catch (err) {
  console.error(err);
}
