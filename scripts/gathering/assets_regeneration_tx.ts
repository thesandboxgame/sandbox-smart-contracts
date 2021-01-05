import fs from 'fs-extra';

const owners = JSON.parse(fs.readFileSync('tmp/asset_owners.json').toString());

type Token = {
  id: string;
  tokenURI: string;
  supply: number;
};

const collections: Record<string, Token> = {};

type TransferTX = {
  to: string;
  ids: string[];
  values: number[];
};

const transferTxs: TransferTX[] = [];

for (const owner of owners) {
  const ids = [];
  const values = [];
  for (const assetToken of owner.assetTokens) {
    const collectionId = assetToken.token.collection.id;
    if (!collections[collectionId]) {
      collections[collectionId] = {
        id: collectionId,
        tokenURI: assetToken.token.collection.tokenURI,
        supply: assetToken.token.collection.supply,
      };
    }
    ids.push(assetToken.token.id);
    values.push(assetToken.quantity);
  }
  transferTxs.push({
    to: owner.id,
    ids,
    values,
  });
}

const collectionIds = Object.keys(collections);
const collectionMints = [];
console.log({numCollection: collectionIds.length});
for (const collectionId of collectionIds) {
  const collection = collections[collectionId];
  console.log({collectionId, supply: collection.supply});
  collectionMints.push(collection);
}

let maxNum = 0;
for (const tx of transferTxs) {
  if (tx.ids.length > maxNum) {
    maxNum = tx.ids.length;
  }
  // console.log({num: tx.ids.length, to: tx.to, ids: tx.ids, values: tx.values});
}

console.log({maxNum});

fs.ensureDirSync('tmp');
fs.writeFileSync(
  'tmp/asset_regenerations.json',
  JSON.stringify({collectionMints, transferTxs}, null, '  ')
);
