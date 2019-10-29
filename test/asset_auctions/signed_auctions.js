const BN = require('bn.js');
const crypto = require('crypto');
const tap = require('tap');
const assert = require('assert');
const ethSigUtil = require('eth-sig-util');
const ethUtil = require('ethereumjs-util');
const rocketh = require('rocketh');
const accounts = rocketh.accounts;

const {
    getEventsFromReceipt,
    tx,
    call,
    gas,
    expectThrow,
    toChecksumAddress,
    toHex,
    padLeft,
    toWei,
    getBalance,
    sendTransaction,
    sendSignedTransaction,
    encodeCall,
    emptyBytes,
    deployContract,
    ethSign,
    soliditySha3,
} = require('../utils');

const {
    TransferBatchEvent,
} = require('../erc1155');

const {
    TransferEvent
} = require('../erc20');

const {
    OfferCancelledEvent,
    OfferClaimedEvent,
    mintAndReturnTokenId,
} = require('../asset-utils');

const {
    executeMetaTx,
} = require('../sand-utils');

const {
    deployer,
    sandBeneficiary,
    assetAuctionAdmin,
    assetAuctionTaxCollector,
    others
} = rocketh.namedAccounts;

const creator = others[0];
const user1 = others[1];
const user2 = others[2];

const ipfsHashString = '0x78b9f42c22c3c8b260b781578da3151e8200c741c6b7437bafaff5a9df9b403e';

