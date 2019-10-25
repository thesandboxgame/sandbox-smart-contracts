const rocketh = require('rocketh');
const Web3 = require('web3');
const BN = require('bn.js');
const tap = require('tap');
const assert = require('assert');
const {
    tx,
    call,
    getDeployedContract,
    expectThrow,
} = require('rocketh-web3')(rocketh, Web3);

const {generateTokenId} = require('../asset-utils');

const {
    executeMetaTx,
} = require('../sand-utils');

const {
    TransferSingleEvent,
    TransferBatchEvent,
} = require('../erc1155');

const {
    emptyBytes,
    getEventsFromReceipt,
} = require('../utils');

const ipfsHashString = '0x78b9f42c22c3c8b260b781578da3151e8200c741c6b7437bafaff5a9df9b403e';

const {
    deployer,
    others,
    sandBeneficiary,
} = rocketh.namedAccounts;

const creator1 = others[0];
// const creator2 = others[0];

tap.test('CommonMinter', async (t) => {
    // t.runOnly = true;
    let contracts;
    t.beforeEach(async () => {
        await rocketh.runStages();
        contracts = {
            Sand: getDeployedContract('Sand'),
            Asset: getDeployedContract('Asset'),
            CommonMinter: getDeployedContract('CommonMinter'),
            NativeMetaTransactionProcessor: getDeployedContract('NativeMetaTransactionProcessor'),
        };
    });

    t.test('mintFor', async (t) => {
        t.test('can mint if provide Sand', async () => {
            await tx({from: sandBeneficiary, gas: 500000}, contracts.Sand, 'transfer', creator1, '100000000000000000000');
            await tx({from: creator1, gas: 500000}, contracts.Sand, 'approve', contracts.CommonMinter.options.address, '100000000000000000000');
            const receipt = await tx({from: creator1, gas: 3000000}, contracts.CommonMinter, 'mintFor', creator1, 0, ipfsHashString, 100, creator1, emptyBytes, '1000000000000000000');
            const eventsMatching = await getEventsFromReceipt(contracts.Asset, TransferSingleEvent, receipt);
            assert.equal(eventsMatching.length, 1);
            const tokenId = generateTokenId(creator1, 100, 1, 0);
            const balance = await call(contracts.Asset, 'balanceOf', creator1, tokenId);
            assert.equal(balance, 100);
        });

        t.test('can mint if provide Sand for NFT', async () => {
            await tx({from: sandBeneficiary, gas: 500000}, contracts.Sand, 'transfer', creator1, '100000000000000000000');
            await tx({from: creator1, gas: 500000}, contracts.Sand, 'approve', contracts.CommonMinter.options.address, '1000000000000000000');
            const receipt = await tx({from: creator1, gas: 3000000}, contracts.CommonMinter, 'mintFor', creator1, 0, ipfsHashString, 1, creator1, emptyBytes, '1000000000000000000');
            const eventsMatching = await getEventsFromReceipt(contracts.Asset, TransferSingleEvent, receipt);
            assert.equal(eventsMatching.length, 1);
            const tokenId = generateTokenId(creator1, 1, 0, 0);
            const balance = await call(contracts.Asset, 'balanceOf', creator1, tokenId);
            assert.equal(balance, 1);
            const owner = await call(contracts.Asset, 'ownerOf', tokenId);
            assert.equal(owner, creator1);
        });

        t.test('cannot mint if does not provide enough Sand', async () => {
            await tx({from: sandBeneficiary, gas: 500000}, contracts.Sand, 'transfer', creator1, '100000000000000000000');
            await tx({from: creator1, gas: 500000}, contracts.Sand, 'approve', contracts.CommonMinter.options.address, '100000000000000000000');
            await expectThrow(tx({from: creator1, gas: 3000000}, contracts.CommonMinter, 'mintFor', creator1, 0, ipfsHashString, 101, creator1, emptyBytes, '1000000000000000000'));
        });

        t.test('cannot mint if does not provide enough Sand for NFT', async () => {
            await tx({from: sandBeneficiary, gas: 500000}, contracts.Sand, 'transfer', creator1, '100000000000000000000');
            await tx({from: creator1, gas: 500000}, contracts.Sand, 'approve', contracts.CommonMinter.options.address, '900000000000000000');
            await expectThrow(tx({from: creator1, gas: 3000000}, contracts.CommonMinter, 'mintFor', creator1, 0, ipfsHashString, 1, creator1, emptyBytes, '1000000000000000000'));
        });
    });

    t.test('mintMultipleFor', async (t) => {
        t.test('can mint if provide Sand', async () => {
            await tx({from: sandBeneficiary, gas: 500000}, contracts.Sand, 'transfer', creator1, '100000000000000000000');
            await tx({from: creator1, gas: 500000}, contracts.Sand, 'approve', contracts.CommonMinter.options.address, '100000000000000000000');
            const receipt = await tx({from: creator1, gas: 3000000}, contracts.CommonMinter, 'mintMultipleFor', creator1, 0, ipfsHashString, [100], creator1, emptyBytes, '1000000000000000000');
            const eventsMatching = await getEventsFromReceipt(contracts.Asset, TransferBatchEvent, receipt);
            assert.equal(eventsMatching.length, 1);
            const tokenId = generateTokenId(creator1, 100, 1, 0);
            const balance = await call(contracts.Asset, 'balanceOf', creator1, tokenId);
            assert.equal(balance, 100);
        });

        t.test('cannot mint if does not provide enough Sand', async () => {
            await tx({from: sandBeneficiary, gas: 500000}, contracts.Sand, 'transfer', creator1, '100000000000000000000');
            await tx({from: creator1, gas: 500000}, contracts.Sand, 'approve', contracts.CommonMinter.options.address, '100000000000000000000');
            await expectThrow(tx({from: creator1, gas: 3000000}, contracts.CommonMinter, 'mintMultipleFor', creator1, 0, ipfsHashString, [101], creator1, emptyBytes, '1000000000000000000'));
        });

        t.test('can mint if provide Sand enough for the various supplies', async () => {
            await tx({from: sandBeneficiary, gas: 500000}, contracts.Sand, 'transfer', creator1, '100000000000000000000');
            await tx({from: creator1, gas: 500000}, contracts.Sand, 'approve', contracts.CommonMinter.options.address, '100000000000000000000');
            await tx({from: creator1, gas: 3000000}, contracts.CommonMinter, 'mintMultipleFor', creator1, 0, ipfsHashString, [20, 29, 51], creator1, emptyBytes, '1000000000000000000');
        });

        t.test('cannot mint if does not provide enough Sand for the total supplies', async () => {
            await tx({from: sandBeneficiary, gas: 500000}, contracts.Sand, 'transfer', creator1, '100000000000000000000');
            await tx({from: creator1, gas: 500000}, contracts.Sand, 'approve', contracts.CommonMinter.options.address, '100000000000000000000');
            await expectThrow(tx({from: creator1, gas: 3000000}, contracts.CommonMinter, 'mintMultipleFor', creator1, 0, ipfsHashString, [20, 29, 52], creator1, emptyBytes, '1000000000000000000'));
        });

        t.test('can mint if provide Sand enough for the various supplies with NFTs', async () => {
            await tx({from: sandBeneficiary, gas: 500000}, contracts.Sand, 'transfer', creator1, '100000000000000000000');
            await tx({from: creator1, gas: 500000}, contracts.Sand, 'approve', contracts.CommonMinter.options.address, '100000000000000000000');
            await tx({from: creator1, gas: 3000000}, contracts.CommonMinter, 'mintMultipleFor', creator1, 0, ipfsHashString, [20, 27, 50, 1, 1, 1], creator1, emptyBytes, '1000000000000000000');
        });

        t.test('cannot mint if does not provide enough Sand for the total supplies with NFTs', async () => {
            await tx({from: sandBeneficiary, gas: 500000}, contracts.Sand, 'transfer', creator1, '100000000000000000000');
            await tx({from: creator1, gas: 500000}, contracts.Sand, 'approve', contracts.CommonMinter.options.address, '100000000000000000000');
            await expectThrow(tx({from: creator1, gas: 3000000}, contracts.CommonMinter, 'mintMultipleFor', creator1, 0, ipfsHashString, [20, 51, 28, 1, 1], creator1, emptyBytes, '1000000000000000000'));
        });
    });

    t.test('rarity is always zero', async (t) => {
        t.test('rarity is zero for token minted with supply > 1', async () => {
            await tx({from: sandBeneficiary, gas: 500000}, contracts.Sand, 'transfer', creator1, '100000000000000000000');
            await tx({from: creator1, gas: 500000}, contracts.Sand, 'approve', contracts.CommonMinter.options.address, '100000000000000000000');
            await tx({from: creator1, gas: 3000000}, contracts.CommonMinter, 'mintFor', creator1, 0, ipfsHashString, 100, creator1, emptyBytes, '1000000000000000000');
            const tokenId = generateTokenId(creator1, 100, 1, 0);
            const rarity = await call(contracts.Asset, 'rarity', tokenId);
            assert.equal(rarity, 0);
        });

        t.test('rarity is zero for token minted with supply == 1', async () => {
            await tx({from: sandBeneficiary, gas: 500000}, contracts.Sand, 'transfer', creator1, '100000000000000000000');
            await tx({from: creator1, gas: 500000}, contracts.Sand, 'approve', contracts.CommonMinter.options.address, '100000000000000000000');
            await tx({from: creator1, gas: 3000000}, contracts.CommonMinter, 'mintFor', creator1, 0, ipfsHashString, 1, creator1, emptyBytes, '1000000000000000000');
            const tokenId = generateTokenId(creator1, 1, 0, 0);
            const rarity = await call(contracts.Asset, 'rarity', tokenId);
            assert.equal(rarity, 0);
        });

        t.test('rarity is zero for multiple token minted with supply > 1', async () => {
            await tx({from: sandBeneficiary, gas: 500000}, contracts.Sand, 'transfer', creator1, '100000000000000000000');
            await tx({from: creator1, gas: 500000}, contracts.Sand, 'approve', contracts.CommonMinter.options.address, '100000000000000000000');
            await tx({from: creator1, gas: 3000000}, contracts.CommonMinter, 'mintMultipleFor', creator1, 0, ipfsHashString, [20, 30, 40], creator1, emptyBytes, '1000000000000000000');

            const tokenId1 = generateTokenId(creator1, 20, 3, 0, 0);
            const rarity1 = await call(contracts.Asset, 'rarity', tokenId1);
            assert.equal(rarity1, 0);

            const tokenId2 = generateTokenId(creator1, 30, 3, 0, 1);
            const rarity2 = await call(contracts.Asset, 'rarity', tokenId2);
            assert.equal(rarity2, 0);

            const tokenId3 = generateTokenId(creator1, 40, 3, 0, 2);
            const rarity3 = await call(contracts.Asset, 'rarity', tokenId3);
            assert.equal(rarity3, 0);
        });

        t.test('rarity is zero for multi token with a mix of NFT', async () => {
            await tx({from: sandBeneficiary, gas: 500000}, contracts.Sand, 'transfer', creator1, '100000000000000000000');
            await tx({from: creator1, gas: 500000}, contracts.Sand, 'approve', contracts.CommonMinter.options.address, '100000000000000000000');
            await tx({from: creator1, gas: 3000000}, contracts.CommonMinter, 'mintMultipleFor', creator1, 0, ipfsHashString, [20, 30, 1], creator1, emptyBytes, '1000000000000000000');

            const tokenId1 = generateTokenId(creator1, 20, 2, 0, 0);
            const rarity1 = await call(contracts.Asset, 'rarity', tokenId1);
            assert.equal(rarity1, 0);

            const tokenId2 = generateTokenId(creator1, 30, 2, 0, 1);
            const rarity2 = await call(contracts.Asset, 'rarity', tokenId2);
            assert.equal(rarity2, 0);

            const tokenId3 = generateTokenId(creator1, 1, 2, 0, 2);
            const rarity3 = await call(contracts.Asset, 'rarity', tokenId3);
            assert.equal(rarity3, 0);
        });
    });

    t.test('meta tx', async (t) => {
        const signingAcount = {
            address: '0xFA8A6079E7B85d1be95B6f6DE1aAE903b6F40c00',
            privateKey: '0xeee5270a5c46e5b92510d70fa4d445a8cdd5010dde5b1fccc6a2bd1a9df8f5c0'
        };
        const otherSigner = {
            address: '0x75aE6abE03070a906d7a9d5C1607605DE73a0880',
            privateKey: '0x3c42a6c587e8a82474031cc06f1e6af7f5301bb2417b89d98eb3023d0ce659f6'
        };
        const executor = deployer;

        t.test('mintFor', async () => {
            await tx({from: sandBeneficiary, gas: 500000}, contracts.Sand, 'transfer', signingAcount.address, '100000000000000000000');
            const receipt = await executeMetaTx(signingAcount,
                contracts.NativeMetaTransactionProcessor,
                {from: executor, gas: 1000000, gasPrice: 1},
                {nonce: 1, minGasPrice: 1, txGas: 2000000, baseGas: 112000, tokenGasPrice: 0, relayer: executor, tokenDeposit: executor},
                contracts.CommonMinter,
                '100000000000000000000',
                'mintFor', signingAcount.address, 0, ipfsHashString, 100, signingAcount.address, emptyBytes, '1000000000000000000');
            const eventsMatching = await getEventsFromReceipt(contracts.Asset, TransferSingleEvent, receipt);
            assert.equal(eventsMatching.length, 1);
            const tokenId = generateTokenId(signingAcount.address, 100, 1, 0);
            const balance = await call(contracts.Asset, 'balanceOf', signingAcount.address, tokenId);
            assert.equal(balance, 100);
        });

        t.test('mintFor fail', async () => {
            await tx({from: sandBeneficiary, gas: 500000}, contracts.Sand, 'transfer', signingAcount.address, '90000000000000000000');
            const receipt = await executeMetaTx(signingAcount,
                contracts.NativeMetaTransactionProcessor,
                {from: executor, gas: 1000000, gasPrice: 1},
                {nonce: 1, minGasPrice: 1, txGas: 2000000, baseGas: 112000, tokenGasPrice: 0, relayer: executor, tokenDeposit: executor},
                contracts.CommonMinter,
                '100000000000000000000',
                'mintFor', signingAcount.address, 0, ipfsHashString, 100, signingAcount.address, emptyBytes, '1000000000000000000');
            const eventsMatching = await getEventsFromReceipt(contracts.Asset, TransferSingleEvent, receipt);
            assert.equal(eventsMatching.length, 0);
            const tokenId = generateTokenId(signingAcount.address, 100, 1, 0);
            const balance = await call(contracts.Asset, 'balanceOf', signingAcount.address, tokenId);
            assert.equal(balance, 0);
        });
    });
});
