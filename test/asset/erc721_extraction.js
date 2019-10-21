const BN = require('bn.js');
const tap = require('tap');
const assert = require('assert');
const rocketh = require('rocketh');
const accounts = rocketh.accounts;

const {
    getEventsFromReceipt,
    encodeEventSignature,
    tx,
    call,
    gas,
    expectThrow,
    zeroAddress,
    emptyBytes,
} = require('../utils');

const {
    TransferSingleEvent,
    TransferBatchEvent,
    URIEvent
} = require('../erc1155');

const {
    TransferEvent
} = require('../erc721');

const {
    ExtractionEvent,
    mintAndReturnTokenId,
    mintMultipleAndReturnTokenIds,
    mintForAndReturnTokenId,
    mintTokensWithSameURIAndSupply,
    mintTokensIncludingNFTWithSameURI,
    generateTokenId,
} = require('../asset-utils');

const {
    genesisMinter,
} = rocketh.namedAccounts;

const creator = accounts[0];
const user1 = accounts[1];

const ipfsHashString = '0x78b9f42c22c3c8b260b781578da3151e8200c741c6b7437bafaff5a9df9b403e';
const ipfsUrl = 'ipfs://bafybeidyxh2cyiwdzczgbn4bk6g2gfi6qiamoqogw5bxxl5p6wu57g2ahy';

