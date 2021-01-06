import fs from 'fs-extra';
import {BigNumber} from '@ethersproject/bignumber';

const base32Alphabet = 'abcdefghijklmnopqrstuvwxyz234567';
const bn32 = BigNumber.from(32);
function toHash(ipfsUri: string): string {
  const {ipfsBase} = extractIpfsString(ipfsUri);
  const hashUri = ipfsBase.substr(7);
  const numCharacters = hashUri.length;
  let bn = BigNumber.from(0);
  let counter = 0;
  for (let i = numCharacters - 1; i >= 0; i--) {
    const char = hashUri.charAt(i);
    let val = base32Alphabet.indexOf(char);
    if (counter == 0) {
      val = val >> 2;
      bn = bn.add(val);
    } else {
      bn = bn.add(
        BigNumber.from(val)
          .mul(bn32.pow(counter - 1))
          .mul(8)
      );
    }

    counter++;
  }
  return bn.toHexString();
}

const bn2 = BigNumber.from(2);
function extractFromId(
  tokenID: string
): {
  packID: BigNumber;
  creator: string;
  // isNFT: boolean;
  // uriID: BigNumber;
  // packIndex: BigNumber;
  // packNumNFTtypes: BigNumber;
} {
  const bn = BigNumber.from(tokenID);
  return {
    packID: bn.shr(19).mod(bn2.pow(15)),
    creator: bn.shr(96).toHexString(),
  };
}

const owners = JSON.parse(fs.readFileSync('tmp/asset_owners.json').toString());

type Token = {
  idHex: string;
  id: string;
  creator: string;
  packID: string;
  tokenURI: string;
  ipfsHash: string;
  supply: number;
  rarity: number;
};

type BatchMint = {
  creator: string;
  packID: string;
  ipfsHash: string;
  supplies: number[];
  rarities: number[];
  tokenURIs: string[];
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
      const tokenURI = assetToken.token.collection.tokenURI;
      const {packID, creator} = extractFromId(collectionId);
      collections[collectionId] = {
        idHex: BigNumber.from(collectionId).toHexString(), // TODO extract packID and creator, etc... (rarity ?)
        id: collectionId,
        creator,
        packID: packID.toString(),
        tokenURI,
        ipfsHash: toHash(tokenURI),
        supply: assetToken.token.collection.supply,
        rarity: assetToken.token.rarity,
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
  // console.log({collectionId, supply: collection.supply});
  collectionMints.push(collection);
}

function extractIpfsString(
  tokenURI: string
): {ipfsBase: string; counter: number} {
  const uri = tokenURI.substr(7);
  const split = uri.split('/');
  const ipfsBase = split[0];
  const counter = parseInt(split[1].split('.')[0]);
  return {
    ipfsBase,
    counter,
  };
}

collectionMints.sort((c1, c2) => {
  const {ipfsBase: ipfsBase1, counter: counter1} = extractIpfsString(
    c1.tokenURI
  );
  const {ipfsBase: ipfsBase2, counter: counter2} = extractIpfsString(
    c2.tokenURI
  );
  if (ipfsBase1 === ipfsBase2) {
    return counter1 < counter2 ? -1 : 1;
  }
  return ipfsBase1 < ipfsBase2 ? -1 : 1;
});

const batchMints: BatchMint[] = [];
let lastIpfsString = '';
let currentBatch: Token[] = [];
for (const collectionMint of collectionMints) {
  const {ipfsBase, counter} = extractIpfsString(collectionMint.tokenURI);
  if (lastIpfsString != ipfsBase) {
    if (lastIpfsString !== '') {
      batchMints.push({
        creator: currentBatch[0].creator,
        ipfsHash: currentBatch[0].ipfsHash,
        packID: currentBatch[0].packID,
        supplies: currentBatch.map((c) => c.supply),
        rarities: currentBatch.map((c) => c.rarity),
        tokenURIs: currentBatch.map((c) => c.tokenURI),
      });
    }
    currentBatch = [];
    lastIpfsString = ipfsBase;
  }
  currentBatch.push(collectionMint);
}

let maxNum = 0;
for (const tx of transferTxs) {
  if (tx.ids.length > maxNum) {
    maxNum = tx.ids.length;
  }
  // console.log({num: tx.ids.length, to: tx.to, ids: tx.ids, values: tx.values});
}

// console.log({maxNum});

fs.ensureDirSync('tmp');
fs.writeFileSync(
  'tmp/asset_regenerations.json',
  JSON.stringify({batchMints, transferTxs}, null, '  ')
);
