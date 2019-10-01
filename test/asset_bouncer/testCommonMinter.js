const rocketh = require('rocketh');
const Web3 = require('web3');
const BN = require('bn.js');
const tap = require('tap');
const assert = require('assert');
const {
    tx,
    getDeployedContract,
    expectThrow,
} = require('rocketh-web3')(rocketh, Web3);

const {
    emptyBytes
} = require('../utils');

const ipfsHashString = '0x78b9f42c22c3c8b260b781578da3151e8200c741c6b7437bafaff5a9df9b403e';

const {
    deployer,
    others,
    sandBeneficiary,
} = rocketh.namedAccounts;

const creator1 = others[0];
const creator2 = others[0];

tap.test('CommonMinter', async (t) => {
    // t.runOnly = true;
    let contracts;
    t.beforeEach(async () => {
        await rocketh.runStages();
        contracts = {
            Sand: getDeployedContract('Sand'),
            Asset: getDeployedContract('Asset'),
            CommonMinter: getDeployedContract('CommonMinter')
        };
    });

    t.test('mintFor', async (t) => {
        t.test('can mint if provide Sand', async () => {
            await tx({from: sandBeneficiary, gas: 500000}, contracts.Sand, 'transfer', creator1, '100000000000000000000');
            await tx({from: creator1, gas: 500000}, contracts.Sand, 'approve', contracts.CommonMinter.options.address, '100000000000000000000');
            await tx({from: creator1, gas: 3000000}, contracts.CommonMinter, 'mintFor', creator1, 0, ipfsHashString, 100, creator1, emptyBytes);
        });

        t.test('can mint if provide Sand for NFT', async () => {
            await tx({from: sandBeneficiary, gas: 500000}, contracts.Sand, 'transfer', creator1, '100000000000000000000');
            await tx({from: creator1, gas: 500000}, contracts.Sand, 'approve', contracts.CommonMinter.options.address, '1000000000000000000');
            await tx({from: creator1, gas: 3000000}, contracts.CommonMinter, 'mintFor', creator1, 0, ipfsHashString, 1, creator1, emptyBytes);
        });

        t.test('cannot mint if does not provide enough Sand', async () => {
            await tx({from: sandBeneficiary, gas: 500000}, contracts.Sand, 'transfer', creator1, '100000000000000000000');
            await tx({from: creator1, gas: 500000}, contracts.Sand, 'approve', contracts.CommonMinter.options.address, '100000000000000000000');
            await expectThrow(tx({from: creator1, gas: 3000000}, contracts.CommonMinter, 'mintFor', creator1, 0, ipfsHashString, 101, creator1, emptyBytes));
        });

        t.test('cannot mint if does not provide enough Sand for NFT', async () => {
            await tx({from: sandBeneficiary, gas: 500000}, contracts.Sand, 'transfer', creator1, '100000000000000000000');
            await tx({from: creator1, gas: 500000}, contracts.Sand, 'approve', contracts.CommonMinter.options.address, '900000000000000000');
            await expectThrow(tx({from: creator1, gas: 3000000}, contracts.CommonMinter, 'mintFor', creator1, 0, ipfsHashString, 1, creator1, emptyBytes));
        });
    });

    t.test('mintMultipleFor', async (t) => {
        t.test('can mint if provide Sand', async () => {
            await tx({from: sandBeneficiary, gas: 500000}, contracts.Sand, 'transfer', creator1, '100000000000000000000');
            await tx({from: creator1, gas: 500000}, contracts.Sand, 'approve', contracts.CommonMinter.options.address, '100000000000000000000');
            await tx({from: creator1, gas: 3000000}, contracts.CommonMinter, 'mintMultipleFor', creator1, 0, ipfsHashString, [100], creator1, emptyBytes);
        });

        t.test('cannot mint if does not provide enough Sand', async () => {
            await tx({from: sandBeneficiary, gas: 500000}, contracts.Sand, 'transfer', creator1, '100000000000000000000');
            await tx({from: creator1, gas: 500000}, contracts.Sand, 'approve', contracts.CommonMinter.options.address, '100000000000000000000');
            await expectThrow(tx({from: creator1, gas: 3000000}, contracts.CommonMinter, 'mintMultipleFor', creator1, 0, ipfsHashString, [101], creator1, emptyBytes));
        });

        t.test('can mint if provide Sand enough for the various supplies', async () => {
            await tx({from: sandBeneficiary, gas: 500000}, contracts.Sand, 'transfer', creator1, '100000000000000000000');
            await tx({from: creator1, gas: 500000}, contracts.Sand, 'approve', contracts.CommonMinter.options.address, '100000000000000000000');
            await tx({from: creator1, gas: 3000000}, contracts.CommonMinter, 'mintMultipleFor', creator1, 0, ipfsHashString, [20, 29, 51], creator1, emptyBytes);
        });

        t.test('cannot mint if does not provide enough Sand for the total supplies', async () => {
            await tx({from: sandBeneficiary, gas: 500000}, contracts.Sand, 'transfer', creator1, '100000000000000000000');
            await tx({from: creator1, gas: 500000}, contracts.Sand, 'approve', contracts.CommonMinter.options.address, '100000000000000000000');
            await expectThrow(tx({from: creator1, gas: 3000000}, contracts.CommonMinter, 'mintMultipleFor', creator1, 0, ipfsHashString, [20, 29, 52], creator1, emptyBytes));
        });

        t.test('can mint if provide Sand enough for the various supplies with NFTs', async () => {
            await tx({from: sandBeneficiary, gas: 500000}, contracts.Sand, 'transfer', creator1, '100000000000000000000');
            await tx({from: creator1, gas: 500000}, contracts.Sand, 'approve', contracts.CommonMinter.options.address, '100000000000000000000');
            await tx({from: creator1, gas: 3000000}, contracts.CommonMinter, 'mintMultipleFor', creator1, 0, ipfsHashString, [20, 27, 50, 1, 1, 1], creator1, emptyBytes);
        });

        t.test('cannot mint if does not provide enough Sand for the total supplies with NFTs', async () => {
            await tx({from: sandBeneficiary, gas: 500000}, contracts.Sand, 'transfer', creator1, '100000000000000000000');
            await tx({from: creator1, gas: 500000}, contracts.Sand, 'approve', contracts.CommonMinter.options.address, '100000000000000000000');
            await expectThrow(tx({from: creator1, gas: 3000000}, contracts.CommonMinter, 'mintMultipleFor', creator1, 0, ipfsHashString, [20, 51, 28, 1, 1], creator1, emptyBytes));
        });
    });

    // TODO
    // test rarity
    // test data ?
    // test ownership
    // test balannce
    // test metatx
    // test events
});
