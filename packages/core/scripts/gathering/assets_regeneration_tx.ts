import {BigNumber} from 'ethers';
import fs from 'fs-extra';
import {extractFromId} from '../../utils/asset-extract-from-id';
import {extractIpfsString, toHash} from '../../utils/asset-uri-to-hash';
const owners: OwnersFile[] = fs.readJSONSync('tmp/asset_owners.json');
const assetCollections: AssetCollectionsFile[] = fs.readJSONSync(
  'tmp/asset_collections.json'
);

type OwnersFile = {
  id: string;
  numAssets: string;
  assetTokens: {
    token: {
      id: string;
      collection: {
        id: string;
        supply: string;
        tokenURI: string;
      };
      rarity: number;
      supply: string;
    };
    quantity: string;
  }[];
};

type AssetCollectionsFile = {
  id: string;
  supply: string;
  numTokenTypes: string;
  tokenURI: string;
  tokens: {
    id: string;
    owner: string | null;
    supply: string;
  }[];
};

type Token = {
  id: string;
  creator: string;
  packID: number;
  tokenURI: string;
  ipfsHash: string;
  supply: string;
  rarity: number;
  numFTTypes: number;
};

type BatchMint = {
  creator: string;
  packID: number;
  ipfsHash: string;
  supplies: string[];
  rarities: number[];
  tokenURIs: string[];
  tokenIDs: string[];
  numFTs: number;
};

type ExtractionTx = {
  to: string;
  id: string;
  extractedTokenId: string;
};

type TransferTX = {
  to: string;
  ids: string[];
  values: string[];
};

void (async () => {
  const collections: {[collectionId: string]: Token} = {};
  const extractions: ExtractionTx[] = [];
  const transfers: TransferTX[] = [];

  for (const owner of owners) {
    const ids = [];
    const values = [];
    for (const assetToken of owner.assetTokens) {
      const collectionId = assetToken.token.collection.id;
      const {packID, creator, numFTTypes} = extractFromId(collectionId);
      if (!collections[collectionId]) {
        const tokenURI = assetToken.token.collection.tokenURI;
        collections[collectionId] = {
          id: collectionId,
          creator,
          packID: packID,
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
    transfers.push({to: owner.id, ids, values});
  }

  const collectionMints = Object.values(collections);
  collectionMints.sort((c1, c2) => {
    if (c1.creator === c2.creator) {
      if (c1.packID === c2.packID) {
        const {ipfsBase: ipfsBase1, counter: counter1} = extractIpfsString(
          c1.tokenURI
        );
        const {ipfsBase: ipfsBase2, counter: counter2} = extractIpfsString(
          c2.tokenURI
        );
        if (ipfsBase1 === ipfsBase2) return counter2 - counter1;
        return ipfsBase1 < ipfsBase2 ? -1 : 1;
      }
      return c1.packID - c2.packID;
    }
    return c1.creator < c2.creator ? -1 : 1;
  });

  const mintPacks: {[id: string]: BatchMint} = {};
  for (const collection of collectionMints) {
    const {ipfsBase} = extractIpfsString(collection.tokenURI);
    const id = `${collection.creator}-${collection.packID}-${ipfsBase}`;
    let batch = mintPacks[id];
    if (!batch) {
      batch = {
        creator: collection.creator,
        ipfsHash: collection.ipfsHash,
        packID: collection.packID,
        supplies: [],
        rarities: [],
        tokenURIs: [],
        numFTs: collection.numFTTypes,
        tokenIDs: [],
      };
      mintPacks[id] = batch;
    }
    let index = batch.tokenIDs.findIndex((id) =>
      BigNumber.from(id).gt(BigNumber.from(collection.id))
    );
    index = index === -1 ? 0 : index;
    batch.supplies.splice(index, 0, collection.supply);
    batch.rarities.splice(index, 0, collection.rarity);
    batch.tokenURIs.splice(index, 0, collection.tokenURI);
    batch.tokenIDs.splice(index, 0, collection.id);
  }
  // TODO: review this, ignoring for now since there are no extractions on goerli
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
  fs.outputJSONSync('tmp/asset_regenerations.json', {
    batchMints: Object.values(mintPacks),
    extractions,
    transfers,
  });
})();
