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
    getBlockNumber,
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
    mintMultiple,
    mintAndReturnTokenId,
    mintForAndReturnTokenId,
    mintMultipleForAndReturnTokenIds,
    mintTokensWithSameURIAndSupply,
    mintTokensIncludingNFTWithSameURI,
    generateTokenId,
    old_generateTokenId,
} = require('../asset-utils');

const CreatorEvent = encodeEventSignature('Creator(uint256,address)');
const AssetUpdateEvent = encodeEventSignature('AssetUpdate(uint256,uint256)');

const {
    sandAdmin,
    assetAdmin,
    others,
    mintingFeeCollector,
    genesisMinter,
    assetBouncerAdmin,
} = rocketh.namedAccounts;

const creator = others[0];
const user1 = others[1];
const user2 = others[2];

const invalidIpfsHashString = '0x0000000000000000000000000000000000000000000000000000000000000000';
const ipfsHashString = '0x78b9f42c22c3c8b260b781578da3151e8200c741c6b7437bafaff5a9df9b403e';
const ipfsUrl = 'ipfs://bafybeidyxh2cyiwdzczgbn4bk6g2gfi6qiamoqogw5bxxl5p6wu57g2ahy';

function runAssetTests(title, resetContracts, fixedID = 0) {
    tap.test(title + ' specific tests', async (t) => {
        // t.runOnly = true;
        let contracts;
        t.beforeEach(async () => {
            contracts = await resetContracts();
        });

        t.test('minting as erc721', async (t) => {
            // t.runOnly = true;
            t.test('minting a NFT (supply = 1) results in erc721 transfer event', async () => {
                const receipt = await tx(contracts.AssetBouncer, 'mint', {from: creator, gas}, creator, 0, zeroAddress, fixedID, ipfsHashString, 1, creator, emptyBytes);
                const eventsMatching = await getEventsFromReceipt(contracts.Asset, TransferEvent, receipt);
                assert.equal(eventsMatching.length, 1);
            });

            t.test('minting a NFT result in a packId used with numFTs = 0', async () => {
                await tx(contracts.AssetBouncer, 'mint', {from: creator, gas}, creator, 0, zeroAddress, fixedID, ipfsHashString, 1, creator, emptyBytes);
                const packIdUsed = await call(contracts.Asset, 'isPackIdUsed', null, creator, fixedID, 0);
                assert.equal(packIdUsed, true);
                const differentPackIdUsed = await call(contracts.Asset, 'isPackIdUsed', null, creator, fixedID, 1);
                assert.equal(differentPackIdUsed, false);
            });

            t.test('minting a NFT twice with the same id fails', async () => {
                await tx(contracts.AssetBouncer, 'mint', {from: creator, gas}, creator, 0, zeroAddress, fixedID, ipfsHashString, 1, creator, emptyBytes);
                await expectThrow(tx(contracts.AssetBouncer, 'mint', {from: creator, gas}, creator, 0, zeroAddress, fixedID, ipfsHashString, 1, creator, emptyBytes));
            });

            t.test('minting a NFT twice with the same id fails even with zero hashes', async () => {
                let zeroHashSuccess = true;
                try {
                    await tx(contracts.AssetBouncer, 'mint', {from: creator, gas}, creator, 0, zeroAddress, fixedID, invalidIpfsHashString, 1, creator, emptyBytes);
                } catch (e) {
                    zeroHashSuccess = false;
                }

                if (zeroHashSuccess) {
                    await expectThrow(tx(contracts.AssetBouncer, 'mint', {from: creator, gas}, creator, 0, zeroAddress, fixedID, invalidIpfsHashString, 1, creator, emptyBytes));
                }
            });

            // t.test('minting a NFT (supply = 1) results in Creator event', async () => {
            //     const receipt = await tx(contracts.AssetBouncer, 'mint', {from: creator, gas}, creator, 0, zeroAddress, 0, ipfsHashString, 1, creator, emptyBytes);
            //     const transferEvents = await getEventsFromReceipt(contracts.Asset, TransferEvent, receipt);
            //     const tokenId = transferEvents[0].returnValues[2];

            //     const eventsMatching = await getEventsFromReceipt(contracts.Asset, CreatorEvent, receipt);
            //     assert.equal(eventsMatching.length, 1);
            //     const eventValues = eventsMatching[0].returnValues;
            //     assert.equal(eventValues[0], tokenId);
            //     assert.equal(eventValues[1], creator);
            // });

            t.test('minting a MCFT (supply > 1) results in no erc721 transfer event', async () => {
                const receipt = await tx(contracts.AssetBouncer, 'mint', {from: creator, gas}, creator, 0, zeroAddress, fixedID, ipfsHashString, 100, creator, emptyBytes);
                const eventsMatching = await getEventsFromReceipt(contracts.Asset, TransferEvent, receipt);
                assert.equal(eventsMatching.length, 0);
            });

            // TODO
            // t.test('when fee are enabled minting results the fee collector getting it', async () => {
            //     const mintingFee = 100;
            //     await tx(contracts.Sand, 'transfer', {from: sandAdmin, gas}, creator, "1000");
            //     await tx(contracts.Asset, 'setFeeCollection', {from: mintingFeeCollector, gas}, newFeeCollector, contracts.Sand.options.address, mintingFee);
            //     await tx(contracts.AssetBouncer, 'mint', {from: creator, gas}, creator, 100, contracts.Sand.options.address, fixedID, ipfsHashString, 1, creator, emptyBytes);
            //     const balance = await getERC20Balance(contracts.Sand, newFeeCollector);
            //     assert.equal(balance, mintingFee);
            // });

            // TODO
            // t.test('when fee are enabled minting results the fee collector contract getting it', async () => {
            //     const mintingFee = 100;
            //     const receiverContract = await deployContract(creator, 'TestMintingFeeCollector', feeCollectorOwner, contracts.Asset.options.address, contracts.Sand.options.address);
            //     const receiverAddress = receiverContract.options.address;
            //     await tx(contracts.Sand, 'transfer', {from: sandAdmin, gas}, creator, "1000");
            //     await tx(contracts.Asset, 'setFeeCollection', {from: mintingFeeCollector, gas}, receiverAddress, contracts.Sand.options.address, mintingFee);
            //     await tx(contracts.AssetBouncer, 'mint', {from: creator, gas}, creator, 100, contracts.Sand.options.address, fixedID, ipfsHashString, 1, creator, emptyBytes);
            //     const balance = await getERC20Balance(contracts.Sand, receiverAddress);
            //     assert.equal(balance, mintingFee);
            // });

            t.test('minting a NFT results in the uri accessible via tokenURI', async () => {
                const tokenId = await mintAndReturnTokenId(contracts.AssetBouncer, ipfsHashString, 1, creator, fixedID);
                const tokenURI = await call(contracts.Asset, 'tokenURI', null, tokenId);
                assert.equal(tokenURI, ipfsUrl + '/0' + '.json'); // TODO remove /0 for single pack ?
            });

            t.test('minting a NFT with rarity', async () => {
                const tokenId = await mintForAndReturnTokenId(contracts.GenesisBouncer, genesisMinter, ipfsHashString, 1, 3, creator, fixedID);
                const rarity = await call(contracts.Asset, 'rarity', null, tokenId);
                assert.equal(rarity, '3');
            });

            t.test('minting multiple NFT with rarity', async () => {
                const tokenIds = await mintMultipleForAndReturnTokenIds(contracts.GenesisBouncer, genesisMinter, ipfsHashString, [1, 1], [3, 2], creator, fixedID);
                let rarity = await call(contracts.Asset, 'rarity', null, tokenIds[0]);
                assert.equal(rarity, '3');
                rarity = await call(contracts.Asset, 'rarity', null, tokenIds[1]);
                assert.equal(rarity, '2');
            });

            t.test('minting multiple NFT with rarity', async () => {
                const rarities = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
                const tokenIds = await mintMultipleForAndReturnTokenIds(contracts.GenesisBouncer, genesisMinter, ipfsHashString, [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], rarities, creator, fixedID);
                for (let i = 0; i < rarities.length; i++) {
                    const rarity = await call(contracts.Asset, 'rarity', null, tokenIds[i]);
                    assert.equal(rarity, rarities[i]);
                }
            });

            t.test('minting multiple NFT with rarity', async () => {
                const rarities = [0, 0, 0, 1, 0, 0, 2, 0, 3, 1, 2, 1, 1, 0, 0, 0, 0];
                const tokenIds = await mintMultipleForAndReturnTokenIds(contracts.GenesisBouncer, genesisMinter, ipfsHashString, [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], rarities, creator, fixedID);
                for (let i = 0; i < rarities.length; i++) {
                    const rarity = await call(contracts.Asset, 'rarity', null, tokenIds[i]);
                    assert.equal(rarity, rarities[i]);
                }
            });
        });

        t.test('minting as ERC1155', async (t) => {
            // t.runOnly = true;
            t.test('balance after minting', async (t) => {
                const tokenIds = await mintTokensWithSameURIAndSupply(contracts.AssetBouncer, 8, ipfsHashString, 10, creator, 1006);
                // console.log(tokenIds.map((id) => new BN(id).toString(16)));
                // console.log([
                //     generateTokenId(creator, 10, 8, 1006,0),
                //     generateTokenId(creator, 10, 8, 1006,1),
                // ].map((id) => new BN(id).toString(16)));

                // Do not throw any more on balanceOF
                // await expectThrow(call(contracts.Asset, 'balanceOf', {}, creator, generateTokenId(creator, 10, 8, 1000, 0)));

                assert.equal(await call(contracts.Asset, 'balanceOf', {}, creator, generateTokenId(creator, 10, 8, 1006, 0)), 10);
                assert.equal(await call(contracts.Asset, 'balanceOf', {}, creator, generateTokenId(creator, 10, 8, 1006, 1)), 10);
                assert.equal(await call(contracts.Asset, 'balanceOf', {}, creator, generateTokenId(creator, 10, 8, 1006, 2)), 10);
            });

            t.test('minting a MCFT (supply > 1) results in erc1155 transfer event', async () => {
                const receipt = await tx(contracts.AssetBouncer, 'mint', {from: creator, gas}, creator, 0, zeroAddress, fixedID, ipfsHashString, 4, creator, emptyBytes);
                const eventsMatching = await getEventsFromReceipt(contracts.Asset, TransferSingleEvent, receipt);
                assert.equal(eventsMatching.length, 1);
            });

            // t.test('minting a NFT (supply > 1) results in Creator event', async () => {
            //     const receipt = await tx(contracts.AssetBouncer, 'mint', {from: creator, gas}, creator, 0, zeroAddress, 0, ipfsHashString, 4, creator, emptyBytes);
            //     const transferEvents = await getEventsFromReceipt(contracts.Asset, TransferSingleEvent, receipt);
            //     const tokenId = transferEvents[0].returnValues[3];

            //     const eventsMatching = await getEventsFromReceipt(contracts.Asset, CreatorEvent, receipt);
            //     assert.equal(eventsMatching.length, 1);
            //     const eventValues = eventsMatching[0].returnValues;
            //     assert.equal(eventValues[0], tokenId);
            //     assert.equal(eventValues[1], creator);
            // });

            t.test('minting a NFT (supply == 1) results in erc1155 transfer event', async () => {
                const receipt = await tx(contracts.AssetBouncer, 'mint', {from: creator, gas}, creator, 0, zeroAddress, fixedID, ipfsHashString, 1, creator, emptyBytes);
                const eventsMatching = await getEventsFromReceipt(contracts.Asset, TransferSingleEvent, receipt);
                assert.equal(eventsMatching.length, 1);
            });

            // t.test('after minting a MCFT I can retrieve the metadata uri via event', async () => {
            //     const receipt = await tx(contracts.AssetBouncer, 'mint', {from: creator, gas}, creator, 0, zeroAddress, fixedID, ipfsHashString, 4, creator, emptyBytes);
            //     const eventsMatching = await getEventsFromReceipt(contracts.Asset, URIEvent, receipt);
            //     assert.equal(eventsMatching[0].returnValues._value, ipfsHashString + '/0' + '.json');
            // });

            // t.test('after minting a NFT I can retrieve the metadata uri via event', async () => {
            //     const receipt = await tx(contracts.AssetBouncer, 'mint', {from: creator, gas}, creator, 0, zeroAddress, fixedID, ipfsHashString, 1, creator, emptyBytes);
            //     const eventsMatching = await getEventsFromReceipt(contracts.Asset, URIEvent, receipt);
            //     assert.equal(eventsMatching[0].returnValues._value, ipfsHashString + '/0' + '.json');
            // });

            t.test('minting a FT twice with the same id fails', async () => {
                await tx(contracts.AssetBouncer, 'mint', {from: creator, gas}, creator, 0, zeroAddress, fixedID, ipfsHashString, 10, creator, emptyBytes);
                await expectThrow(tx(contracts.AssetBouncer, 'mint', {from: creator, gas}, creator, 0, zeroAddress, fixedID, ipfsHashString, 10, creator, emptyBytes));
            });

            t.test('minting a FT twice with the same id fails even with zero hashes', async () => {
                let zeroHashSuccess = true;
                try {
                    await tx(contracts.AssetBouncer, 'mint', {from: creator, gas}, creator, 0, zeroAddress, fixedID, invalidIpfsHashString, 10, creator, emptyBytes);
                } catch (e) {
                    zeroHashSuccess = false;
                }

                if (zeroHashSuccess) {
                    await expectThrow(tx(contracts.AssetBouncer, 'mint', {from: creator, gas}, creator, 0, zeroAddress, fixedID, invalidIpfsHashString, 10, creator, emptyBytes));
                }
            });

            // minting FT and NFT are on different URI_ID
            // t.test('minting a FT then an NFT with the same id fails', async () => {
            //     await tx(contracts.AssetBouncer, 'mint', {from: creator, gas}, creator, 0, zeroAddress, fixedID, ipfsHashString, 10, creator, emptyBytes);
            //     await expectThrow(tx(contracts.AssetBouncer, 'mint', {from: creator, gas}, creator, 0, zeroAddress, fixedID, ipfsHashString, 1, creator, emptyBytes));
            // });

            // minting FT and NFT are on different URI_ID
            // t.test('minting a NFT then an FT with the same id fails', async () => {
            //     await tx(contracts.AssetBouncer, 'mint', {from: creator, gas}, creator, 0, zeroAddress, fixedID, ipfsHashString, 1, creator, emptyBytes);
            //     await expectThrow(tx(contracts.AssetBouncer, 'mint', {from: creator, gas}, creator, 0, zeroAddress, fixedID, ipfsHashString, 10, creator, emptyBytes));
            // });

            t.test('minting a multiple FT twice with the same id fails', async () => {
                await mintTokensWithSameURIAndSupply(contracts.AssetBouncer, 8, ipfsHashString, 10, creator, fixedID);
                await expectThrow(mintTokensWithSameURIAndSupply(contracts.AssetBouncer, 8, ipfsHashString, 10, creator, fixedID));
            });

            t.test('minting a multiple FT result in a packId used with correct numFTs', async () => {
                await mintTokensWithSameURIAndSupply(contracts.AssetBouncer, 8, ipfsHashString, 10, creator, fixedID);
                const packIdUsed = await call(contracts.Asset, 'isPackIdUsed', null, creator, fixedID, 8);
                assert.equal(packIdUsed, true);
                const differentPackIdUsed = await call(contracts.Asset, 'isPackIdUsed', null, creator, fixedID, 7);
                assert.equal(differentPackIdUsed, false);
                const differentPackIdUsed2 = await call(contracts.Asset, 'isPackIdUsed', null, creator, fixedID, 9);
                assert.equal(differentPackIdUsed2, false);
                const differentPackIdUsed3 = await call(contracts.Asset, 'isPackIdUsed', null, creator, fixedID+1, 8);
                assert.equal(differentPackIdUsed3, false);
            });

            // minting FT and NFT are on different URI_ID
            // t.test('minting a multiple FT then an NFT with the same id fails', async () => {
            //     await mintTokensWithSameURIAndSupply(contracts.AssetBouncer, 8, ipfsHashString, 10, creator, fixedID);
            //     await expectThrow(tx(contracts.AssetBouncer, 'mint', {from: creator, gas}, creator, 0, zeroAddress, fixedID, ipfsHashString, 1, creator, emptyBytes));
            // });

            // minting FT and NFT are on different URI_ID
            // t.test('minting a NFT then an multiple FT with the same id fails', async () => {
            //     await tx(contracts.AssetBouncer, 'mint', {from: creator, gas}, creator, 0, zeroAddress, fixedID, ipfsHashString, 1, creator, emptyBytes);
            //     await expectThrow(mintTokensWithSameURIAndSupply(contracts.AssetBouncer, 8, ipfsHashString, 10, creator, fixedID));
            // });

            t.test('after minting a MCFT I can retrieve the uri via getter', async () => {
                const tokenId = await mintAndReturnTokenId(contracts.AssetBouncer, ipfsHashString, 4, creator, fixedID);
                assert.equal(await call(contracts.Asset, 'uri', {}, tokenId), ipfsUrl + '/0' + '.json');
            });

            t.test('after minting a NFT I can retrieve the metadata uri via event', async () => {
                const tokenId = await mintAndReturnTokenId(contracts.AssetBouncer, ipfsHashString, 1, creator, fixedID);
                assert.equal(await call(contracts.Asset, 'uri', {}, tokenId), ipfsUrl + '/0' + '.json');
            });
            /// /////////////

            t.test('after minting multiple MCFT I can retrieve the metadata uri via event', async () => {
                const receipt = await mintTokensWithSameURIAndSupply(contracts.AssetBouncer, 8, ipfsHashString, 10, creator, fixedID);
                const eventsMatching = await getEventsFromReceipt(contracts.Asset, URIEvent, receipt);
                for (let i = 0; i < eventsMatching.length; i++) {
                    assert.equal(eventsMatching[i].returnValues._value, ipfsHashString + '/' + i + '.json');
                }
            });

            t.test('minting multiple MCFT results in one TransferBatchEvent', async () => {
                const receipt = await mintTokensWithSameURIAndSupply(contracts.AssetBouncer, 8, ipfsHashString, 10, creator, fixedID);
                const eventsMatching = await getEventsFromReceipt(contracts.Asset, TransferBatchEvent, receipt);
                assert.equal(eventsMatching.length, 1);
                const eventValues = eventsMatching[0].returnValues;
                assert.equal(eventValues[0], contracts.AssetBouncer.options.address);
                assert.equal(eventValues[1], zeroAddress);
                assert.equal(eventValues[2], creator);
                // TODO
                // assert.equal(eventValues[3], ids);
                // assert.equal(eventValues[4], supplies);
            });

            // t.test('minting multiple MCFT results in x CreatorEvent', async () => {
            //     const receipt = await mintTokensWithSameURIAndSupply(contracts.AssetBouncer, 8, ipfsHashString, 10, creator, fixedID);
            //     const eventsMatching = await getEventsFromReceipt(contracts.Asset, CreatorEvent, receipt);
            //     assert.equal(eventsMatching.length, 8);
            // });

            // t.test('after minting more than 8 different MCFT and I can retrieve the metadata uri via event', async () => {
            //     const receipt = await mintTokensWithSameURIAndSupply(contracts.AssetBouncer, 10, ipfsHashString, 10, creator, fixedID);
            //     const eventsMatching = await getEventsFromReceipt(contracts.Asset, URIEvent, receipt);
            //     for (let i = 0; i < eventsMatching.length; i++) {
            //         assert.equal(eventsMatching[i].returnValues._value, ipfsHashString + '/' + i + '.json');
            //     }
            // });

            t.test('after minting more than 8 different MCFT and I can retrieve the metadata uri', async () => {
                const tokenIds = await mintTokensWithSameURIAndSupply(contracts.AssetBouncer, 10, ipfsHashString, 10, creator, fixedID);
                // console.log(new BN(fixedID).toString(16));
                // console.log(creator);

                // for (let i = 0; i < tokenIds.length; i++) {
                //     console.log(new BN(tokenIds[i]).toString(16));
                // }
                // const eventsMatching = await getEventsFromReceipt(contracts.Asset, encodeEventSignature('Debug(uint16)'), {});
                // console.log(JSON.stringify(eventsMatching, null, '  '));
                for (let i = 0; i < tokenIds.length; i++) {
                    assert.equal(await call(contracts.Asset, 'uri', {}, tokenIds[i]), ipfsUrl + '/' + i + '.json');
                }
            });

            t.test('after minting a MCFT I can retrieve the creator', async () => {
                const tokenId = await mintAndReturnTokenId(contracts.AssetBouncer, ipfsHashString, 10, creator, fixedID);
                const creatorSaved = await contracts.Asset.methods.creatorOf(tokenId).call();
                assert.equal(creatorSaved, creator);
            });

            t.test('after minting a NFT I can retrieve the creator', async () => {
                const tokenId = await mintAndReturnTokenId(contracts.AssetBouncer, ipfsHashString, 1, creator, fixedID);
                const creatorSaved = await contracts.Asset.methods.creatorOf(tokenId).call();
                assert.equal(creatorSaved, creator);
            });

            // t.test('after minting MCFT along NFT in a multiple mint call, we should retrived their uri in events', async () => {
            //     const receipt = await mintTokensIncludingNFTWithSameURI(contracts.Asset, 10, ipfsHashString, 10, 6, creator, fixedID);
            //     const eventsMatching = await getEventsFromReceipt(contracts.Asset, URIEvent, receipt);
            //     assert.equal(eventsMatching.length, 10+6);
            //     for (let i = 0; i < eventsMatching.length; i++) {
            //         assert.equal(eventsMatching[i].returnValues._value, ipfsHashString + '/' + i + '.json');
            //     }
            // });

            t.test('after minting MCFT along NFT in a multiple mint call, we should retrieved their uri', async () => {
                const tokenIds = await mintTokensIncludingNFTWithSameURI(contracts.AssetBouncer, 10, ipfsHashString, 10, 6, creator, fixedID);
                // console.log(new BN(fixedID).toString(16));
                // console.log(creator);

                // for (let i = 0; i < tokenIds.length; i++) {
                //     console.log(new BN(tokenIds[i]).toString(16));
                // }
                for (let i = 0; i < tokenIds.length; i++) {
                    let uri;
                    try {
                        uri = await call(contracts.Asset, 'uri', {}, tokenIds[i]);
                    } catch (e) {}
                    assert.equal(uri, ipfsUrl + '/' + i + '.json');
                }
            });

            t.test('after minting MCFT along with NFT in batch, it should fails', async () => {
                await expectThrow(mintMultiple(
                    contracts.AssetBouncer,
                    ipfsHashString,
                    [100, 30, 1, 50],
                    creator,
                    fixedID
                ));
            });

            t.test('minting NFT at the end works', async () => {
                await mintMultiple(
                    contracts.AssetBouncer,
                    ipfsHashString,
                    [100, 30, 50, 1, 1, 1],
                    creator,
                    fixedID
                );
            });

            t.test('minting multiple NFT with rarity', async () => {
                const rarities = [0, 0, 0, 1, 0, 0, 2, 0, 3, 1, 2, 1, 1, 0, 3, 0, 0];
                const tokenIds = await mintMultipleForAndReturnTokenIds(contracts.GenesisBouncer, genesisMinter, ipfsHashString, [10, 23, 11, 11, 11, 11, 11, 12, 8, 1, 1, 1, 1, 1, 1, 1, 1], rarities, creator, fixedID);
                for (let i = 0; i < rarities.length; i++) {
                    const rarity = await call(contracts.Asset, 'rarity', null, tokenIds[i]);
                    assert.equal(rarity, rarities[i]);
                }
            });
        });

        t.test('erc721 operators', async (t) => {
            t.test('erc1155 transfer should work if operator approved', async () => {
                const tokenId = await mintAndReturnTokenId(contracts.AssetBouncer, ipfsHashString, 1, creator, fixedID);
                const operator = user2;
                await tx(contracts.Asset, 'approve', {from: creator, gas}, operator, tokenId);
                await tx(contracts.Asset, 'safeTransferFrom', {from: operator, gas}, creator, user1, tokenId, 1, emptyBytes);
                const balance = await call(contracts.Asset, 'balanceOf', null, user1, tokenId);
                assert.equal(balance, '1');
            });

            t.test('erc1155 zero transfer should work if operator approved', async () => {
                const tokenId = await mintAndReturnTokenId(contracts.AssetBouncer, ipfsHashString, 1, creator, fixedID);
                const operator = user2;
                await tx(contracts.Asset, 'approve', {from: creator, gas}, operator, tokenId);
                await tx(contracts.Asset, 'safeTransferFrom', {from: operator, gas}, creator, user1, tokenId, 0, emptyBytes);
                const balance = await call(contracts.Asset, 'balanceOf', null, user1, tokenId);
                assert.equal(balance, '0');
            });
        });

        t.test('test duplicate id transfers', async (t) => {
            t.test('erc1155 batch transfer of same NFT ids should fails even if owned', async () => {
                const tokenId = await mintAndReturnTokenId(contracts.AssetBouncer, ipfsHashString, 1, creator, fixedID);
                const tokenId2 = await mintAndReturnTokenId(contracts.AssetBouncer, ipfsHashString, 4, creator, fixedID + 1);
                await expectThrow(tx(contracts.Asset, 'safeBatchTransferFrom', {from: creator, gas}, creator, user1, [tokenId, tokenId2, tokenId], [1, 2, 1], emptyBytes));
            });

            t.test('erc1155 batch transfer of same NFT ids should fails even if from == to', async () => {
                const tokenId = await mintAndReturnTokenId(contracts.AssetBouncer, ipfsHashString, 1, creator, fixedID);
                const tokenId2 = await mintAndReturnTokenId(contracts.AssetBouncer, ipfsHashString, 4, creator, fixedID + 1);
                let reverted = false;
                try {
                    await tx(contracts.Asset, 'safeBatchTransferFrom', {from: creator, gas}, creator, creator, [tokenId, tokenId2, tokenId], [1, 2, 1], emptyBytes);
                } catch (e) {
                    reverted = true;
                    const keys = Object.keys(e.data);
                    console.log('REVERT REASON', e.data[keys[0]].reason);
                }
                assert.equal(reverted, true);
            });

            t.test('erc1155 batch transfer of different ids is fine', async () => {
                const tokenId = await mintAndReturnTokenId(contracts.AssetBouncer, ipfsHashString, 1, creator, fixedID);
                const tokenId2 = await mintAndReturnTokenId(contracts.AssetBouncer, ipfsHashString, 4, creator, fixedID + 1);
                const tokenId3 = await mintAndReturnTokenId(contracts.AssetBouncer, ipfsHashString, 1, creator, fixedID + 2);
                await tx(contracts.Asset, 'safeBatchTransferFrom', {from: creator, gas}, creator, user1, [tokenId, tokenId2, tokenId3], [1, 2, 1], emptyBytes);
                const balance = await call(contracts.Asset, 'balanceOf', null, user1, tokenId);
                assert.equal(balance, '1');
                const balance2 = await call(contracts.Asset, 'balanceOf', null, user1, tokenId2);
                assert.equal(balance2, '2');
                const balance3 = await call(contracts.Asset, 'balanceOf', null, user1, tokenId3);
                assert.equal(balance3, '1');
            });

            t.test('erc1155 batch transfer of same ids should fails if not enough owned', async () => {
                const tokenId = await mintAndReturnTokenId(contracts.AssetBouncer, ipfsHashString, 5, creator, fixedID);
                const tokenId2 = await mintAndReturnTokenId(contracts.AssetBouncer, ipfsHashString, 4, creator, fixedID + 1);
                await expectThrow(tx(contracts.Asset, 'safeBatchTransferFrom', {from: creator, gas}, creator, user1, [tokenId, tokenId2, tokenId], [2, 2, 4], emptyBytes));
            });

            t.test('erc1155 batch transfer of same ids should fails if not enough owned even when from == to', async () => {
                const tokenId = await mintAndReturnTokenId(contracts.AssetBouncer, ipfsHashString, 5, creator, fixedID);
                const tokenId2 = await mintAndReturnTokenId(contracts.AssetBouncer, ipfsHashString, 4, creator, fixedID + 1);
                let reverted = false;
                try {
                    await tx(contracts.Asset, 'safeBatchTransferFrom', {from: creator, gas}, creator, creator, [tokenId, tokenId2, tokenId], [2, 2, 4], emptyBytes);
                } catch (e) {
                    reverted = true;
                    const keys = Object.keys(e.data);
                    console.log('REVERT REASON', e.data[keys[0]].reason);
                }
                assert.equal(reverted, true);
            });

            t.test('erc1155 batch transfer of same ids is fine if enough is owned', async () => {
                const tokenId = await mintAndReturnTokenId(contracts.AssetBouncer, ipfsHashString, 5, creator, fixedID);
                const tokenId2 = await mintAndReturnTokenId(contracts.AssetBouncer, ipfsHashString, 4, creator, fixedID + 1);
                await tx(contracts.Asset, 'safeBatchTransferFrom', {from: creator, gas}, creator, user1, [tokenId, tokenId2, tokenId], [2, 2, 2], emptyBytes);
                const balance = await call(contracts.Asset, 'balanceOf', null, user1, tokenId);
                assert.equal(balance, '4');
                const balance2 = await call(contracts.Asset, 'balanceOf', null, user1, tokenId2);
                assert.equal(balance2, '2');
            });

            t.test('erc1155 batch transfer', async () => {
                const numTokens = 1000;
                const supplies = [];
                const rarities = [];
                const tokenIdsAmountsToTransfer = [];
                for (let i = 0; i < numTokens; i++) {
                    supplies.push(10);
                    tokenIdsAmountsToTransfer.push(8);
                    rarities.push(1);
                }
                let tokenIds;
                try {
                    tokenIds = await mintMultipleForAndReturnTokenIds({gas: 15000000}, contracts.GenesisBouncer, genesisMinter, ipfsHashString, supplies, rarities, creator, fixedID);
                } catch (e) {
                    console.log('could not mint tokenIds for batch', e);
                }
                const receipt = await tx(contracts.Asset, 'safeBatchTransferFrom', {from: creator, gas: 10000000}, creator, user1, tokenIds, tokenIdsAmountsToTransfer, emptyBytes);
                console.log(`gas used to transfer ${numTokens} tokens = ${receipt.gasUsed}`);
            });
            t.test('erc1155 batch transfer with from == to', async () => {
                const numTokens = 1000;
                const supplies = [];
                const rarities = [];
                const tokenIdsAmountsToTransfer = [];
                for (let i = 0; i < numTokens; i++) {
                    supplies.push(10);
                    tokenIdsAmountsToTransfer.push(8);
                    rarities.push(1);
                }
                let tokenIds;
                try {
                    tokenIds = await mintMultipleForAndReturnTokenIds({gas: 15000000}, contracts.GenesisBouncer, genesisMinter, ipfsHashString, supplies, rarities, creator, fixedID);
                } catch (e) {
                    console.log('could not mint tokenIds for from==to batch', e);
                }
                const receipt = await tx(contracts.Asset, 'safeBatchTransferFrom', {from: creator, gas: 15000000}, creator, creator, tokenIds, tokenIdsAmountsToTransfer, emptyBytes);
                console.log(`gas used to transfer ${numTokens} tokens (from==to) = ${receipt.gasUsed}`);
            });
        });

        t.test('super operators', async (t) => {
            t.test('erc1155 transfer from creator should work', async () => {
                const tokenId = await mintAndReturnTokenId(contracts.AssetBouncer, ipfsHashString, 4, creator, fixedID);
                const superOperator = user2;
                await tx(contracts.Asset, 'setSuperOperator', {from: assetAdmin, gas}, superOperator, true);
                await tx(contracts.Asset, 'safeTransferFrom', {from: superOperator, gas}, creator, user1, tokenId, 2, emptyBytes);
                const balance = await call(contracts.Asset, 'balanceOf', null, user1, tokenId);
                assert.equal(balance, '2');
            });

            t.test('erc1155 transfer from zero address should fail', async () => {
                const tokenId = await mintAndReturnTokenId(contracts.AssetBouncer, ipfsHashString, 4, creator, fixedID);
                const superOperator = user2;
                await tx(contracts.Asset, 'setSuperOperator', {from: assetAdmin, gas}, superOperator, true);
                await expectThrow(tx(contracts.Asset, 'safeTransferFrom', {from: superOperator, gas}, zeroAddress, user1, tokenId, 2, emptyBytes));
            });

            t.test('erc1155 batch transfer from creator should work', async () => {
                const tokenId = await mintAndReturnTokenId(contracts.AssetBouncer, ipfsHashString, 4, creator, fixedID);
                const tokenId2 = await mintAndReturnTokenId(contracts.AssetBouncer, ipfsHashString, 4, creator, fixedID + 1);
                const superOperator = user2;
                await tx(contracts.Asset, 'setSuperOperator', {from: assetAdmin, gas}, superOperator, true);
                await tx(contracts.Asset, 'safeBatchTransferFrom', {from: superOperator, gas}, creator, user1, [tokenId, tokenId2], [2, 3], emptyBytes);
                const balance = await call(contracts.Asset, 'balanceOf', null, user1, tokenId);
                assert.equal(balance, '2');
                const balance2 = await call(contracts.Asset, 'balanceOf', null, user1, tokenId2);
                assert.equal(balance2, '3');
            });

            t.test('erc1155 batch transfer from zero address should fail', async () => {
                const tokenId = await mintAndReturnTokenId(contracts.AssetBouncer, ipfsHashString, 4, creator, fixedID);
                const tokenId2 = await mintAndReturnTokenId(contracts.AssetBouncer, ipfsHashString, 4, creator, fixedID + 1);
                const superOperator = user2;
                await tx(contracts.Asset, 'setSuperOperator', {from: assetAdmin, gas}, superOperator, true);
                await expectThrow(tx(contracts.Asset, 'safeBatchTransferFrom', {from: superOperator, gas}, zeroAddress, user1, [tokenId, tokenId2], [2, 3], emptyBytes));
            });

            t.test('erc721 safe transfer from creator should work', async () => {
                const tokenId = await mintAndReturnTokenId(contracts.AssetBouncer, ipfsHashString, 1, creator, fixedID);
                const superOperator = user2;
                await tx(contracts.Asset, 'setSuperOperator', {from: assetAdmin, gas}, superOperator, true);
                await tx(contracts.Asset, 'safeTransferFrom', {from: superOperator, gas}, creator, user1, tokenId);
                const balance = await call(contracts.Asset, 'balanceOf', null, user1, tokenId);
                assert.equal(balance, '1');
            });

            t.test('erc721 safe transfer from zero address should fail', async () => {
                const tokenId = await mintAndReturnTokenId(contracts.AssetBouncer, ipfsHashString, 1, creator, fixedID);
                const superOperator = user2;
                await tx(contracts.Asset, 'setSuperOperator', {from: assetAdmin, gas}, superOperator, true);
                await expectThrow(tx(contracts.Asset, 'safeTransferFrom', {from: superOperator, gas}, zeroAddress, user1, tokenId));
            });

            t.test('erc721 transfer from creator should work', async () => {
                const tokenId = await mintAndReturnTokenId(contracts.AssetBouncer, ipfsHashString, 1, creator, fixedID);
                const superOperator = user2;
                await tx(contracts.Asset, 'setSuperOperator', {from: assetAdmin, gas}, superOperator, true);
                await tx(contracts.Asset, 'transferFrom', {from: superOperator, gas}, creator, user1, tokenId);
                const balance = await call(contracts.Asset, 'balanceOf', null, user1, tokenId);
                assert.equal(balance, '1');
            });

            t.test('erc721 transfer from zero address should fail', async () => {
                const tokenId = await mintAndReturnTokenId(contracts.AssetBouncer, ipfsHashString, 1, creator, fixedID);
                const superOperator = user2;
                await tx(contracts.Asset, 'setSuperOperator', {from: assetAdmin, gas}, superOperator, true);
                await expectThrow(tx(contracts.Asset, 'transferFrom', {from: superOperator, gas}, zeroAddress, user1, tokenId));
            });
        });

        t.test('creatorship', async (t) => {
            // t.runOnly = true;
            t.test('creator for non existing items fail', async (t) => {
                await tx(contracts.AssetBouncer, 'mint', {from: creator, gas}, creator, 0, zeroAddress, fixedID, ipfsHashString, 4, creator, emptyBytes);
                assert.equal(await call(contracts.Asset, 'creatorOf', {}, generateTokenId(creator, 4, 1, fixedID)), creator);

                await expectThrow(call(contracts.Asset, 'creatorOf', {}, old_generateTokenId(creator, 4, fixedID)));
            });

            t.test('initial creator', async (t) => {
                await tx(contracts.AssetBouncer, 'mint', {from: creator, gas}, creator, 0, zeroAddress, fixedID, ipfsHashString, 4, creator, emptyBytes);
                assert.equal(await call(contracts.Asset, 'creatorOf', {}, generateTokenId(creator, 4, 1, fixedID)), creator);

                await tx(contracts.AssetBouncer, 'mintMultiple', {from: creator, gas},
                    creator,
                    0,
                    zeroAddress,
                    fixedID + 1,
                    ipfsHashString,
                    [4, 5, 10],
                    creator,
                    emptyBytes
                );
                assert.equal(await call(contracts.Asset, 'creatorOf', {}, generateTokenId(creator, 4, 3, fixedID + 1, 0)), creator);
                assert.equal(await call(contracts.Asset, 'creatorOf', {}, generateTokenId(creator, 5, 3, fixedID + 1, 1)), creator);
                assert.equal(await call(contracts.Asset, 'creatorOf', {}, generateTokenId(creator, 10, 3, fixedID + 1, 2)), creator);

                await tx(contracts.AssetBouncer, 'mintMultiple', {from: creator, gas},
                    creator,
                    0,
                    zeroAddress,
                    fixedID + 2,
                    ipfsHashString,
                    [4, 5, 10, 1, 1],
                    creator,
                    emptyBytes
                );

                assert.equal(await call(contracts.Asset, 'creatorOf', {}, generateTokenId(creator, 4, 3, fixedID + 2, 0)), creator);
                assert.equal(await call(contracts.Asset, 'creatorOf', {}, generateTokenId(creator, 5, 3, fixedID + 2, 1)), creator);
                assert.equal(await call(contracts.Asset, 'creatorOf', {}, generateTokenId(creator, 10, 3, fixedID + 2, 2)), creator);

                assert.equal(await call(contracts.Asset, 'creatorOf', {}, generateTokenId(creator, 1, 3, fixedID + 2, 3)), creator);
                assert.equal(await call(contracts.Asset, 'creatorOf', {}, generateTokenId(creator, 1, 3, fixedID + 2, 4)), creator);

                // comment out as now existence cannot be established
                await expectThrow(call(contracts.Asset, 'creatorOf', {}, generateTokenId(creator, 10, 2, fixedID + 2, 2)));
            });

            t.test('transfer creator', async (t) => {
                await tx(contracts.AssetBouncer, 'mint', {from: creator, gas}, creator, 0, zeroAddress, fixedID, ipfsHashString, 4, creator, emptyBytes);
                await tx(contracts.AssetBouncer, 'mintMultiple', {from: creator, gas},
                    creator,
                    0,
                    zeroAddress,
                    fixedID + 1,
                    ipfsHashString,
                    [4, 5, 10],
                    creator,
                    emptyBytes
                );
                await tx(contracts.AssetBouncer, 'mintMultiple', {from: creator, gas},
                    creator,
                    0,
                    zeroAddress,
                    fixedID + 2,
                    ipfsHashString,
                    [4, 5, 10, 1, 1],
                    creator,
                    emptyBytes
                );

                await tx(contracts.Asset, 'transferCreatorship', {from: creator, gas}, creator, creator, user1);

                assert.equal(await call(contracts.Asset, 'creatorOf', {}, generateTokenId(creator, 4, 1, fixedID)), user1);
                assert.equal(await call(contracts.Asset, 'creatorOf', {}, generateTokenId(creator, 4, 3, fixedID + 1, 0)), user1);
                assert.equal(await call(contracts.Asset, 'creatorOf', {}, generateTokenId(creator, 5, 3, fixedID + 1, 1)), user1);
                assert.equal(await call(contracts.Asset, 'creatorOf', {}, generateTokenId(creator, 10, 3, fixedID + 1, 2)), user1);
                assert.equal(await call(contracts.Asset, 'creatorOf', {}, generateTokenId(creator, 4, 3, fixedID + 2, 0)), user1);
                assert.equal(await call(contracts.Asset, 'creatorOf', {}, generateTokenId(creator, 5, 3, fixedID + 2, 1)), user1);
                assert.equal(await call(contracts.Asset, 'creatorOf', {}, generateTokenId(creator, 10, 3, fixedID + 2, 2)), user1);
                assert.equal(await call(contracts.Asset, 'creatorOf', {}, generateTokenId(creator, 1, 3, fixedID + 2, 3)), user1);
                assert.equal(await call(contracts.Asset, 'creatorOf', {}, generateTokenId(creator, 1, 3, fixedID + 2, 4)), user1);

                // comment out as now existence cannot be established
                await expectThrow(call(contracts.Asset, 'creatorOf', {}, generateTokenId(creator, 4, 3, fixedID)));
                await expectThrow(call(contracts.Asset, 'creatorOf', {}, generateTokenId(creator, 10, 4, fixedID + 2, 2)));

                // assert.equal(generateTokenId(creator, 11, 3, fixedID + 2, 2), generateTokenId(creator, 10, 3, fixedID + 2, 2));
            });
        });

        t.test('update token', async (t) => {
            // t.runOnly = true;

            let Bouncer;
            t.beforeEach(async () => {
                Bouncer = await deployContract(creator, 'TestBouncer', contracts.Asset.options.address);
                await tx(contracts.Asset, 'setBouncer', {from: assetBouncerAdmin, gas}, Bouncer.options.address, true);
            });

            t.test('update token burn old one', async (t) => {
                const tokenId = await mintAndReturnTokenId(contracts.AssetBouncer, ipfsHashString, 1, creator, fixedID);
                await tx(Bouncer, 'updateERC721', {from: creator, gas}, creator, tokenId, fixedID + 1, ipfsHashString, 2, creator);
                await expectThrow(call(contracts.Asset, 'ownerOf', null, tokenId));
            });

            t.test('update token reduce balance to zero', async (t) => {
                const tokenId = await mintAndReturnTokenId(contracts.AssetBouncer, ipfsHashString, 1, creator, fixedID);
                await tx(Bouncer, 'updateERC721', {from: creator, gas}, creator, tokenId, fixedID + 1, ipfsHashString, 2, creator);
                const balance = await call(contracts.Asset, 'balanceOf', null, creator, tokenId);
                assert.equal(balance, '0');
            });

            t.test('update token use new rarity value', async (t) => {
                const tokenId = await mintAndReturnTokenId(contracts.AssetBouncer, ipfsHashString, 1, creator, fixedID);
                const oldRarity = await call(contracts.Asset, 'rarity', null, tokenId);
                assert.equal(oldRarity, '0');
                await tx(Bouncer, 'updateERC721', {from: creator, gas}, creator, tokenId, fixedID + 1, ipfsHashString, 2, creator);

                const newTokenId = generateTokenId(creator, 1, 0, fixedID + 1);
                const rarity = await call(contracts.Asset, 'rarity', null, newTokenId);
                assert.equal(rarity, '2');
            });

            t.test('cant update token you do not own', async (t) => {
                const tokenId = await mintAndReturnTokenId(contracts.AssetBouncer, ipfsHashString, 1, user1, fixedID);
                await expectThrow(tx(Bouncer, 'updateERC721', {from: creator, gas}, creator, tokenId, fixedID + 1, ipfsHashString, 2, creator));
            });

            t.test('cant update FT token', async (t) => {
                const tokenId = await mintAndReturnTokenId(contracts.AssetBouncer, ipfsHashString, 4, creator, fixedID);
                await expectThrow(tx(Bouncer, 'updateERC721', {from: creator, gas}, creator, tokenId, fixedID + 1, ipfsHashString, 2, creator));
            });

            t.test('update token emit Update event', async (t) => {
                const tokenId = await mintAndReturnTokenId(contracts.AssetBouncer, ipfsHashString, 1, creator, fixedID);
                const receipt = await tx(Bouncer, 'updateERC721', {from: creator, gas}, creator, tokenId, fixedID + 1, ipfsHashString, 2, creator);
                const eventsMatching = await getEventsFromReceipt(contracts.Asset, AssetUpdateEvent, receipt);
                assert.equal(eventsMatching.length, 1);
            });
        });

        t.test('burn token', async (t) => {
            t.test('cannot burn more token that you ownn', async (t) => {
                const tokenId = await mintAndReturnTokenId(contracts.AssetBouncer, ipfsHashString, 3, creator, fixedID);
                await expectThrow(tx(contracts.Asset, 'burnFrom', {from: creator, gas}, creator, tokenId, 4));
            });

            t.test('cannot burn an amount > 1 of NFT ', async (t) => {
                const tokenId = await mintAndReturnTokenId(contracts.AssetBouncer, ipfsHashString, 1, creator, fixedID);
                await expectThrow(tx(contracts.Asset, 'burnFrom', {from: creator, gas}, creator, tokenId, 2));
            });

            t.test('cannot burn an NFT you do not own ', async (t) => {
                const tokenId = await mintAndReturnTokenId(contracts.AssetBouncer, ipfsHashString, 1, user1, fixedID);
                await expectThrow(tx(contracts.Asset, 'burnFrom', {from: creator, gas}, creator, tokenId, 1));
            });

            t.test('burning emit Transfer event so that supply can be updated ', async (t) => {
                const tokenId = await mintAndReturnTokenId(contracts.AssetBouncer, ipfsHashString, 1, creator, fixedID);
                const receipt = await tx(contracts.Asset, 'burnFrom', {from: creator, gas}, creator, tokenId, 1);
                const eventsMatching = await getEventsFromReceipt(contracts.Asset, TransferEvent, receipt);
                assert.equal(eventsMatching.length, 1);
                // TODO check values
            });

            t.test('burning emit TransferSingle event so that supply can be updated ', async (t) => {
                const tokenId = await mintAndReturnTokenId(contracts.AssetBouncer, ipfsHashString, 11, creator, fixedID);
                const receipt = await tx(contracts.Asset, 'burnFrom', {from: creator, gas}, creator, tokenId, 10);
                const eventsMatching = await getEventsFromReceipt(contracts.Asset, TransferSingleEvent, receipt);
                assert.equal(eventsMatching.length, 1);
                // TODO check values
            });

            t.test('burning of NFT remove ownership of NFT ', async (t) => {
                const tokenId = await mintAndReturnTokenId(contracts.AssetBouncer, ipfsHashString, 1, creator, fixedID);
                await tx(contracts.Asset, 'burnFrom', {from: creator, gas}, creator, tokenId, 1);
                await expectThrow(call(contracts.Asset, 'ownerOf', null, tokenId));
            });

            t.test('burning of FT reduce balance ', async (t) => {
                const tokenId = await mintAndReturnTokenId(contracts.AssetBouncer, ipfsHashString, 5, creator, fixedID);
                await tx(contracts.Asset, 'burnFrom', {from: creator, gas}, creator, tokenId, 2);
                const balance = await call(contracts.Asset, 'balanceOf', null, creator, tokenId);
                assert.equal(balance, '3');
            });

            t.test('burning of FT reduce balance (even to zero)', async (t) => {
                const tokenId = await mintAndReturnTokenId(contracts.AssetBouncer, ipfsHashString, 5, creator, fixedID);
                await tx(contracts.Asset, 'burnFrom', {from: creator, gas}, creator, tokenId, 5);
                const balance = await call(contracts.Asset, 'balanceOf', null, creator, tokenId);
                assert.equal(balance, '0');
            });
        });
    });
}

module.exports = {
    runAssetTests
};