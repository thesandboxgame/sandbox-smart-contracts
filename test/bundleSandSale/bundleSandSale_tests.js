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
    getBalance,
    getEventsFromReceipt,
    expectRevert,
    zeroAddress,
} = require('../utils');

const {
    getERC20Balance,
} = require('../erc20.js');

const {
    mintTokensWithSameURIAndSupply,
} = require('../asset-utils');

const {
    bundleSandSaleBeneficiary,
    others,
    deployer,
    sandBeneficiary,
    bundleSandSaleAdmin,
} = rocketh.namedAccounts;

const daiHolder = deployer;

const creator = others[1];
const randomUser = others[2];

const ipfsHashString = '0x78b9f42c22c3c8b260b781578da3151e8200c741c6b7437bafaff5a9df9b403e';
const secondIpfsHashString = '0x21c8f42c22c3c8b260b781578da3151e8200c741c6b7437bafaff5a9403edf9b';
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

        t.test('-> Not setting up a bundle', async (t) => {
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

                await expectRevert(
                    tx(
                        contracts.Asset,
                        'safeTransferFrom',
                        {from: creator, gas},
                        creator,
                        contracts.BundleSandSale.options.address,
                        tokenIds[0],
                        0,
                        data
                    ),
                    'no Asset transfered'
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

                await expectRevert(
                    tx(
                        contracts.Asset,
                        'safeTransferFrom',
                        {from: creator, gas},
                        creator,
                        contracts.BundleSandSale.options.address,
                        tokenIds[0],
                        4,
                        data
                    ),
                    'invalid amounts, not divisible by numPacks'
                );
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

                await expectRevert(
                    tx(
                        contracts.Asset,
                        'safeTransferFrom',
                        {from: creator, gas},
                        creator,
                        contracts.BundleSandSale.options.address,
                        tokenIds[0],
                        1,
                        emptyBytes,
                    ),
                    'data need to contains the sale data'
                );
            });
        });

        t.test('-> Setting up a bundle', async (t) => {
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

                const receipt = await tx(contracts.Asset, 'safeTransferFrom', {from: creator, gas}, creator, contracts.BundleSandSale.options.address, tokenIds[0], numPacks, data);

                const events = await contracts.BundleSandSale.getPastEvents(
                    'BundleSale', {
                        fromBlock: receipt.blockNumber,
                        toBlock: receipt.blockNumber,
                    },
                );

                const event = events[0].returnValues;

                assert.equal(event.sandAmount, sandAmountPerPack.toString(), 'Sand amount per pack is wrong');
                assert.equal(event.numPacks, numPacks, 'Num packs is wrong');
                assert.equal(event.priceUSD, priceUSDPerPack.toString(), 'Price USD per pack');

                assert.equal(event.ids[0], tokenIds[0], 'Wrong token id');
                assert.equal(event.amounts[0], '1', 'Wrong amounts');

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
        });

        t.test('-> Buying ETH', async (t) => {
            t.test('Should buy a bundle with ETH', async () => {
                const priceUSDPerPack = toWei('10');
                const numPacks = 2;
                const sandAmountPerPack = toWei('10');

                const ids = await mintTokensWithSameURIAndSupply(
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

                await tx(contracts.Asset, 'safeTransferFrom', {from: creator, gas}, creator, contracts.BundleSandSale.options.address, ids[0], numPacks, data);
                // console.log('tx success');
                const ethPrice = await call(
                    contracts.BundleSandSale,
                    'getEtherAmountWithUSD',
                    {from: randomUser},
                    priceUSDPerPack,
                );
                // console.log('ethPrice call');

                const oldEthBalance = await getBalance(bundleSandSaleBeneficiary);
                // console.log('oldEthBalance call');

                const receipt = await tx(contracts.BundleSandSale, 'buyBundleWithEther', {from: randomUser, gas, value: ethPrice}, 0, 1, randomUser);
                // console.log('buyBundleWithEther call');

                const events = await contracts.BundleSandSale.getPastEvents(
                    'BundleSold', {
                        fromBlock: receipt.blockNumber,
                        toBlock: receipt.blockNumber,
                    },
                );

                const event = events[0].returnValues;

                const newEthBalance = await getBalance(bundleSandSaleBeneficiary);

                const expectedBalance = new BN(oldEthBalance).add(new BN(ethPrice));

                assert.equal(expectedBalance.toString(), newEthBalance.toString(), 'Contract ETH balance is wrong');

                const sandBalance = await getERC20Balance(contracts.Sand, randomUser);
                assert.equal(sandBalance.toString(), sandAmountPerPack.toString(), 'Sand balance is wrong');

                // const assetBalance = await call(contracts.Asset, 'balanceOf', {from: randomUser}, creator, ids[0]);
                // assert.equal(assetBalance, 1, 'User asset balance is wrong');

                const balance = await call(contracts.Asset, 'balanceOf', {from: randomUser}, randomUser, ids[0]);
                assert.equal(balance, 1, 'balance 1');

                const saleInfo = await call(contracts.BundleSandSale, 'getSaleInfo', {}, 0);
                assert.equal(saleInfo.numPacksLeft, numPacks - 1, 'numPacksLeft is wrong');

                assert.equal(event.buyer, randomUser, 'Buyer address is wrong');
                assert.equal(event.numPacks, '1', 'Num packs is wrong');
                assert.equal(event.numPacks, '1', 'Num packs is wrong');
                assert.equal(event.token, zeroAddress, 'Token address is wrong');
                assert.equal(event.tokenAmount, ethPrice.toString(), 'Price is wrong');
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
        });

        t.test('-> Buying with DAI', async (t) => {
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

                await tx(contracts.FakeDai, 'transfer', {from: daiHolder, gas}, randomUser, priceUSDPerPack.toString());
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

                await tx(contracts.FakeDai, 'transfer', {from: daiHolder, gas}, randomUser, price.toString());
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
        });

        t.test('-> Not buying', async (t) => {
            t.test('Should not buy a bundle without enough ETH', async () => {
                const priceUSDPerPack = toWei('10');
                const numPacks = 2;
                const sandAmountPerPack = toWei('10');

                await mintAndSetupBundle(
                    contracts,
                    numPacks,
                    priceUSDPerPack,
                    sandAmountPerPack,
                );

                await expectRevert(
                    tx(contracts.BundleSandSale, 'buyBundleWithEther', {from: randomUser, gas, value: '0'}, 0, 2, randomUser),
                    'not enough ether sent'
                );
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

                await expectRevert(
                    tx(contracts.BundleSandSale, 'buyBundleWithEther', {from: randomUser, gas, value: ethPrice}, 0, 2, randomUser),
                    'not enough ether sent'
                );
            });

            t.test('Should not buy a bundle without enough DAI', async () => {
                const priceUSDPerPack = toWei('10');
                const numPacks = 2;
                const sandAmountPerPack = toWei('10');

                const balance = await getERC20Balance(contracts.FakeDai, randomUser);
                await tx(contracts.FakeDai, 'transfer', {from: randomUser, gas}, contracts.FakeDai.options.address, balance);

                await mintAndSetupBundle(
                    contracts,
                    numPacks,
                    priceUSDPerPack,
                    sandAmountPerPack,
                );

                await expectRevert(
                    tx(contracts.BundleSandSale, 'buyBundleWithDai', {from: randomUser, gas}, 0, 1, randomUser),
                    'failed to transfer dai'
                );
            });

            t.test('Should not buy a bundle with ETH if out of stock', async () => {
                const priceUSDPerPack = toWei('10');
                const numPacks = 1;
                const sandAmountPerPack = toWei('10');

                const ids = await mintTokensWithSameURIAndSupply(
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

                await tx(contracts.Asset, 'safeTransferFrom', {from: creator, gas}, creator, contracts.BundleSandSale.options.address, ids[0], numPacks, data);

                const ethPrice = await call(
                    contracts.BundleSandSale,
                    'getEtherAmountWithUSD',
                    {from: randomUser},
                    priceUSDPerPack,
                );

                await tx(contracts.BundleSandSale, 'buyBundleWithEther', {from: randomUser, gas, value: ethPrice}, 0, 1, randomUser);

                await expectRevert(
                    tx(contracts.BundleSandSale, 'buyBundleWithEther', {from: randomUser, gas, value: ethPrice}, 0, 1, randomUser),
                    'not enough packs on sale'
                );
            });

            t.test('Should not buy a bundle with DAI if out of stock', async () => {
                const priceUSDPerPack = toWei('10');
                const numPacks = 1;
                const sandAmountPerPack = toWei('10');

                await mintAndSetupBundle(
                    contracts,
                    numPacks,
                    priceUSDPerPack,
                    sandAmountPerPack,
                );

                await tx(contracts.FakeDai, 'transfer', {from: daiHolder, gas}, randomUser, priceUSDPerPack.toString());
                await tx(contracts.FakeDai, 'approve', {from: randomUser, gas}, contracts.BundleSandSale.options.address, priceUSDPerPack.toString());

                await tx(contracts.BundleSandSale, 'buyBundleWithDai', {from: randomUser, gas}, 0, 1, randomUser);

                await expectRevert(
                    tx(contracts.BundleSandSale, 'buyBundleWithDai', {from: randomUser, gas}, 0, 1, randomUser),
                    'not enough packs on sale'
                );
            });
        });

        t.test('-> Admin features', async (t) => {
            t.test('Should withdraw the sale from the contract', async () => {
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
                assert.equal(saleInfo.numPacksLeft, 2, 'numPacksLeft is wrong');

                await tx(contracts.BundleSandSale, 'withdrawSale', {from: bundleSandSaleAdmin, gas}, 0, creator);

                const newSaleInfo = await call(contracts.BundleSandSale, 'getSaleInfo', {}, 0);
                assert.equal(newSaleInfo.numPacksLeft, 0, 'numPacksLeft is wrong');
            });

            t.test('Should NOT withdraw the sale from the contract', async () => {
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
                assert.equal(saleInfo.numPacksLeft, 2, 'numPacksLeft is wrong');

                await expectRevert(
                    tx(contracts.BundleSandSale, 'withdrawSale', {from: creator, gas}, 0, randomUser),
                    'only admin allowed'
                );

                const newSaleInfo = await call(contracts.BundleSandSale, 'getSaleInfo', {}, 0);
                assert.equal(newSaleInfo.numPacksLeft, 2, 'numPacksLeft is wrong');
            });

            t.test('Should change the beneficiary wallet', async () => {
                await tx(contracts.BundleSandSale, 'setReceivingWallet', {from: bundleSandSaleAdmin, gas}, randomUser);
            });

            t.test('Should not let anyone change the beneficiary wallet', async () => {
                await expectRevert(
                    tx(contracts.BundleSandSale, 'setReceivingWallet', {from: randomUser, gas}, randomUser),
                    'only admin can change the receiving wallet'
                );
            });

            t.test('Should not let a wrong address be the beneficiary wallet', async () => {
                await expectRevert(
                    tx(contracts.BundleSandSale, 'setReceivingWallet', {from: bundleSandSaleAdmin, gas}, zeroAddress),
                    'receiving wallet cannot be zero address'
                );
            });
        });
    });
}

module.exports = {
    runBundleSandSaleTests
};