function runERC721ExtractionTests(title, resetContracts) {
    tap.test(title + ' erc721 extraction', async (t) => {
        // t.runOnly = true;
        let contracts;
        t.beforeEach(async () => {
            contracts = await resetContracts();
        });

        t.test('should be able to extract an NFT (1 ERC1155 value -> 1 ERC721)', async () => {
            const tokenId = await mintAndReturnTokenId(contracts.AssetBouncer, ipfsHashString, 100, creator);
            const receipt = await tx(contracts.Asset, 'extractERC721From', {from: creator, gas}, creator, tokenId, creator);
            assert.equal((await getEventsFromReceipt(contracts.Asset, ExtractionEvent, receipt)).length, 1);
        });

        t.test('should work with mintMultiple', async () => {
            const tokenIds = await mintMultipleAndReturnTokenIds(contracts.AssetBouncer, ipfsHashString, [10, 20], creator);

            const receipt1 = await tx(contracts.Asset, 'extractERC721From', {from: creator, gas}, creator, tokenIds[0], creator);
            assert.equal((await getEventsFromReceipt(contracts.Asset, ExtractionEvent, receipt1)).length, 1);

            const receipt2 = await tx(contracts.Asset, 'extractERC721From', {from: creator, gas}, creator, tokenIds[1], creator);
            assert.equal((await getEventsFromReceipt(contracts.Asset, ExtractionEvent, receipt2)).length, 1);
        });

        t.test('should decrease balance by one', async () => {
            const tokenId = await mintAndReturnTokenId(contracts.AssetBouncer, ipfsHashString, 100, creator);
            const balanceBefore = await call(contracts.Asset, 'balanceOf', {from: creator}, creator, tokenId);
            await tx(contracts.Asset, 'extractERC721From', {from: creator, gas}, creator, tokenId, creator);
            const balanceAfter = await call(contracts.Asset, 'balanceOf', {from: creator}, creator, tokenId);
            assert.equal(balanceAfter, balanceBefore - 1);
        });

        t.test('should burn one token balance', async () => {
            const tokenId = await mintAndReturnTokenId(contracts.AssetBouncer, ipfsHashString, 100, creator);
            await tx(contracts.Asset, 'extractERC721From', {from: creator, gas}, creator, tokenId, creator);
            const balanceLeft = await call(contracts.Asset, 'balanceOf', {from: creator}, creator, tokenId);
            assert.equal(balanceLeft, 99);
        });

        t.test('should be owner, extractor', async () => {
            const tokenId = await mintAndReturnTokenId(contracts.AssetBouncer, ipfsHashString, 100, creator);
            const receipt = await tx(contracts.Asset, 'extractERC721From', {from: creator, gas}, creator, tokenId, creator);
            const extractionEvent = await getEventsFromReceipt(contracts.Asset, ExtractionEvent, receipt);
            const newTokenId = extractionEvent[0].returnValues.toId;
            const ownerOf = await call(contracts.Asset, 'ownerOf', null, newTokenId);
            assert.equal(ownerOf, creator);
        });

        t.test('recipient should be new owner', async () => {
            const tokenId = await mintAndReturnTokenId(contracts.AssetBouncer, ipfsHashString, 100, creator);
            const receipt = await tx(contracts.Asset, 'extractERC721From', {from: creator, gas}, creator, tokenId, user1);
            const extractionEvent = await getEventsFromReceipt(contracts.Asset, ExtractionEvent, receipt);
            const newTokenId = extractionEvent[0].returnValues.toId;
            const ownerOf = await call(contracts.Asset, 'ownerOf', null, newTokenId);
            assert.equal(ownerOf, user1);
        });

        t.test('should have same ipfsHash', async () => {
            const tokenId = await mintAndReturnTokenId(contracts.AssetBouncer, ipfsHashString, 100, creator);
            // console.log(new BN(tokenId).toString(16));

            const receipt = await tx(contracts.Asset, 'extractERC721From', {from: creator, gas}, creator, tokenId, creator);
            const extractionEvent = await getEventsFromReceipt(contracts.Asset, ExtractionEvent, receipt);

            const newTokenId = extractionEvent[0].returnValues.toId;
            // console.log(new BN(newTokenId).toString(16));

            const extractedIpfsHash = await call(contracts.Asset, 'tokenURI', null, newTokenId);
            assert.equal(extractedIpfsHash, ipfsUrl + '/0' + '.json');
        });

        t.test('should be able to extract if not creator', async () => {
            const tokenId = await mintAndReturnTokenId(contracts.AssetBouncer, ipfsHashString, 100, creator);
            await tx(contracts.Asset, 'safeTransferFrom', {from: creator, gas}, creator, user1, tokenId, 1, emptyBytes);
            const receipt = await tx(contracts.Asset, 'extractERC721From', {from: user1, gas}, user1, tokenId, user1);
            const extractionEvent = await getEventsFromReceipt(contracts.Asset, ExtractionEvent, receipt);
            const newTokenId = extractionEvent[0].returnValues.toId;
            const ownerOf = await call(contracts.Asset, 'ownerOf', null, newTokenId);
            assert.equal(ownerOf, user1);
        });

        t.test('should have same creator', async () => {
            const tokenId = await mintAndReturnTokenId(contracts.AssetBouncer, ipfsHashString, 100, creator);
            await tx(contracts.Asset, 'safeTransferFrom', {from: creator, gas}, creator, user1, tokenId, 1, emptyBytes);
            const receipt = await tx(contracts.Asset, 'extractERC721From', {from: user1, gas}, user1, tokenId, creator);
            const extractionEvent = await getEventsFromReceipt(contracts.Asset, ExtractionEvent, receipt);
            const newTokenId = extractionEvent[0].returnValues.toId;
            const creatorOf = await call(contracts.Asset, 'creatorOf', null, newTokenId);
            assert.equal(creatorOf, creator);
        });

        t.test('should NOT extract an ERC721', async () => {
            const tokenId = await mintAndReturnTokenId(contracts.AssetBouncer, ipfsHashString, 1, creator);
            await expectThrow(tx(contracts.Asset, 'extractERC721From', {from: creator, gas}, creator, tokenId, creator));
            // .then(() => assert(false, 'was able to extract NFT'))
            // .catch((err) => assert(err.toString().includes('Not an ERC1155 Token'), 'Error message does not match. ' + err.toString()));
        });

        // t.test('should NOT extract with wrong uri', async () => {
        //     const tokenId = await mintAndReturnTokenId(contracts.Asset, ipfsHashString, 100, creator);
        //     await expectThrow(tx(contracts.Asset, 'extractERC721From', {from: creator, gas}, creator, tokenId, 'clearly wrong uri'));
        //     // .then(() => assert(false, 'was able to extract NFT'))
        //     // .catch((err) => assert(err.toString().includes('URI hash does not match'), 'Error message does not match. ' + err.toString()));
        // });

        t.test('should NOT extract an NFT if no balance', async () => {
            const tokenId = await mintAndReturnTokenId(contracts.AssetBouncer, ipfsHashString, 100, creator);
            await expectThrow(tx(contracts.Asset, 'extractERC721From', {from: user1, gas}, user1, tokenId, creator));
        });

        t.test('should be able to extract as many as there is tokens', async () => {
            const tokenId = await mintAndReturnTokenId(contracts.AssetBouncer, ipfsHashString, 2, creator);
            await tx(contracts.Asset, 'extractERC721From', {from: creator, gas}, creator, tokenId, creator);
            await tx(contracts.Asset, 'extractERC721From', {from: creator, gas}, creator, tokenId, creator);
        });

        t.test('should fail to extract when no more token available', async () => {
            const tokenId = await mintAndReturnTokenId(contracts.AssetBouncer, ipfsHashString, 2, creator);
            await tx(contracts.Asset, 'extractERC721From', {from: creator, gas}, creator, tokenId, creator);
            await tx(contracts.Asset, 'extractERC721From', {from: creator, gas}, creator, tokenId, creator);
            await expectThrow(tx(contracts.Asset, 'extractERC721From', {from: creator, gas}, creator, tokenId, creator));
        });

        t.test('should NOT extract as many as there is tokens', async () => {
            const tokenId = await mintAndReturnTokenId(contracts.AssetBouncer, ipfsHashString, 2, creator);
            await tx(contracts.Asset, 'extractERC721From', {from: creator, gas}, creator, tokenId, creator);
            await expectThrow(tx(contracts.Asset, 'extractERC721From', {from: user1, gas}, user1, tokenId, creator));
        });

        t.test('last token should not be an NFT without owner action', async () => {
            const tokenId = await mintAndReturnTokenId(contracts.AssetBouncer, ipfsHashString, 2, creator);
            await tx(contracts.Asset, 'extractERC721From', {from: creator, gas}, creator, tokenId, creator);
            await expectThrow(call(contracts.Asset, 'ownerOf', null, tokenId));
        });

        t.test('last token should be transferable as an ERC1155 without emitting ERC721 events', async () => {
            const tokenId = await mintAndReturnTokenId(contracts.AssetBouncer, ipfsHashString, 2, creator);
            await tx(contracts.Asset, 'extractERC721From', {from: creator, gas}, creator, tokenId, creator);
            const receipt = await tx(contracts.Asset, 'safeTransferFrom', {from: creator, gas}, creator, user1, tokenId, 1, emptyBytes);
            const eventsMatching = await getEventsFromReceipt(contracts.Asset, TransferEvent, receipt);
            assert.equal(eventsMatching.length, 0);
        });

        t.test('last token should be not be transferable via ERC721 transfer', async () => {
            const tokenId = await mintAndReturnTokenId(contracts.AssetBouncer, ipfsHashString, 2, creator);
            const receipt = await tx(contracts.Asset, 'extractERC721From', {from: creator, gas}, creator, tokenId, creator);
            const eventsMatching = await getEventsFromReceipt(contracts.Asset, ExtractionEvent, receipt);
            const nftTokenId = eventsMatching[0].returnValues[1];
            await expectThrow(tx(contracts.Asset, 'transferFrom', {from: creator, gas}, creator, user1, tokenId));
        });

        t.test('extracted token should be transferable via ERC721 transfer', async () => {
            const tokenId = await mintAndReturnTokenId(contracts.AssetBouncer, ipfsHashString, 2, creator);
            const receipt = await tx(contracts.Asset, 'extractERC721From', {from: creator, gas}, creator, tokenId, creator);
            const eventsMatching = await getEventsFromReceipt(contracts.Asset, ExtractionEvent, receipt);
            const nftTokenId = eventsMatching[0].returnValues[1];
            await tx(contracts.Asset, 'transferFrom', {from: creator, gas}, creator, user1, nftTokenId);
        });

        t.test('extracted token should be index 0', async () => {
            const tokenId = await mintAndReturnTokenId(contracts.AssetBouncer, ipfsHashString, 10, creator);
            assert.equal(tokenId, generateTokenId(creator, 10, 1, 0));
            const receipt = await tx(contracts.Asset, 'extractERC721From', {from: creator, gas}, creator, tokenId, creator);
            const eventsMatching = await getEventsFromReceipt(contracts.Asset, ExtractionEvent, receipt);
            const nftTokenId = eventsMatching[0].returnValues[1];
            assert.equal(new BN(nftTokenId, 10).toString(16), new BN(generateTokenId(creator, 1, 1, 0, 0, 0), 10).toString(16));
        });

        t.test('extracted token from a multiMint minted FT should be index 0', async () => {
            const tokenIds = await mintMultipleAndReturnTokenIds(contracts.AssetBouncer, ipfsHashString, [10, 101, 23, 1], creator);
            assert.equal(tokenIds[0], generateTokenId(creator, 10, 3, 0));
            const receipt = await tx(contracts.Asset, 'extractERC721From', {from: creator, gas}, creator, tokenIds[0], creator);
            const eventsMatching = await getEventsFromReceipt(contracts.Asset, ExtractionEvent, receipt);
            const nftTokenId = eventsMatching[0].returnValues[1];
            assert.equal(new BN(nftTokenId, 10).toString(16), new BN(generateTokenId(creator, 1, 3, 0, 0, 0), 10).toString(16));
        });

        t.test('extracted token should be of collectionIndex 0', async () => {
            const tokenId = await mintAndReturnTokenId(contracts.AssetBouncer, ipfsHashString, 10, creator);
            assert.equal(tokenId, generateTokenId(creator, 10, 1, 0));
            const receipt = await tx(contracts.Asset, 'extractERC721From', {from: creator, gas}, creator, tokenId, creator);
            const eventsMatching = await getEventsFromReceipt(contracts.Asset, ExtractionEvent, receipt);
            const nftTokenId = eventsMatching[0].returnValues[1];
            const collectionIndex = await call(contracts.Asset, 'collectionIndexOf', null, nftTokenId);
            assert.equal(collectionIndex, '0');
        });

        t.test('extracted token should be of collection', async () => {
            const tokenId = await mintAndReturnTokenId(contracts.AssetBouncer, ipfsHashString, 10, creator);
            assert.equal(tokenId, generateTokenId(creator, 10, 1, 0));
            const receipt = await tx(contracts.Asset, 'extractERC721From', {from: creator, gas}, creator, tokenId, creator);
            const eventsMatching = await getEventsFromReceipt(contracts.Asset, ExtractionEvent, receipt);
            const nftTokenId = eventsMatching[0].returnValues[1];
            const collection = await call(contracts.Asset, 'collectionOf', null, nftTokenId);
            assert.equal(collection, tokenId);
        });

        t.test('original token should fail for collection', async () => {
            const tokenId = await mintAndReturnTokenId(contracts.AssetBouncer, ipfsHashString, 10, creator);
            assert.equal(tokenId, generateTokenId(creator, 10, 1, 0));
            await tx(contracts.Asset, 'extractERC721From', {from: creator, gas}, creator, tokenId, creator);
            await expectThrow(call(contracts.Asset, 'collectionOf', null, tokenId));
        });

        t.test('second extracted token should be index 1', async () => {
            const tokenId = await mintAndReturnTokenId(contracts.AssetBouncer, ipfsHashString, 10, creator, 101);
            assert.equal(tokenId, generateTokenId(creator, 10, 1, 101));
            await tx(contracts.Asset, 'extractERC721From', {from: creator, gas}, creator, tokenId, creator);
            const receipt = await tx(contracts.Asset, 'extractERC721From', {from: creator, gas}, creator, tokenId, creator);
            const eventsMatching = await getEventsFromReceipt(contracts.Asset, ExtractionEvent, receipt);
            const nftTokenId = eventsMatching[0].returnValues[1];
            assert.equal(nftTokenId, generateTokenId(creator, 1, 1, 101, 0, 1));
        });

        t.test('second extracted token should be of collectionIndex 1', async () => {
            const tokenId = await mintAndReturnTokenId(contracts.AssetBouncer, ipfsHashString, 10, creator);
            assert.equal(tokenId, generateTokenId(creator, 10, 1, 0));
            await tx(contracts.Asset, 'extractERC721From', {from: creator, gas}, creator, tokenId, creator);
            const receipt = await tx(contracts.Asset, 'extractERC721From', {from: creator, gas}, creator, tokenId, creator);
            const eventsMatching = await getEventsFromReceipt(contracts.Asset, ExtractionEvent, receipt);
            const nftTokenId = eventsMatching[0].returnValues[1];
            const collectionIndex = await call(contracts.Asset, 'collectionIndexOf', null, nftTokenId);
            assert.equal(collectionIndex, '1');
        });

        t.test('second extracted token should be of collection', async () => {
            const tokenId = await mintAndReturnTokenId(contracts.AssetBouncer, ipfsHashString, 10, creator);
            assert.equal(tokenId, generateTokenId(creator, 10, 1, 0));
            await tx(contracts.Asset, 'extractERC721From', {from: creator, gas}, creator, tokenId, creator);
            const receipt = await tx(contracts.Asset, 'extractERC721From', {from: creator, gas}, creator, tokenId, creator);
            const eventsMatching = await getEventsFromReceipt(contracts.Asset, ExtractionEvent, receipt);
            const nftTokenId = eventsMatching[0].returnValues[1];
            const collection = await call(contracts.Asset, 'collectionOf', null, nftTokenId);
            assert.equal(collection, tokenId);
        });

        t.test('extracted token should have same uri', async () => {
            const tokenId = await mintAndReturnTokenId(contracts.AssetBouncer, ipfsHashString, 10, creator);
            const uri = await call(contracts.Asset, 'uri', null, tokenId);
            assert.equal(tokenId, generateTokenId(creator, 10, 1, 0));
            const receipt = await tx(contracts.Asset, 'extractERC721From', {from: creator, gas}, creator, tokenId, creator);
            const eventsMatching = await getEventsFromReceipt(contracts.Asset, ExtractionEvent, receipt);
            const nftTokenId = eventsMatching[0].returnValues[1];
            const newTokenURI = await call(contracts.Asset, 'tokenURI', null, nftTokenId);
            const newURI = await call(contracts.Asset, 'uri', null, nftTokenId);
            assert.equal(newTokenURI, uri);
            assert.equal(newURI, uri);
        });

        t.test('extracted token should have same rarity', async () => {
            const tokenId = await mintForAndReturnTokenId(contracts.GenesisBouncer, genesisMinter, ipfsHashString, 10, 3, creator);
            const rarity = await call(contracts.Asset, 'rarity', null, tokenId);
            assert.equal(rarity, '3');
            assert.equal(tokenId, generateTokenId(creator, 10, 1, 0));
            const receipt = await tx(contracts.Asset, 'extractERC721From', {from: creator, gas}, creator, tokenId, creator);
            const eventsMatching = await getEventsFromReceipt(contracts.Asset, ExtractionEvent, receipt);
            const nftTokenId = eventsMatching[0].returnValues[1];
            const newRarity = await call(contracts.Asset, 'rarity', null, nftTokenId);
            assert.equal(newRarity, rarity);
        });
    });
}

module.exports = {
    runERC721ExtractionTests
};