function runSignedAuctionsTests(title, resetContracts) {
    tap.test(title + ' signed auctions', async (t) => {
        // t.runOnly = true;
        const privateKey = ethUtil.sha3('cow');
        const testAddress = toChecksumAddress(ethUtil.privateToAddress(privateKey).toString('hex'));

        let contracts;
        const domainType = [
            {name: 'name', type: 'string'},
            {name: 'version', type: 'string'},
            {name: 'verifyingContract', type: 'address'}
        ];
        const auctionType = [
            {name: 'from', type: 'address'},
            {name: 'token', type: 'address'},
            {name: 'offerId', type: 'uint256'},
            {name: 'startingPrice', type: 'uint256'},
            {name: 'endingPrice', type: 'uint256'},
            {name: 'startedAt', type: 'uint256'},
            {name: 'duration', type: 'uint256'},
            {name: 'packs', type: 'uint256'},
            {name: 'ids', type: 'bytes'},
            {name: 'amounts', type: 'bytes'},
        ];

        let ids;
        let offerId;
        let startedAt;
        let duration;
        let packs;
        let amounts;
        let buyAmount;
        let token;
        let from = testAddress;
        const startingPrice = toWei('0.25', 'ether');
        const endingPrice = toWei('0.50', 'ether');

        function getDomainData() {
            return {
                name: 'The Sandbox 3D',
                version: '1',
                verifyingContract: contracts.AssetSignedAuction.options.address
            };
        }

        function getConcatIdsAndAmounts() {
            let idsConcat = '0x';
            let amountsConcat = '0x';
            // conver to hex, add padding left, remove 0x
            for (let i = 0; i < ids.length; i++) {
                idsConcat += padLeft(toHex(ids[i]), 64).substring(2);
                amountsConcat += padLeft(toHex(amounts[i]), 64).substring(2);
            }
            return {
                ids: idsConcat,
                amounts: amountsConcat
            };
        }

        function getAuctionData() {
            const concats = getConcatIdsAndAmounts();
            return {
                from,
                token,
                offerId,
                startingPrice,
                endingPrice,
                startedAt,
                duration,
                packs,
                ids: concats.ids,
                amounts: concats.amounts
            };
        }

        function getSignature() {
            return ethSigUtil.signTypedData(privateKey, {
                data: {
                    types: {
                        EIP712Domain: domainType,
                        Auction: auctionType
                    },
                    domain: getDomainData(),
                    primaryType: 'Auction',
                    message: getAuctionData()
                }
            });
        }

        function getBasicSignature() {
            const auctionData = getAuctionData();
            const typeHash = soliditySha3({type: 'string', value: 'Auction(address from,address token,uint256 offerId,uint256 startingPrice,uint256 endingPrice,uint256 startedAt,uint256 duration,uint256 packs,bytes ids,bytes amounts)'});
            const hash = soliditySha3(
                {type: 'address', value: contracts.AssetSignedAuction.options.address},
                {type: 'bytes32', value: typeHash},
                {type: 'address', value: auctionData.from},
                {type: 'address', value: auctionData.token},
                {type: 'uint256', value: auctionData.offerId},
                {type: 'uint256', value: auctionData.startingPrice},
                {type: 'uint256', value: auctionData.endingPrice},
                {type: 'uint256', value: auctionData.startedAt},
                {type: 'uint256', value: auctionData.duration},
                {type: 'uint256', value: auctionData.packs},
                {type: 'bytes32', value: soliditySha3({type: 'bytes', value: auctionData.ids})},
                {type: 'bytes32', value: soliditySha3({type: 'bytes', value: auctionData.amounts})},
            );
            return ethSign(hash, from);
        }

        function giveSand(to, amount) {
            return tx(contracts.Sand, 'transfer', {from: sandBeneficiary, gas}, to, amount);
        }

        function claimSellerOfferUsingBasicSig(options, ...args) {
            return tx(contracts.AssetSignedAuction, 'claimSellerOfferUsingBasicSig', options, ...args);
        }

        function claimSellerOffer(options, ...args) {
            return tx(contracts.AssetSignedAuction, 'claimSellerOffer', options, ...args);
        }

        function assetBalanceOf(...args) {
            return call(contracts.Asset, 'balanceOf', {gas}, ...args);
        }

        function sandBalanceOf(...args) {
            return call(contracts.Sand, 'balanceOf', {gas}, ...args);
        }

        t.beforeEach(async () => {
            contracts = await resetContracts();

            duration = 1000;
            packs = 1;
            amounts = [1, 2];
            buyAmount = 1;
            token = '0x0000000000000000000000000000000000000000';
            from = testAddress;
            ids = [
                await mintAndReturnTokenId(contracts.AssetBouncer, ipfsHashString, 100, creator, 1),
                await mintAndReturnTokenId(contracts.AssetBouncer, ipfsHashString, 200, creator, 2)
            ];
            offerId = new BN(crypto.randomBytes(32), 16).toString(10);
            startedAt = Math.floor(Date.now() / 1000);
            await tx(contracts.Asset, 'safeBatchTransferFrom', {from: creator, gas}, creator, testAddress, ids, [100, 200], emptyBytes);
        });

        t.test('should be able to claim seller offer in ETH', async () => {
            const auctionData = [offerId, startingPrice, endingPrice, startedAt, duration, packs];
            const signature = await getSignature();

            const receipt = await claimSellerOffer({from: user1, value: endingPrice, gas},
                user1, testAddress, token, [buyAmount, buyAmount * endingPrice], auctionData, ids, amounts, signature);

            assert.equal((await getEventsFromReceipt(contracts.AssetSignedAuction, OfferClaimedEvent, receipt)).length, 1);
            const transferReceipts = await getEventsFromReceipt(contracts.Asset, TransferBatchEvent, receipt);
            assert.equal(transferReceipts.length, 1);
            assert.equal(transferReceipts[0].returnValues.ids.length, 2);
        });

        t.test('should be able to claim seller offer in SAND', async () => {
            token = contracts.Sand.options.address;
            const auctionData = [offerId, startingPrice, endingPrice, startedAt, duration, packs];

            await giveSand(user1, endingPrice);

            const signature = await getSignature();

            const receipt = await claimSellerOffer({from: user1, value: 0, gas},
                user1, testAddress, token, [buyAmount, buyAmount * endingPrice], auctionData, ids, amounts, signature);

            assert.equal((await getEventsFromReceipt(contracts.Sand, TransferEvent, receipt)).length, 1);
            assert.equal((await getEventsFromReceipt(contracts.AssetSignedAuction, OfferClaimedEvent, receipt)).length, 1);
            const transferReceipts = await getEventsFromReceipt(contracts.Asset, TransferBatchEvent, receipt);
            assert.equal(transferReceipts.length, 1);
            assert.equal(transferReceipts[0].returnValues.ids.length, 2);
        });

        t.test('should be able to claim seller offer in SAND via basic sig', async () => {
            token = contracts.Sand.options.address;
            const auctionData = [offerId, startingPrice, endingPrice, startedAt, duration, packs];

            await giveSand(user1, endingPrice);
            from = user2;
            ids = [
                await mintAndReturnTokenId(contracts.AssetBouncer, ipfsHashString, 100, creator, 3),
                await mintAndReturnTokenId(contracts.AssetBouncer, ipfsHashString, 200, creator, 4)
            ];
            await tx(contracts.Asset, 'safeBatchTransferFrom', {from: creator, gas}, creator, user2, ids, [100, 200], emptyBytes);

            const signature = await getBasicSignature();

            const receipt = await claimSellerOfferUsingBasicSig({from: user1, value: 0, gas},
                user1, user2, token, [buyAmount, buyAmount * endingPrice], auctionData, ids, amounts, signature);

            assert.equal((await getEventsFromReceipt(contracts.Sand, TransferEvent, receipt)).length, 1);
            assert.equal((await getEventsFromReceipt(contracts.AssetSignedAuction, OfferClaimedEvent, receipt)).length, 1);
            const transferReceipts = await getEventsFromReceipt(contracts.Asset, TransferBatchEvent, receipt);
            assert.equal(transferReceipts.length, 1);
            assert.equal(transferReceipts[0].returnValues.ids.length, 2);
        });

        t.test('should own the amount of tokens bought', async () => {
            const auctionData = [offerId, startingPrice, endingPrice, startedAt, duration, packs];
            const signature = await getSignature();

            await claimSellerOffer({from: user1, value: endingPrice, gas},
                user1, testAddress, token, [buyAmount, buyAmount * endingPrice], auctionData, ids, amounts, signature);

            for (let i = 0; i < ids.length; i++) {
                const tokenBalance = await assetBalanceOf(user1, ids[i]);
                assert.equal(tokenBalance, buyAmount * amounts[i]);
            }
        });

        t.test('should seller have correct ETH balance', async () => {
            packs = 100;
            buyAmount = 5;
            const auctionData = [offerId, startingPrice, endingPrice, startedAt, duration, packs];

            const balanceBefore = await getBalance(testAddress);
            const signature = await getSignature();

            await claimSellerOffer({from: user1, value: endingPrice * buyAmount, gas},
                user1, testAddress, token, [buyAmount, endingPrice * buyAmount], auctionData, ids, amounts, signature);

            const balanceAfter = await getBalance(testAddress);
            const balance = new BN(balanceAfter).sub(new BN(balanceBefore));
            const packValueMin = new BN(startingPrice).mul(new BN(buyAmount));
            const packValueMax = new BN(endingPrice).mul(new BN(buyAmount));
            assert(balance.gte(packValueMin));
            assert(balance.lte(packValueMax));
        });

        t.test('should seller have correct SAND balance', async () => {
            packs = 100;
            buyAmount = 5;
            token = contracts.Sand.options.address;
            const auctionData = [offerId, startingPrice, endingPrice, startedAt, duration, packs];

            await giveSand(user1, endingPrice * buyAmount);

            const balanceBefore = await sandBalanceOf(testAddress);
            const signature = await getSignature();

            await claimSellerOffer({from: user1, value: 0, gas},
                user1, testAddress, token, [buyAmount, endingPrice * buyAmount], auctionData, ids, amounts, signature);

            const balanceAfter = await sandBalanceOf(testAddress);
            const balance = new BN(balanceAfter).sub(new BN(balanceBefore));
            const packValueMin = new BN(startingPrice).mul(new BN(buyAmount));
            const packValueMax = new BN(endingPrice).mul(new BN(buyAmount));
            assert(balance.gte(packValueMin));
            assert(balance.lte(packValueMax));
        });

        t.test('should be able to cancel offer', async () => {
            const receipt = await tx(contracts.AssetSignedAuction, 'cancelSellerOffer', {from: creator, gas}, offerId);
            assert.equal((await getEventsFromReceipt(contracts.AssetSignedAuction, OfferCancelledEvent, receipt)).length, 1);
        });

        t.test('should NOT be able to claim more offers than what it was signed', async () => {
            buyAmount = 2;
            const auctionData = [offerId, startingPrice, endingPrice, startedAt, duration, packs];
            const signature = await getSignature();
            await expectThrow(claimSellerOffer({from: user1, value: buyAmount * endingPrice, gas},
                user1, testAddress, token, [buyAmount, buyAmount * endingPrice], auctionData, ids, amounts, signature));
            // .then(() => assert(false, 'was able to claim offer'))
            // .catch((err) => assert(err.toString().includes('Buy amount exceeds sell amount'), 'Error message does not match. ' + err.toString()));
        });

        t.test('should NOT be able to claim cancelled offer', async () => {
            // add balance to testAddress
            await sendTransaction({from: accounts[0], to: testAddress, value: toWei('1', 'ether'), gas});
            // cancel offer through signed transaction
            await sendSignedTransaction(encodeCall(contracts.AssetSignedAuction, 'cancelSellerOffer', offerId), contracts.AssetSignedAuction.options.address, privateKey);

            const auctionData = [offerId, startingPrice, endingPrice, startedAt, duration, packs];
            const signature = await getSignature();

            await expectThrow(
                claimSellerOffer({from: user1, value: buyAmount * endingPrice, gas},
                    user1, testAddress, token, [buyAmount, buyAmount * endingPrice], auctionData, ids, amounts, signature)
            );
            // .then(() => assert(false, 'was able to claim offer'))
            // .catch((err) => assert(err.toString().includes('Auction cancelled'), 'Error message does not match. ' + err.toString()));
        });

        t.test('should NOT be able to claim offer without sending ETH', async () => {
            const auctionData = [offerId, startingPrice, endingPrice, startedAt, duration, packs];
            const signature = await getSignature();
            await expectThrow(
                claimSellerOffer({from: user1, value: 0, gas},
                    user1, testAddress, token, [buyAmount, buyAmount * endingPrice], auctionData, ids, amounts, signature)
            );
        });

        t.test('should NOT be able to claim offer without enough SAND', async () => {
            token = contracts.Sand.options.address;
            const auctionData = [offerId, startingPrice, endingPrice, startedAt, duration, packs];

            const signature = await getSignature();
            await expectThrow(
                claimSellerOffer({from: user1, gas},
                    user1, testAddress, token, [buyAmount, buyAmount * endingPrice], auctionData, ids, amounts, signature)
            );
        });

        t.test('should NOT be able to claim offer without enough SAND when tax', async () => {
            await tx(contracts.AssetSignedAuction, 'setTax', {from: assetAuctionAdmin, gas}, assetAuctionTaxCollector, 5000);
            token = contracts.Sand.options.address;
            const auctionData = [offerId, startingPrice, endingPrice, startedAt, duration, packs];

            const signature = await getSignature();
            await expectThrow(
                claimSellerOffer({from: user1, gas},
                    user1, testAddress, token, [buyAmount, buyAmount * endingPrice], auctionData, ids, amounts, signature)
            );
        });

        t.test('should NOT be able to claim offer if signature mismatches', async () => {
            const auctionData = [offerId, startingPrice, endingPrice, startedAt, duration, packs];
            const signature = await getSignature();
            auctionData[0] = '12398764192673412346';
            await expectThrow(
                claimSellerOffer({from: user1, gas},
                    user1, testAddress, token, [buyAmount, buyAmount * endingPrice], auctionData, ids, amounts, signature)
            );
            // .then(() => assert(false, 'was able to claim offer'))
            // .catch((err) => assert(err.toString().includes('Signature mismatches'), 'Error message does not match. ' + err.toString()));
        });

        t.test('should NOT be able to claim offer if it did not start yet', async () => {
            startedAt = Math.floor(Date.now() / 1000) + 1000;
            const auctionData = [offerId, startingPrice, endingPrice, startedAt, duration, packs];
            const signature = await getSignature();
            await expectThrow(
                claimSellerOffer({from: user1, gas},
                    user1, testAddress, token, [buyAmount, buyAmount * endingPrice], auctionData, ids, amounts, signature)
            );
            // .then(() => assert(false, 'was able to claim offer'))
            // .catch((err) => assert(err.toString().includes('Auction didn\'t start yet'), 'Error message does not match. ' + err.toString()));
        });

        t.test('should NOT be able to claim offer if it already ended', async () => {
            startedAt = Math.floor(Date.now() / 1000) - 10000;
            const auctionData = [offerId, startingPrice, endingPrice, startedAt, duration, packs];
            const signature = await getSignature();
            await expectThrow(
                claimSellerOffer({from: user1, gas},
                    user1, testAddress, token, [buyAmount, buyAmount * endingPrice], auctionData, ids, amounts, signature)
            );
            // .then(() => assert(false, 'was able to claim offer'))
            // .catch((err) => assert(err.toString().includes('Auction finished'), 'Error message does not match. ' + err.toString()));
        });

        t.test('smart contract wallet', async (t) => {
            const signingAccount = {
                address: '0xFA8A6079E7B85d1be95B6f6DE1aAE903b6F40c00',
                privateKey: '0xeee5270a5c46e5b92510d70fa4d445a8cdd5010dde5b1fccc6a2bd1a9df8f5c0'
            };

            t.test('claim offer in SAND success', async () => {
                const IdentityContract = await deployContract(deployer, 'ERC1271WalletWithERC1155Receiver', signingAccount.address);
                const identityAddress = IdentityContract.options.address;

                duration = 1000;
                packs = 1;
                amounts = [1, 2];
                buyAmount = 1;
                token = '0x0000000000000000000000000000000000000000';
                ids = [
                    await mintAndReturnTokenId(contracts.AssetBouncer, ipfsHashString, 100, creator, 3),
                    await mintAndReturnTokenId(contracts.AssetBouncer, ipfsHashString, 200, creator, 4)
                ];
                offerId = new BN(crypto.randomBytes(32), 16).toString(10);
                startedAt = Math.floor(Date.now() / 1000);

                await tx(contracts.Asset, 'safeBatchTransferFrom', {from: creator, gas}, creator, identityAddress, ids, [100, 200], emptyBytes);

                await tx(contracts.Sand, 'transfer', {from: sandBeneficiary, gas: 500000}, user1, '100000000000000000000');
                token = contracts.Sand.options.address;
                from = identityAddress;
                const auctionData = [offerId, startingPrice, endingPrice, startedAt, duration, packs];
                const signature = await ethSigUtil.signTypedData(ethUtil.toBuffer(signingAccount.privateKey), {
                    data: {
                        types: {
                            EIP712Domain: domainType,
                            Auction: auctionType
                        },
                        domain: getDomainData(),
                        primaryType: 'Auction',
                        message: getAuctionData()
                    }
                });
                const receipt = await tx(contracts.AssetSignedAuction, 'claimSellerOfferViaEIP1271', {from: user1, value: 0, gas},
                    user1, identityAddress, token, [buyAmount, buyAmount * endingPrice], auctionData, ids, amounts, signature);

                assert.equal((await getEventsFromReceipt(contracts.Sand, TransferEvent, receipt)).length, 1);
                assert.equal((await getEventsFromReceipt(contracts.AssetSignedAuction, OfferClaimedEvent, receipt)).length, 1);
                const transferReceipts = await getEventsFromReceipt(contracts.Asset, TransferBatchEvent, receipt);
                assert.equal(transferReceipts.length, 1);
                assert.equal(transferReceipts[0].returnValues.ids.length, 2);
            });
        });

        t.test('meta tx', async (t) => {
            const signingAccount = {
                address: '0xFA8A6079E7B85d1be95B6f6DE1aAE903b6F40c00',
                privateKey: '0xeee5270a5c46e5b92510d70fa4d445a8cdd5010dde5b1fccc6a2bd1a9df8f5c0'
            };
            // const otherSigner = {
            //     address: '0x75aE6abE03070a906d7a9d5C1607605DE73a0880',
            //     privateKey: '0x3c42a6c587e8a82474031cc06f1e6af7f5301bb2417b89d98eb3023d0ce659f6'
            // };
            const executor = deployer;

            t.test('claim offer in SAND success', async () => {
                await tx(contracts.Sand, 'transfer', {from: sandBeneficiary, gas: 500000}, signingAccount.address, '100000000000000000000');
                token = contracts.Sand.options.address;
                const auctionData = [offerId, startingPrice, endingPrice, startedAt, duration, packs];
                const signature = await getSignature();

                const receipt = await executeMetaTx(signingAccount,
                    contracts.NativeMetaTransactionProcessor,
                    {from: executor, gas: 1000000, gasPrice: 1},
                    {nonce: 1, minGasPrice: 1, txGas: 2000000, baseGas: 112000, tokenGasPrice: 0, relayer: executor, tokenDeposit: executor},
                    contracts.AssetSignedAuction,
                    '100000000000000000000',
                    'claimSellerOffer', signingAccount.address, testAddress, token, [buyAmount, buyAmount * endingPrice], auctionData, ids, amounts, signature);

                assert.equal((await getEventsFromReceipt(contracts.Sand, TransferEvent, receipt)).length, 1);
                assert.equal((await getEventsFromReceipt(contracts.AssetSignedAuction, OfferClaimedEvent, receipt)).length, 1);
                const transferReceipts = await getEventsFromReceipt(contracts.Asset, TransferBatchEvent, receipt);
                assert.equal(transferReceipts.length, 1);
                assert.equal(transferReceipts[0].returnValues.ids.length, 2);
            });

            t.test('claim offer in SAND fails from different sender', async () => {
                await tx(contracts.Sand, 'transfer', {from: sandBeneficiary, gas: 500000}, signingAccount.address, '100000000000000000000');
                token = contracts.Sand.options.address;
                const auctionData = [offerId, startingPrice, endingPrice, startedAt, duration, packs];
                const signature = await getSignature();

                await expectThrow(executeMetaTx(signingAccount,
                    contracts.NativeMetaTransactionProcessor,
                    {from: executor, gas: 1000000, gasPrice: 1},
                    {nonce: 1, minGasPrice: 1, txGas: 2000000, baseGas: 112000, tokenGasPrice: 0, relayer: executor, tokenDeposit: executor},
                    contracts.AssetSignedAuction,
                    '100000000000000000000',
                    'claimSellerOffer', user1, testAddress, token, [buyAmount, buyAmount * endingPrice], auctionData, ids, amounts, signature));
            });
        });
    });
}

module.exports = {
    runSignedAuctionsTests
};
