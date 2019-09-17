const BN = require('bn.js');
const tap = require('tap');
const assert = require('assert');
const rocketh = require('rocketh');
const accounts = rocketh.accounts;

const {
    getEventsFromReceipt,
    encodeEventSignature,
    tx,
    gas,
    call,
    expectThrow,
    emptyBytes,
    deployContract,
} = require('./utils');

// const {
//     TransferSingleEvent,
//     TransferBatchEvent,
//     URIEvent
// } = require('./erc1155')

const {
    TransferEvent
} = require('./erc721')

const creator = accounts[0];
const user1 = accounts[1];
const operator = accounts[2];

function runDualERC1155ERC721tests(title, resetContracts, mintDual) {
    tap.test(title + " as dual erc1155/erc721", async (t)=> {
        // t.runOnly = true;
        let contracts;
        let assetsId;
        t.beforeEach(async () => {
            contracts = await resetContracts();
            assetsId = [];
            assetsId.push(await mintDual(contracts.AssetBouncer, creator, 10));
            assetsId.push(await mintDual(contracts.AssetBouncer, creator, 1));
            assetsId.push(await mintDual(contracts.AssetBouncer, creator, 5));
            assetsId.push(await mintDual(contracts.AssetBouncer, creator, 1));
            assetsId.push(await mintDual(contracts.AssetBouncer, creator, 15));
            assetsId.push(await mintDual(contracts.AssetBouncer, creator, 1));
        });     
  
        t.test('transfers', async (t) => {
            // t.runOnly = true;
            t.test('transfering one NFT via ERC1155 transfer method results in one erc721 transfer event', async () => {
                const receipt = await tx(contracts.Asset, 'safeTransferFrom', {from: creator, gas}, creator, user1, assetsId[1], 1, emptyBytes);
                const eventsMatching = await getEventsFromReceipt(contracts.Asset, TransferEvent, receipt);
                assert.equal(eventsMatching.length, 1);
            });

            t.test('transfering one MFT via ERC1155 transfer method should result in no erc721 transfer event', async () => {
                const receipt = await tx(contracts.Asset, 'safeTransferFrom', {from: creator, gas}, creator, user1, assetsId[0], 1, emptyBytes);
                const eventsMatching = await getEventsFromReceipt(contracts.Asset, TransferEvent, receipt);
                assert.equal(eventsMatching.length, 0);
            });

            t.test('transfering one MFT via ERC721 transfer should fails', async () => {
                await expectThrow(tx(contracts.Asset, 'transferFrom', {from: creator, gas}, creator, user1, assetsId[0]));
            });

            t.test('using erc721 transferFrom for NFT via ERC721 transfer on a ERC721 token receiver contract should work', async () => {
                const receiverContract = await deployContract(creator, 'TestERC721TokenReceiver', contracts.Asset.options.address, true, true);
                const receiverAddress = receiverContract.options.address;
                const receipt = await tx(contracts.Asset, 'transferFrom', {from: creator, gas}, creator, receiverAddress, assetsId[1]);
                // console.log('gas for using erc721 transferFrom for NFT via ERC721 transfer on a ERC721 token receiver contract', receipt.gasUsed);
                const newOwner = await call(contracts.Asset, 'ownerOf', null, assetsId[1]);
                assert.equal(newOwner, receiverAddress);
            });

            t.test('using erc721 transferFrom for NFT via ERC721 transfer on a rejecting ERC721 token receiver contract should work', async () => {
                const receiverContract = await deployContract(creator, 'TestERC721TokenReceiver', contracts.Asset.options.address, false, true);
                const receiverAddress = receiverContract.options.address;
                const receipt = await tx(contracts.Asset, 'transferFrom', {from: creator, gas}, creator, receiverAddress, assetsId[1]);
                // console.log('gas for using erc721 transferFrom for NFT via ERC721 transfer on a rejecting ERC721 token receiver contract', receipt.gasUsed);
                const newOwner = await call(contracts.Asset, 'ownerOf', null, assetsId[1]);
                assert.equal(newOwner, receiverAddress);
            });

            t.test('using erc721 safeTransferFrom for NFT via ERC721 transfer on a ERC721 token receiver contract should work', async () => {
                const receiverContract = await deployContract(creator, 'TestERC721TokenReceiver', contracts.Asset.options.address, true, true);
                const receiverAddress = receiverContract.options.address;
                const receipt = await tx(contracts.Asset, 'safeTransferFrom', {from: creator, gas}, creator, receiverAddress, assetsId[1]);
                // console.log('gas for using erc721 safeTransferFrom for NFT via ERC721 transfer on a ERC721 token receiver contract', receipt.gasUsed);
                const newOwner = await call(contracts.Asset, 'ownerOf', null, assetsId[1]);
                assert.equal(newOwner, receiverAddress);
            });

            t.test('using erc721 safeTransferFrom for NFT via ERC721 transfer on a rejecting ERC721 token receiver contract should fails', async () => {
                const receiverContract = await deployContract(creator, 'TestERC721TokenReceiver', contracts.Asset.options.address, false, true);
                const receiverAddress = receiverContract.options.address;
                await expectThrow(tx(contracts.Asset, 'safeTransferFrom', {from: creator, gas}, creator, receiverAddress, assetsId[1]));
            });

            t.test('transfering one NFT via ERC721 transferFrom on a dual ERC721/ERC1155 token receiver contract should work', async () => {
                const receiverContract = await deployContract(creator, 'TestERC1155ERC721TokenReceiver', contracts.Asset.options.address, true, true, true, true, true);
                const receiverAddress = receiverContract.options.address;
                const receipt = await tx(contracts.Asset, 'transferFrom', {from: creator, gas}, creator, receiverAddress, assetsId[1]);
                // console.log('gas for transfering one NFT via ERC721 transferFrom on a dual ERC721/ERC1155 token receiver', receipt.gasUsed);
                const newOwner = await call(contracts.Asset, 'ownerOf', null, assetsId[1]);
                assert.equal(newOwner, receiverAddress);
            });

            // TODO replace with other tests for isERC1155TokenReceiver()
            // t.test('transfering one NFT via ERC721 transferFrom on a dual ERC721/ERC1155 token receiver that return incorrect value for rejection should work', async () => {
            //     const receiverContract = await deployContract(creator, 'TestERC1155ERC721TokenReceiver', contracts.Asset.options.address, false, false, true, true, true);
            //     const receiverAddress = receiverContract.options.address;
            //     await tx(contracts.Asset, 'transferFrom', {from: creator, gas}, creator, receiverAddress, assetsId[1]);
            //     const newOwner = await call(contracts.Asset, 'ownerOf', null, assetsId[1]);
            //     assert.equal(newOwner, receiverAddress);
            // });

            // t.test('transfering one NFT via ERC721 transferFrom on a dual ERC721/ERC1155 token receiver that throw should work', async () => {
            //     const receiverContract = await deployContract(creator, 'TestERC1155ERC721TokenReceiver', contracts.Asset.options.address, false, false, true, true, false);
            //     const receiverAddress = receiverContract.options.address;
            //     await tx(contracts.Asset, 'transferFrom', {from: creator, gas}, creator, receiverAddress, assetsId[1]);
            //     const newOwner = await call(contracts.Asset, 'ownerOf', null, assetsId[1]);
            //     assert.equal(newOwner, receiverAddress);
            // });

            t.test('transfering one NFT via ERC721 transferFrom on a dual rejecting ERC721/ERC1155 token receiver contract should fails', async () => {
                const receiverContract = await deployContract(creator, 'TestERC1155ERC721TokenReceiver', contracts.Asset.options.address, false, true, true, true, true);
                const receiverAddress = receiverContract.options.address;
                // const receipt = await tx(contracts.Asset, 'transferFrom', {from: creator, gas}, creator, receiverAddress, assetsId[1]);
                // console.log(JSON.stringify(receipt, null, '  '));
                await expectThrow(tx(contracts.Asset, 'transferFrom', {from: creator, gas}, creator, receiverAddress, assetsId[1]));
            });

            t.test('transfering one NFT via ERC721 safeTransferFrom on a dual rejecting ERC721/ERC1155 token receiver contract should fails', async () => {
                const receiverContract = await deployContract(creator, 'TestERC1155ERC721TokenReceiver', contracts.Asset.options.address, false, true, true, true, true);
                const receiverAddress = receiverContract.options.address;
                await expectThrow(tx(contracts.Asset, 'safeTransferFrom', {from: creator, gas}, creator, receiverAddress, assetsId[1]));
            });
        });

        t.test('NFT batch transfers', async (t) => {
            t.test('transfering one NFT via batch transfer results in one erc721 transfer event', async () => {
                const receipt = await tx(contracts.Asset, 'safeBatchTransferFrom', {from: creator, gas}, 
                    creator, user1, [assetsId[1], assetsId[0], assetsId[4]], [1, 5, 10], emptyBytes);
                const eventsMatching = await getEventsFromReceipt(contracts.Asset, TransferEvent, receipt);
                assert.equal(eventsMatching.length, 1);         
            });
            t.test('transfering 2 NFT via batch transfer results in 2 erc721 transfer events', async () => {
                const receipt = await tx(contracts.Asset, 'safeBatchTransferFrom', {from: creator, gas}, 
                    creator, user1, [assetsId[1], assetsId[3], assetsId[4]], [1, 1, 10], emptyBytes);
                const eventsMatching = await getEventsFromReceipt(contracts.Asset, TransferEvent, receipt);
                assert.equal(eventsMatching.length, 2);
            });
        });
        
        t.test('NFT approvalForAll', async (t) => {
            t.test('without approval, operator should not be able to transfer', async () => {
                await expectThrow(tx(contracts.Asset, 'transferFrom', {from: operator, gas}, creator, user1, assetsId[1]));
            });
            t.test('after operator setApprovalForAll, operator should be able to transfer', async () => {
                await tx(contracts.Asset, 'setApprovalForAll', {from: creator, gas}, operator, true);
                const receipt = await tx(contracts.Asset, 'transferFrom', {from: operator, gas}, creator, user1, assetsId[1]);
                const eventsMatching = await getEventsFromReceipt(contracts.Asset, TransferEvent, receipt);
                assert.equal(eventsMatching.length, 1);
            });
            t.test('after removing setApprovalForAll, operator should not be able to transfer', async () => {
                await tx(contracts.Asset, 'setApprovalForAll', {from: creator, gas}, operator, true);
                await tx(contracts.Asset, 'setApprovalForAll', {from: creator, gas}, operator, false);
                await expectThrow(tx(contracts.Asset, 'safeTransferFrom', {from: operator, gas}, creator, user1, assetsId[1], 1, emptyBytes));
            });
        });
    });
}

module.exports = {
    runDualERC1155ERC721tests
}