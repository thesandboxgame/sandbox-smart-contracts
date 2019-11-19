const tap = require('tap');
const assert = require('assert');
const rocketh = require('rocketh');
const BN = require('bn.js');

const {
    tx,
    call,
    gas,
    emptyBytes,
    toWei,
    encodeParameters,
    expectThrow,
    getBalance,
    getEventsFromReceipt,
} = require('../utils');

const {
    getERC20Balance,
} = require('../erc20.js');

const {
    generateTokenId,
    mintTokensWithSameURIAndSupply,
} = require('../asset-utils');

const {
    bundleSandSaleBeneficiary,
    others,
    sandBeneficiary,
} = rocketh.namedAccounts;

const creator = others[1];
const randomUser = others[2];

const ipfsHashString = '0x78b9f42c22c3c8b260b781578da3151e8200c741c6b7437bafaff5a9df9b403e';
const fixedId = 1006;

async function mintAndSetupBundle(
    contracts,
    numPacks,
    priceUSDPerPack,
    sandAmountPerPack,
) {
    const tokenIds = await mintTokensWithSameURIAndSupply(
        contracts.AssetBouncer,
        1,
        ipfsHashString,
        numPacks,
        creator,
        fixedId,
    );

    const data = encodeParameters([
        'uint256',
        'uint256',
        'uint256',
    ], [
        numPacks,
        sandAmountPerPack,
        priceUSDPerPack,
    ]);

    return tx(
        contracts.Asset,
        'safeTransferFrom',
        {from: creator, gas},
        creator,
        contracts.BundleSandSale.options.address,
        tokenIds[0],
        numPacks,
        data
    );
}

