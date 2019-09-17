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
    deployContract,
    emptyBytes,
} = require('../utils');

const {
    TransferSingleEvent,
    TransferBatchEvent,
    URIEvent
} = require('../erc1155');

const {
    getERC20Balance,
} = require('../erc20');

const {
    TransferEvent
} = require('../erc721');

const {
    mintAndReturnTokenId,
    mintTokensWithSameURIAndSupply,
    mintTokensIncludingNFTWithSameURI,
    mintMultiple,
    generateTokenId,
} = require('../asset-utils');

const CreatorEvent = encodeEventSignature('Creator(uint256,address)');

const {
    sandAdmin,
    others,
    mintingFeeCollector,
} = rocketh.namedAccounts

const creator = others[0];
const user1 = others[1];
const operator = others[2];
const newFeeCollector = others[3];
const feeCollectorOwner = others[4];

const ipfsHashString = '0x78b9f42c22c3c8b260b781578da3151e8200c741c6b7437bafaff5a9df9b403e';
const ipfsUrl = 'ipfs://bafybeidyxh2cyiwdzczgbn4bk6g2gfi6qiamoqogw5bxxl5p6wu57g2ahy';

function runFixedIDAssetTests(title, resetContracts) {
    tap.test(title + ' specific tests', async (t)=> {
        // t.runOnly = true;
        let contracts;
        t.beforeEach(async () => {
          contracts = await resetContracts();
        });

        t.test('minting a NFT with fixed id return the id', async () => {
            const tokenID = await mintAndReturnTokenId(contracts.AssetBouncer, ipfsHashString,1,creator, 4);
            assert.equal(tokenID, generateTokenId(creator, 1, 1, 4, 0));
        });

        t.test('minting a NFT with same id twice fails', async () => {
            await tx(contracts.AssetBouncer, 'mint', {from: creator, gas}, creator, 0, zeroAddress, 4, ipfsHashString, 1, creator, emptyBytes);
            await expectThrow(tx(contracts.AssetBouncer, 'mint', {from: creator, gas}, creator, 0, zeroAddress, 4, ipfsHashString, 1, creator, emptyBytes));
        });

        t.test('minting a NFT with different id succeed', async () => {
            await tx(contracts.AssetBouncer, 'mint', {from: creator, gas}, creator, 0, zeroAddress, 4, ipfsHashString, 1, creator, emptyBytes);
            await tx(contracts.AssetBouncer, 'mint', {from: creator, gas}, creator, 0, zeroAddress, 5, ipfsHashString, 1, creator, emptyBytes);
        });

        // t.test('minting 2 NFT with no fixed id succeed', async () => {
        //     await tx(contracts.AssetBouncer, 'mint', {from: creator, gas}, creator, 0, 0, ipfsHashString, 1, creator, emptyBytes);
        //     await tx(contracts.AssetBouncer, 'mint', {from: creator, gas}, creator, 0, 0, ipfsHashString, 1, creator, emptyBytes);
        // });

        t.test('minting a MCFT (supply > 1) with same id twice fails', async () => {
            await tx(contracts.AssetBouncer, 'mint', {from: creator, gas}, creator, 0, zeroAddress, 4, ipfsHashString, 1033, creator, emptyBytes);
            await expectThrow(tx(contracts.AssetBouncer, 'mint', {from: creator, gas}, creator, 0, zeroAddress, 4, ipfsHashString, 4, creator, emptyBytes));
        });

        t.test('minting a MCFT with fixed id return the id', async () => {
            const tokenID = await mintAndReturnTokenId(contracts.AssetBouncer, ipfsHashString,1033,creator, 4);
            assert.equal(tokenID, generateTokenId(creator, 1033, 1, 4, 0));
        });

        t.test('minting a MCFT (supply > 1) with different id succeed', async () => {
            await tx(contracts.AssetBouncer, 'mint', {from: creator, gas}, creator, 0, zeroAddress, 4, ipfsHashString, 1033, creator, emptyBytes);
            await tx(contracts.AssetBouncer, 'mint', {from: creator, gas}, creator, 0, zeroAddress, 5, ipfsHashString, 4, creator, emptyBytes);
        });

        t.test('minting multiple MCFT (supply > 1) succeed', async () => {
            await mintTokensWithSameURIAndSupply(contracts.AssetBouncer, 17, ipfsHashString, 1234, creator, 101);
        });

        t.test('minting one MCFT (supply > 1) succeed', async () => {
            await mintAndReturnTokenId(contracts.AssetBouncer, ipfsHashString, 1234, creator, 101);
        });

        t.test('minting one NFT (supply = 1) succeed', async () => {
            await mintAndReturnTokenId(contracts.AssetBouncer, ipfsHashString, 1, creator, 101);
        });

        t.test('minting multiple Assets succeed', async () => {
            await mintTokensIncludingNFTWithSameURI(contracts.AssetBouncer, 7, ipfsHashString, 1234, 7, creator, 101);
        });

        t.test('minting only multiple NFTS succeed', async () => {
            await mintTokensIncludingNFTWithSameURI(contracts.AssetBouncer, 0, ipfsHashString, 1234, 7, creator, 101);
        });

        // t.test('minting multiple MCFT (supply > 1) then minting with overlaping range fails', async () => {
        //     await mintTokensWithSameURIAndSupply(contracts.AssetBouncer, 17, ipfsHashString, 1234, creator, 101);
        //     await expectThrow(mintTokensWithSameURIAndSupply(contracts.AssetBouncer, 8, ipfsHashString, 111, creator, 117));
        // });

        // t.test('minting multiple MCFT (supply > 1) then minting with no overlaping range succeed', async () => {
        //     await mintTokensWithSameURIAndSupply(contracts.AssetBouncer, 17, ipfsHashString, 1234, creator, 101);
        //     await mintTokensWithSameURIAndSupply(contracts.AssetBouncer, 8, ipfsHashString, 111, creator, 118);
        // });

        // t.test('minting multiple Assets then minting with overlaping range fails', async () => {
        //     const tokenIds = await mintTokensIncludingNFTWithSameURI(contracts.AssetBouncer, 7, ipfsHashString, 1234, 7, creator, 101);
        //     // console.log('tokenIds', tokenIds);
        //     // const otherTokenIds = await mintTokensIncludingNFTWithSameURI(contracts.AssetBouncer, 8, ipfsHashString, 111, 2, creator, 114)
        //     // console.log('otherTokenIds', otherTokenIds);
        //     await expectThrow(mintTokensIncludingNFTWithSameURI(contracts.AssetBouncer, 8, ipfsHashString, 111, 2, creator, 114));
        // });

        t.test('minting multiple Assets with fixed id gives the correct ids', async () => {
            let tokenIDs = await mintTokensIncludingNFTWithSameURI(contracts.AssetBouncer, 7, ipfsHashString, 1234, 7, creator, 101);
            // console.log(tokenIDs.map((id) => new BN(id).toString(16)));
            // console.log(Array(7+7).fill().map(
            //         (_, i) => {
            //             if(i < 7) {
            //                 return generateTokenId(creator, 1234, 14, 101, i);
            //             } else {
            //                 return generateTokenId(creator, 1, 14, 101, i);
            //             }
            //         }
            //     ).map((id) => new BN(id).toString(16)));
            assert.deepStrictEqual(
                tokenIDs,
                Array(7+7).fill().map(
                    (_, i) => {
                        if(i < 7) {
                            return generateTokenId(creator, 1234, 14, 101, i);
                        } else {
                            return generateTokenId(creator, 1, 14, 101, i);
                        }
                    }
                )
            )
        });

        t.test('minting multiple Assets then minting with existing packSize/packID fails', async () => {
            const tokenIds = await mintTokensIncludingNFTWithSameURI(contracts.AssetBouncer, 7, ipfsHashString, 1234, 7, creator, 101);
            // console.log('exi tokenIds', tokenIds);
            await expectThrow(mintTokensIncludingNFTWithSameURI(contracts.AssetBouncer, 7, ipfsHashString, 10, 7, creator, 101));
        });

        t.test('minting multiple Assets then minting NFT with existing packID fails', async () => {
            await mintTokensIncludingNFTWithSameURI(contracts.AssetBouncer, 7, ipfsHashString, 1234, 0, creator, 101);
            await expectThrow(mintTokensIncludingNFTWithSameURI(contracts.AssetBouncer, 0, ipfsHashString, 0, 7, creator, 101));
        });

        // t.test('minting multiple Assets then minting with existing id fails', async () => {
        //     const tokenIds = await mintTokensIncludingNFTWithSameURI(contracts.AssetBouncer, 7, ipfsHashString, 1234, 7, creator, 101);
        //     // console.log('exi tokenIds', tokenIds);
        //     await expectThrow(tx(contracts.AssetBouncer, 'mint', {from: creator, gas}, creator, 0, zeroAddress, 114, ipfsHashString, 4, creator, emptyBytes));
        // });

        // t.test('minting multiple Assets then minting NFT with existing id fails', async () => {
        //     await mintTokensIncludingNFTWithSameURI(contracts.AssetBouncer, 7, ipfsHashString, 1234, 7, creator, 101);
        //     await expectThrow(tx(contracts.AssetBouncer, 'mint', {from: creator, gas}, creator, 0, zeroAddress, 114, ipfsHashString, 1, creator, emptyBytes));
        // });

        t.test('minting multiple Assets then minting NFT with different id succeeds', async () => {
            await mintTokensIncludingNFTWithSameURI(contracts.AssetBouncer, 7, ipfsHashString, 1234, 7, creator, 101);
            await tx(contracts.AssetBouncer, 'mint', {from: creator, gas}, creator, 0, zeroAddress, 115, ipfsHashString, 1, creator, emptyBytes);
        });

        // t.test('minting multiple Assets then minting with no overlaping range succeed', async () => {
        //     await mintTokensIncludingNFTWithSameURI(contracts.AssetBouncer, 7, ipfsHashString, 1234, 7, creator, 101);
        //     await mintTokensIncludingNFTWithSameURI(contracts.AssetBouncer, 8, ipfsHashString, 111, 2, creator, 115);
        // });

        // t.test('minting multiple Assets then minting with backward overlaping range fails', async () => {
        //     await mintTokensIncludingNFTWithSameURI(contracts.AssetBouncer, 8, ipfsHashString, 111, 2, creator, 114);
        //     await expectThrow(mintTokensIncludingNFTWithSameURI(contracts.AssetBouncer, 7, ipfsHashString, 1234, 7, creator, 101));
        // });
    });
}

module.exports = {
    runFixedIDAssetTests
}