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
  numFTTypes: number;
} {
  const bn = BigNumber.from(tokenID);
  return {
    packID: bn.shr(23).mod(bn2.pow(32)),
    creator: bn.shr(96).toHexString(),
    numFTTypes: bn.shr(11).mod(bn2.pow(12)).toNumber(),
  };
}
const owners = JSON.parse(fs.readFileSync('tmp/asset_owners.json').toString());

const assetCollections = JSON.parse(
  fs.readFileSync('tmp/asset_collections.json').toString()
);

type Token = {
  idHex: string;
  id: string;
  creator: string;
  packID: string;
  tokenURI: string;
  ipfsHash: string;
  supply: string;
  rarity: number;
  numFTTypes: number;
};

const collectionsDict: Record<string, Token> = {};

type BatchMint = {
  creator: string;
  packID: string;
  ipfsHash: string;
  supplies: string[];
  rarities: number[];
  tokenURIs: string[];
  tokenIDs: string[];
  numFTs: number;
};
const batchMints: BatchMint[] = [];

type ExtractionTx = {
  to: string;
  id: string;
  extractedTokenId: string;
};

const extractions: ExtractionTx[] = [];

type TransferTX = {
  to: string;
  ids: string[];
  values: number[];
};

const transfers: TransferTX[] = [];

for (const owner of owners) {
  const ids = [];
  const values = [];
  for (const assetToken of owner.assetTokens) {
    const collectionId = assetToken.token.collection.id;
    if (!collectionsDict[collectionId]) {
      const tokenURI = assetToken.token.collection.tokenURI;
      const {packID, creator, numFTTypes} = extractFromId(collectionId);
      collectionsDict[collectionId] = {
        idHex: BigNumber.from(collectionId).toHexString(), // TODO extract packID and creator, etc... (rarity ?)
        id: collectionId,
        creator,
        packID: packID.toString(),
        tokenURI,
        ipfsHash: toHash(tokenURI),
        supply: assetToken.token.collection.supply,
        rarity: assetToken.token.rarity,
        numFTTypes,
      };
    }
    ids.push(assetToken.token.id);
    values.push(assetToken.quantity);
  }
  transfers.push({
    to: owner.id,
    ids, // TODO order ids (nft at the end, automatically via extra bit ?)
    values,
  });
}

const extraCollections = [];
for (const assetCollection of assetCollections) {
  if (!collectionsDict[assetCollection.id]) {
    console.log(`missing collection : ${assetCollection.id}`);
    extraCollections.push(assetCollection);
  }
}
if (extraCollections.length !== 2) {
  throw new Error('Expected 2 extra collection that were fully burnt');
}

for (const extraCollection of extraCollections) {
  const tokenURI = extraCollection.tokenURI;
  const {packID, creator, numFTTypes} = extractFromId(extraCollection.id);
  collectionsDict[extraCollection.id] = {
    idHex: BigNumber.from(extraCollection.id).toHexString(), // TODO extract packID and creator, etc... (rarity ?)
    id: extraCollection.id,
    creator,
    packID: packID.toString(),
    tokenURI,
    ipfsHash: toHash(tokenURI),
    supply: '850', // these 2 had 850 supply
    rarity: 0, // these 2 have zero rarity
    numFTTypes,
  };
  console.log(collectionsDict[extraCollection.id]);
}

const collectionIds = Object.keys(collectionsDict);
const collectionMints = [];
console.log({numCollection: collectionIds.length});
for (const collectionId of collectionIds) {
  const collection = collectionsDict[collectionId];
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

let lastIpfsString = '';
let currentBatch: Token[] = [];
for (const collectionMint of collectionMints) {
  console.log({
    collectionId: collectionMint.id,
    tokenURI: collectionMint.tokenURI,
  });
  const {ipfsBase} = extractIpfsString(collectionMint.tokenURI);
  if (lastIpfsString != ipfsBase) {
    if (lastIpfsString !== '') {
      batchMints.push({
        creator: currentBatch[0].creator,
        ipfsHash: currentBatch[0].ipfsHash,
        packID: currentBatch[0].packID,
        supplies: currentBatch.map((c) => c.supply),
        rarities: currentBatch.map((c) => c.rarity),
        tokenURIs: currentBatch.map((c) => c.tokenURI),
        numFTs: currentBatch[0].numFTTypes,
        tokenIDs: currentBatch.map((c) => c.id),
      });
    }
    currentBatch = [];
    lastIpfsString = ipfsBase;
  }
  currentBatch.push(collectionMint);
}
if (currentBatch.length > 0) {
  batchMints.push({
    creator: currentBatch[0].creator,
    ipfsHash: currentBatch[0].ipfsHash,
    packID: currentBatch[0].packID,
    supplies: currentBatch.map((c) => c.supply),
    rarities: currentBatch.map((c) => c.rarity),
    tokenURIs: currentBatch.map((c) => c.tokenURI),
    numFTs: currentBatch[0].numFTTypes,
    tokenIDs: currentBatch.map((c) => c.id),
  });
}

for (const assetCollection of assetCollections) {
  const numTokenTypes = parseInt(assetCollection.numTokenTypes);
  if (numTokenTypes > 1) {
    for (const token of assetCollection.tokens) {
      if (token.owner) {
        extractions.push({
          to: '',
          id: assetCollection.id,
          extractedTokenId: token.id,
        });
      }
    }
  }
}

let maxNum = 0;
for (const tx of transfers) {
  if (tx.ids.length > maxNum) {
    maxNum = tx.ids.length;
  }
  // console.log({num: tx.ids.length, to: tx.to, ids: tx.ids, values: tx.values});
}

// console.log({maxNum});

fs.ensureDirSync('tmp');
fs.writeFileSync(
  'tmp/asset_regenerations.json',
  JSON.stringify({batchMints, extractions, transfers}, null, '  ')
);