function runBundleSandSaleTests(title, contractStore) {
    tap.test(title + ' specific tests', async (t) => {
        let contracts;

        t.beforeEach(async () => {
            contracts = await contractStore.resetContracts();

            await tx(contracts.Sand, 'transfer', {from: sandBeneficiary, gas}, creator, toWei('1000000'));
            await tx(contracts.Sand, 'approve', {from: creator, gas}, contracts.BundleSandSale.options.address, toWei('1000000'));
        });

        t.test('Should not setup a bundle without enough assets in the transfer', async () => {
            const priceUSDPerPack = toWei('10');
            const numPacks = 2;
            const sandAmountPerPack = toWei('10');

            const tokenIds = await mintTokensWithSameURIAndSupply(
                contracts.AssetBouncer,
                1,
                ipfsHashString,
                1,
                creator,
                fixedId,
            );

            const data = encodeParameters([
                'uint256',
                'uint256',
                'uint256',
            ], [
                numPacks,
                sandAmountPerPack,
                priceUSDPerPack,
            ]);

            await expectThrow(
                tx(
                    contracts.Asset,
                    'safeTransferFrom',
                    {from: creator, gas},
                    creator,
                    contracts.BundleSandSale.options.address,
                    tokenIds[0],
                    numPacks,
                    data
                )
            );
        });

        t.test('Should not setup a bundle without SAND', async () => {
            await tx(contracts.Sand, 'transfer', {from: creator, gas}, randomUser, toWei('1000000'));

            await expectThrow(
                mintAndSetupBundle(contracts, 1, toWei('10'), toWei('10'))
            );
        });

        t.test('Should not create a bundle with invalid amounts', async () => {
            const priceUSDPerPack = toWei('10');
            const numPacks = 3;
            const sandAmountPerPack = toWei('10');

            const tokenIds = await mintTokensWithSameURIAndSupply(
                contracts.AssetBouncer,
                1,
                ipfsHashString,
                4,
                creator,
                fixedId,
            );

            const data = encodeParameters([
                'uint256',
                'uint256',
                'uint256',
            ], [
                numPacks,
                sandAmountPerPack,
                priceUSDPerPack,
            ]);

            await expectThrow(tx(
                contracts.Asset,
                'safeTransferFrom',
                {from: creator, gas},
                creator,
                contracts.BundleSandSale.options.address,
                tokenIds[0],
                4,
                data
            ));
        });

        t.test('Should not create a bundle with no sale data', async () => {
            const tokenIds = await mintTokensWithSameURIAndSupply(
                contracts.AssetBouncer,
                1,
                ipfsHashString,
                1,
                creator,
                fixedId,
            );

            await expectThrow(tx(
                contracts.Asset,
                'safeTransferFrom',
                {from: creator, gas},
                creator,
                contracts.BundleSandSale.options.address,
                tokenIds[0],
                1,
                emptyBytes,
            ));
        });

        t.test('Should setup a bundle', async () => {
            const priceUSDPerPack = toWei('10');
            const numPacks = 2;
            const sandAmountPerPack = toWei('10');

            const tokenIds = await mintTokensWithSameURIAndSupply(
                contracts.AssetBouncer,
                1,
                ipfsHashString,
                numPacks,
                creator,
                fixedId,
            );

            const data = encodeParameters([
                'uint256',
                'uint256',
                'uint256',
            ], [
                numPacks,
                sandAmountPerPack,
                priceUSDPerPack,
            ]);

            await tx(contracts.Asset, 'safeTransferFrom', {from: creator, gas}, creator, contracts.BundleSandSale.options.address, tokenIds[0], numPacks, data);

            const saleInfo = await call(contracts.BundleSandSale, 'getSaleInfo', {}, 0);
            assert.equal(saleInfo.priceUSD, priceUSDPerPack, 'USD price is wrong');
            assert.equal(saleInfo.numPacksLeft, numPacks, 'numPacksLeft is wrong');
        });

        t.test('Should get the info of a sale', async () => {
            const priceUSDPerPack = toWei('10');
            const numPacks = 2;
            const sandAmountPerPack = toWei('10');

            await mintAndSetupBundle(
                contracts,
                numPacks,
                priceUSDPerPack,
                sandAmountPerPack,
            );

            const saleInfo = await call(contracts.BundleSandSale, 'getSaleInfo', {}, 0);
            assert.equal(saleInfo.priceUSD, priceUSDPerPack, 'USD price is wrong');
            assert.equal(saleInfo.numPacksLeft, numPacks, 'numPacksLeft is wrong');
        });

        t.test('Should buy a bundle with ETH', async () => {
            const priceUSDPerPack = toWei('10');
            const numPacks = 2;
            const sandAmountPerPack = toWei('10');

            await mintAndSetupBundle(
                contracts,
                numPacks,
                priceUSDPerPack,
                sandAmountPerPack,
            );

            const ethPrice = await call(
                contracts.BundleSandSale,
                'getEtherAmountWithUSD',
                {from: randomUser},
                priceUSDPerPack,
            );

            const oldEthBalance = await getBalance(bundleSandSaleBeneficiary);

            await tx(contracts.BundleSandSale, 'buyBundleWithEther', {from: randomUser, gas, value: ethPrice}, 0, 1, randomUser);

            const newEthBalance = await getBalance(bundleSandSaleBeneficiary);

            const expectedBalance = new BN(oldEthBalance).add(new BN(ethPrice));

            assert.equal(expectedBalance.toString(), newEthBalance.toString(), 'Contract ETH balance is wrong');

            const sandBalance = await getERC20Balance(contracts.Sand, randomUser);
            assert.equal(sandBalance.toString(), sandAmountPerPack.toString(), 'Sand balance is wrong');

            /*
            const assetId = generateTokenId(creator, numPacks, numPacks, fixedId, 0);

            const assetBalance = await call(contracts.Asset, 'balanceOf', {from: randomUser}, creator, assetId);
            assert.equal(assetBalance, 1, 'User asset balance is wrong');
            const owner = await call(contracts.Asset, 'ownerOf', {from: randomUser}, assetId);
            assert.equal(owner, randomUser, 'Asset owner is wrong');
            */

            const saleInfo = await call(contracts.BundleSandSale, 'getSaleInfo', {}, 0);
            assert.equal(saleInfo.numPacksLeft, numPacks - 1, 'numPacksLeft is wrong');
        });

        t.test('Should buy several bundles at once with ETH', async () => {
            const priceUSDPerPack = toWei('10');
            const numPacks = 2;
            const sandAmountPerPack = toWei('10');

            await mintAndSetupBundle(
                contracts,
                numPacks,
                priceUSDPerPack,
                sandAmountPerPack,
            );

            const ethPrice = await call(contracts.BundleSandSale, 'getEtherAmountWithUSD', {from: randomUser}, priceUSDPerPack);
            const value = new BN(ethPrice).mul(new BN(2)).toString();

            await tx(contracts.BundleSandSale, 'buyBundleWithEther', {from: randomUser, gas, value}, 0, 2, randomUser);

            const sandBalance = await getERC20Balance(contracts.Sand, randomUser);
            const expectedSandBalance = new BN(sandAmountPerPack).mul(new BN(2));

            assert.equal(sandBalance.toString(), expectedSandBalance.toString(), 'Sand balance is wrong');

            const saleInfo = await call(contracts.BundleSandSale, 'getSaleInfo', {}, 0);
            assert.equal(saleInfo.numPacksLeft, 0, 'numPacksLeft is wrong');
        });

        t.test('Should not buy several bundles at once without enough ETH', async () => {
            const priceUSDPerPack = toWei('10');
            const numPacks = 2;
            const sandAmountPerPack = toWei('10');

            await mintAndSetupBundle(
                contracts,
                numPacks,
                priceUSDPerPack,
                sandAmountPerPack,
            );

            const ethPrice = await call(contracts.BundleSandSale, 'getEtherAmountWithUSD', {from: randomUser}, priceUSDPerPack);

            await expectThrow((contracts.BundleSandSale, 'buyBundleWithEther', {from: randomUser, gas, ethPrice}, 0, 2, randomUser));
        });

        t.test('Should buy a bundle with DAI', async () => {
            const priceUSDPerPack = toWei('10');
            const numPacks = 2;
            const sandAmountPerPack = toWei('10');

            await mintAndSetupBundle(
                contracts,
                numPacks,
                priceUSDPerPack,
                sandAmountPerPack,
            );

            await tx(contracts.FakeDai, 'transfer', {from: sandBeneficiary, gas}, randomUser, priceUSDPerPack.toString());
            await tx(contracts.FakeDai, 'approve', {from: randomUser, gas}, contracts.BundleSandSale.options.address, priceUSDPerPack.toString());

            const previousDaiBalance = await getERC20Balance(contracts.FakeDai, bundleSandSaleBeneficiary);
            await tx(contracts.BundleSandSale, 'buyBundleWithDai', {from: randomUser, gas}, 0, 1, randomUser);

            const sandBalance = await getERC20Balance(contracts.Sand, randomUser);
            assert.equal(sandBalance.toString(), sandAmountPerPack.toString(), 'User Sand balance is wrong');

            const newDaiBalance = await getERC20Balance(contracts.FakeDai, bundleSandSaleBeneficiary);
            const expectedDaiBalance = new BN(previousDaiBalance).add(new BN(priceUSDPerPack));

            assert.equal(expectedDaiBalance.toString(), newDaiBalance.toString(), 'Bundle sale beneficiary DAI balance is wrong');
        });

        t.test('Should buy several bundles at once with DAI', async () => {
            const priceUSDPerPack = toWei('10');
            const numPacks = 2;
            const sandAmountPerPack = toWei('10');

            await mintAndSetupBundle(
                contracts,
                numPacks,
                priceUSDPerPack,
                sandAmountPerPack,
            );

            const price = new BN(priceUSDPerPack).mul(new BN(2));

            await tx(contracts.FakeDai, 'transfer', {from: sandBeneficiary, gas}, randomUser, price.toString());
            await tx(contracts.FakeDai, 'approve', {from: randomUser, gas}, contracts.BundleSandSale.options.address, price.toString());

            const previousDaiBalance = await getERC20Balance(contracts.FakeDai, bundleSandSaleBeneficiary);
            await tx(contracts.BundleSandSale, 'buyBundleWithDai', {from: randomUser, gas}, 0, 2, randomUser);

            const sandBalance = await getERC20Balance(contracts.Sand, randomUser);
            const expectedSandBalance = new BN(sandAmountPerPack).mul(new BN(2));

            assert.equal(sandBalance.toString(), expectedSandBalance.toString(), 'User Sand balance is wrong');

            const newDaiBalance = await getERC20Balance(contracts.FakeDai, bundleSandSaleBeneficiary);
            const revenue = new BN(priceUSDPerPack).mul(new BN(2));
            const expectedDaiBalance = new BN(previousDaiBalance).add(new BN(revenue));

            assert.equal(expectedDaiBalance.toString(), newDaiBalance.toString(), 'Bundle sale beneficiary DAI balance is wrong');
        });

        /*
        t.test('Should not buy a bundle without enough ETH', async () => {

        });

        t.test('Should not buy a bundle without enough DAI', async () => {

        });

        t.test('Should not buy a bundle if out of stock', async () => {

        });

        t.test('Should not buy a bundle with ETH if out of stock', async () => {

        });

        t.test('Should not buy a bundle with DAI if out of stock', async () => {

        });

        t.test('Should withdraw the sale from the contract', async () => {

        });
        */
    });
}

module.exports = {
    runBundleSandSaleTests
};
