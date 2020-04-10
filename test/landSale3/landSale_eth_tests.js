const tap = require('tap');
const assert = require('assert');

const {deployments, namedAccounts} = require('@nomiclabs/buidler');

const ethers = require('ethers');
const {BigNumber} = ethers;
const {solidityPack, defaultAbiCoder} = ethers.utils;

const {
    tx,
    call,
    gas,
    expectRevert,
    zeroAddress,
    deployContract,
    increaseTime,
    getChainCurrentTime,
    getBalance,
} = require('../utils');

const {
    createReferral,
} = require('../../lib/referralValidator');

const {
    deployer,
    landSaleAdmin,
    landSaleBeneficiary,
    landAdmin,
    sandAdmin,
    others,
} = namedAccounts;

const MerkleTree = require('../../lib/merkleTree');
const {createDataArray, calculateLandHash} = require('../../lib/merkleTreeHelper');

const testLands = [
    {
        x: 400,
        y: 106,
        size: 1,
        price: '4047',
        reserved: others[1],
        salt: '0x1111111111111111111111111111111111111111111111111111111111111111'
    },
    {
        x: 120,
        y: 144,
        size: 12,
        price: '2773',
        salt: '0x1111111111111111111111111111111111111111111111111111111111111112'
    },
    {
        x: 288,
        y: 144,
        size: 12,
        price: '1358',
        salt: '0x1111111111111111111111111111111111111111111111111111111111111113'
    },
    {
        x: 36,
        y: 114,
        size: 6,
        price: '3169',
        salt: '0x1111111111111111111111111111111111111111111111111111111111111114'
    },
    {
        x: 308,
        y: 282,
        size: 1,
        price: '8465',
        salt: '0x1111111111111111111111111111111111111111111111111111111111111115'
    },
    {
        x: 308,
        y: 281,
        size: 1,
        price: '8465',
        salt: '0x1111111111111111111111111111111111111111111111111111111111111116'
    }
];

let saleStart;
let saleDuration;
let saleEnd;

const maxCommissionRate = '2000';
const signer = '0x26BC52894A05EDE59B34EE7B014b57ef0a8558B3';
const privateKey = '0x96aa38e97d1d0d19e0f1d5215ff9dad66dc5d99225b1657205d124d00d2de177';

const emptyReferral = '0x';
const referralLinkValidity = 60 * 60 * 24 * 30;

async function setupTestLandSale(contracts) {
    saleStart = getChainCurrentTime();
    saleDuration = 60 * 60;
    saleEnd = saleStart + saleDuration;
    const daiMedianizer = await deployments.get('DAIMedianizer');
    const dai = await deployments.get('DAI');
    const landHashArray = createDataArray(testLands);
    const tree = new MerkleTree(landHashArray);
    const contract = await deployContract(
        deployer,
        'LandSaleWithReferral',
        contracts.Land.address,
        contracts.Sand.address,
        contracts.Sand.address,
        landSaleAdmin,
        landSaleBeneficiary,
        tree.getRoot().hash,
        saleEnd,
        daiMedianizer.address,
        dai.address,
        signer,
        maxCommissionRate,
    );

    await tx(contracts.Land, 'setMinter', {from: landAdmin, gas: 1000000}, contract.address, true);
    await tx(contracts.Sand, 'setSuperOperator', {from: sandAdmin, gas: 1000000}, contract.address, true);

    return {contract, tree};
}

function runLandSaleEthTests(title, contactStore) {
    tap.test(title + ' tests', async (t) => {
        // t.runOnly = true;
        let contracts;
        let tree;
        let lands;
        let landHashArray;

        t.beforeEach(async () => {
            contracts = await contactStore.resetContracts();
            const deployment = deployments.get('LandPreSale_3');
            lands = deployment.linkedData;

            landHashArray = createDataArray(lands);
            tree = new MerkleTree(landHashArray);

            await tx(
                contracts.LandSale,
                'updateSigningWallet', {
                    from: landAdmin,
                    gas,
                },
                signer,
            );
        });

        t.test('-> ETH payments', async (t) => {
            // t.runOnly = true;
            t.test('can enable ETH payment', async () => {
                const isETHEnabled = await call(contracts.LandSale, 'isETHEnabled', {from: landSaleAdmin});
                assert.ok(isETHEnabled, 'ETH should be enabled');
            });

            t.test('can disable ETH payment', async () => {
                await tx(contracts.LandSale, 'setETHEnabled', {from: landSaleAdmin, gas}, false);
                const isETHEnabled = await call(contracts.LandSale, 'isETHEnabled', {from: landSaleAdmin});
                assert.ok(!isETHEnabled, 'ETH should not be enabled');
            });

            t.test('cannot enable ETH payment if not admin', async () => {
                await tx(contracts.LandSale, 'setETHEnabled', {from: landSaleAdmin, gas}, false);

                await expectRevert(
                    tx(contracts.LandSale, 'setETHEnabled', {from: others[0], gas}, true),
                    'only admin can enable/disable ETH'
                );
            });

            t.test('can buy Land with ETH (empty referral)', async () => {
                const sandPrice = lands[5].price;
                const value = await call(contracts.LandSale, 'getEtherAmountWithSAND', {from: others[0], gas}, sandPrice);

                const proof = tree.getProof(calculateLandHash(lands[5]));

                await tx(contracts.LandSale, 'buyLandWithETH', {from: others[0], gas, value},
                    others[0],
                    others[0],
                    zeroAddress,
                    lands[5].x, lands[5].y, lands[5].size,
                    lands[5].price,
                    lands[5].salt,
                    proof,
                    emptyReferral
                );
            });

            t.test('can buy Land with ETH and a referral', async () => {
                const referral = {
                    referrer: '0x80EdC2580F0c768cb5b2bb87b96049A13508C230',
                    referee: others[0],
                    expiryTime: Math.floor(Date.now() / 1000) + referralLinkValidity,
                    commissionRate: '500',
                };

                const sig = await createReferral(
                    privateKey,
                    referral.referrer,
                    referral.referee,
                    referral.expiryTime,
                    referral.commissionRate,
                );

                const sandPrice = lands[5].price;
                const value = await call(contracts.LandSale, 'getEtherAmountWithSAND', {from: others[0], gas}, sandPrice);

                const proof = tree.getProof(calculateLandHash(lands[5]));

                const isReferralValid = await call(
                    contracts.LandSale,
                    'isReferralValid', {
                        from: others[0],
                    },
                    sig,
                    referral.referrer,
                    referral.referee,
                    referral.expiryTime,
                    referral.commissionRate,
                );

                assert.equal(isReferralValid, true, 'Referral should be valid');

                const encodedReferral = defaultAbiCoder.encode(
                    [
                        'bytes',
                        'address',
                        'address',
                        'uint256',
                        'uint256'
                    ],
                    [
                        sig,
                        referral.referrer,
                        referral.referee,
                        referral.expiryTime,
                        referral.commissionRate,
                    ]
                );

                const receipt = await tx(contracts.LandSale, 'buyLandWithETH', {from: others[0], gas, value},
                    others[0],
                    others[0],
                    zeroAddress,
                    lands[5].x, lands[5].y, lands[5].size,
                    lands[5].price,
                    lands[5].salt,
                    proof,
                    encodedReferral,
                );

                // console.log(JSON.stringify(receipt));
                const event = receipt.events[0];

                assert.equal(event.event, 'ReferralUsed', 'Event name is wrong');

                const [
                    referrer,
                    referee,
                    token,
                    amount,
                    commission,
                    commissionRate,
                ] = event.args;

                assert.equal(referrer, referral.referrer, 'Referrer is wrong');
                assert.equal(referee, referral.referee, 'Referee is wrong');
                assert.equal(token, zeroAddress, 'Token is wrong');
                assert.ok(amount.eq(value), 'Amount is wrong');
                assert.ok(commissionRate.eq(referral.commissionRate), 'Amount is wrong');

                const referrerBalance = await getBalance(referral.referrer);

                const expectedCommission = amount.mul(commissionRate).div('10000');
                assert.ok(commission.eq(expectedCommission), 'Commission is wrong');
                assert.ok(commission.eq(referrerBalance), 'Referrer balance is wrong');
            });

            t.test('cannot buy Land with ETH if not enabled (empty referral)', async () => {
                await tx(contracts.LandSale, 'setETHEnabled', {from: landSaleAdmin, gas}, false);

                const proof = tree.getProof(calculateLandHash(lands[5]));

                const sandPrice = lands[5].price;
                const value = await call(contracts.LandSale, 'getEtherAmountWithSAND', {from: others[0], gas}, sandPrice);

                await expectRevert(
                    tx(contracts.LandSale, 'buyLandWithETH', {from: others[0], gas, value},
                        others[0],
                        others[0],
                        zeroAddress,
                        lands[5].x, lands[5].y, lands[5].size,
                        lands[5].price,
                        lands[5].salt,
                        proof,
                        emptyReferral,
                    ),
                    'ether payments not enabled'
                );
            });

            t.test('cannot buy Land without enough ETH (empty referral)', async () => {
                const proof = tree.getProof(calculateLandHash(lands[5]));

                await expectRevert(
                    tx(contracts.LandSale, 'buyLandWithETH', {from: others[0], gas, value: 0},
                        others[0],
                        others[0],
                        zeroAddress,
                        lands[5].x, lands[5].y, lands[5].size,
                        lands[5].price,
                        lands[5].salt,
                        proof,
                        emptyReferral,
                    ),
                    'not enough ether sent'
                );
            });

            t.test('cannot buy Land from a non reserved Land with reserved param (empty referral)', async () => {
                const sandPrice = lands[5].price;
                const value = await call(contracts.LandSale, 'getEtherAmountWithSAND', {from: others[0], gas}, sandPrice);

                const proof = tree.getProof(calculateLandHash(lands[5]));
                await expectRevert(
                    tx(contracts.LandSale, 'buyLandWithETH', {from: others[0], gas, value},
                        others[0],
                        others[0],
                        others[0],
                        lands[5].x, lands[5].y, lands[5].size,
                        lands[5].price,
                        lands[5].salt,
                        proof,
                        emptyReferral,
                    )
                );
            });

            t.test('cannot buy Land from a reserved Land of a different address (empty referral)', async () => {
                const sandPrice = '4047';
                const value = await call(contracts.LandSale, 'getEtherAmountWithSAND', {from: others[0], gas}, sandPrice);

                const {contract, tree} = await setupTestLandSale(contracts);

                await tx(contract, 'setETHEnabled', {from: landSaleAdmin, gas}, true);

                const proof = tree.getProof(calculateLandHash({
                    x: 400,
                    y: 106,
                    size: 1,
                    price: '4047',
                    reserved: others[1],
                    salt: '0x1111111111111111111111111111111111111111111111111111111111111111',
                }));
                await expectRevert(
                    tx(
                        contract, 'buyLandWithETH', {from: others[0], gas, value},
                        others[0],
                        others[0],
                        others[0],
                        400, 106, 1,
                        '4047',
                        '0x1111111111111111111111111111111111111111111111111111111111111111',
                        proof,
                        emptyReferral,
                    )
                );
            });

            t.test('can buy Land from a reserved Land if matching address (empty referral)', async () => {
                const sandPrice = '4047';
                const value = await call(contracts.LandSale, 'getEtherAmountWithSAND', {from: others[0], gas}, sandPrice);

                const {contract, tree} = await setupTestLandSale(contracts);

                await tx(contract, 'setETHEnabled', {from: landSaleAdmin, gas}, true);

                const proof = tree.getProof(calculateLandHash({
                    x: 400,
                    y: 106,
                    size: 1,
                    price: '4047',
                    reserved: others[1],
                    salt: '0x1111111111111111111111111111111111111111111111111111111111111111'
                }));
                await tx(contract, 'buyLandWithETH', {from: others[1], gas, value},
                    others[1],
                    others[1],
                    others[1],
                    400, 106, 1,
                    '4047',
                    '0x1111111111111111111111111111111111111111111111111111111111111111',
                    proof,
                    emptyReferral,
                );
                const owner = await call(contracts.Land, 'ownerOf', null, 400 + (106 * 408));
                assert.equal(owner, others[1]);
            });

            t.test('can buy Land from a reserved Land and send it to another address (empty referral)', async () => {
                const sandPrice = '4047';
                const value = await call(contracts.LandSale, 'getEtherAmountWithSAND', {from: others[0], gas}, sandPrice);

                const {contract, tree} = await setupTestLandSale(contracts);

                await tx(contract, 'setETHEnabled', {from: landSaleAdmin, gas}, true);

                const proof = tree.getProof(calculateLandHash({
                    x: 400,
                    y: 106,
                    size: 1,
                    price: '4047',
                    reserved: others[1],
                    salt: '0x1111111111111111111111111111111111111111111111111111111111111111'
                }));
                await tx(contract, 'buyLandWithETH', {from: others[1], gas, value},
                    others[1],
                    others[2],
                    others[1],
                    400, 106, 1,
                    '4047',
                    '0x1111111111111111111111111111111111111111111111111111111111111111',
                    proof,
                    emptyReferral,
                );
                const owner = await call(contracts.Land, 'ownerOf', null, 400 + (106 * 408));
                assert.equal(owner, others[2]);
            });

            t.test('CANNOT buy Land when minter rights revoked (empty referral)', async () => {
                const sandPrice = lands[5].price;
                const value = await call(contracts.LandSale, 'getEtherAmountWithSAND', {from: others[0], gas}, sandPrice);

                await tx(contracts.Land, 'setMinter', {from: landAdmin, gas}, contracts.LandSale.address, false);
                const proof = tree.getProof(calculateLandHash(lands[5]));
                await expectRevert(tx(contracts.LandSale, 'buyLandWithETH', {from: others[0], gas, value},
                    others[0],
                    others[0],
                    zeroAddress,
                    lands[5].x, lands[5].y, lands[5].size,
                    lands[5].price,
                    lands[5].salt,
                    proof,
                    emptyReferral,
                ));
            });

            t.test('CANNOT buy Land twice (empty referral)', async () => {
                const sandPrice = lands[5].price;
                const value = await call(contracts.LandSale, 'getEtherAmountWithSAND', {from: others[0], gas}, sandPrice);

                const proof = tree.getProof(calculateLandHash(lands[5]));
                await tx(contracts.LandSale, 'buyLandWithETH', {from: others[0], gas, value},
                    others[0],
                    others[0],
                    zeroAddress,
                    lands[5].x, lands[5].y, lands[5].size,
                    lands[5].price,
                    lands[5].salt,
                    proof,
                    emptyReferral,
                );
                await expectRevert(tx(contracts.LandSale, 'buyLandWithETH', {from: others[0], gas, value},
                    others[0],
                    others[0],
                    zeroAddress,
                    lands[5].x, lands[5].y, lands[5].size,
                    lands[5].price,
                    lands[5].salt,
                    proof,
                    emptyReferral,
                ));
            });

            t.test('CANNOT generate proof for Land not on sale', async () => {
                assert.throws(() => tree.getProof(calculateLandHash({
                    x: lands[5].x,
                    y: lands[5].y,
                    size: lands[5].size === 1 ? 3 : lands[5].size / 3,
                    price: lands[5].price,
                    salt: lands[5].salt
                })));
            });

            t.test('CANNOT buy Land with invalid proof (empty referral)', async () => {
                const sandPrice = lands[5].price;
                const value = await call(contracts.LandSale, 'getEtherAmountWithSAND', {from: others[0], gas}, sandPrice);

                const proof = [
                    '0x0000000000000000000000000000000000000000000000000000000000000001',
                    '0x0000000000000000000000000000000000000000000000000000000000000002',
                    '0x0000000000000000000000000000000000000000000000000000000000000003',
                ];
                await expectRevert(
                    tx(contracts.LandSale, 'buyLandWithETH', {from: others[0], gas, value},
                        others[0],
                        others[0],
                        zeroAddress,
                        lands[5].x, lands[5].y, lands[5].size,
                        lands[5].price,
                        lands[5].salt,
                        proof,
                        emptyReferral,
                    ),
                    'Invalid land provided'
                );
            });

            t.test('CANNOT buy Land with wrong proof (empty referral)', async () => {
                const sandPrice = lands[5].price;
                const value = await call(contracts.LandSale, 'getEtherAmountWithSAND', {from: others[0], gas}, sandPrice);

                const proof = tree.getProof(calculateLandHash(lands[2]));
                await expectRevert(
                    tx(
                        contracts.LandSale, 'buyLandWithETH', {from: others[0], gas, value},
                        others[0],
                        others[0],
                        zeroAddress,
                        lands[5].x, lands[5].y, lands[5].size,
                        lands[5].price,
                        lands[5].salt,
                        proof,
                        emptyReferral,
                    ),
                    'Invalid land provided',
                );
            });

            t.test('after buying user own all Land bought (empty referral)', async () => {
                const sandPrice = lands[3].price;
                const value = await call(contracts.LandSale, 'getEtherAmountWithSAND', {from: others[0], gas}, sandPrice);

                const proof = tree.getProof(calculateLandHash(lands[3]));
                await tx(contracts.LandSale, 'buyLandWithETH', {from: others[0], gas, value},
                    others[0],
                    others[0],
                    zeroAddress,
                    lands[3].x, lands[3].y, lands[3].size,
                    lands[3].price,
                    lands[3].salt,
                    proof,
                    emptyReferral,
                );
                for (let x = lands[3].x; x < lands[3].x + lands[3].size; x++) {
                    for (let y = lands[3].y; y < lands[3].y + lands[3].size; y++) {
                        const owner = await call(contracts.Land, 'ownerOf', null, x + (y * 408));
                        const balance = await call(contracts.Land, 'balanceOf', null, others[0]);
                        assert.equal(owner, others[0]);
                        assert.ok(balance.eq(lands[3].size * lands[3].size));
                    }
                }
            });

            t.test('can buy all Lands specified in json except reserved lands (empty referral)', async () => {
                for (const land of lands) {
                    const value = await call(contracts.LandSale, 'getEtherAmountWithSAND', {from: others[0], gas}, land.price);

                    const landHash = calculateLandHash(land);
                    const proof = tree.getProof(landHash);
                    if (land.reserved) {
                        await expectRevert(tx(contracts.LandSale, 'buyLandWithETH', {from: others[0], gas, value},
                            others[0],
                            others[0],
                            land.reserved,
                            land.x, land.y, land.size,
                            land.price,
                            land.salt,
                            proof,
                            emptyReferral,
                        ));
                    } else {
                        try {
                            await tx(contracts.LandSale, 'buyLandWithETH', {from: others[0], gas, value},
                                others[0],
                                others[0],
                                zeroAddress,
                                land.x, land.y, land.size,
                                land.price,
                                land.salt,
                                proof,
                                emptyReferral,
                            );
                        } catch (e) {
                            console.log(JSON.stringify(land));
                            console.log(JSON.stringify(proof));
                            throw e;
                        }
                    }
                }
            });

            t.test('check the expiry time of the sale', async () => {
                const {contract} = await setupTestLandSale(contracts);

                const expiryTime = await call(contract, 'getExpiryTime');
                assert.ok(expiryTime.eq(saleEnd), 'Expiry time is wrong');
            });

            t.test('Cannot buy a land after the expiry time (empty referral)', async () => {
                const sandPrice = '4047';
                const value = await call(contracts.LandSale, 'getEtherAmountWithSAND', {from: others[0], gas}, sandPrice);

                const {contract, tree} = await setupTestLandSale(contracts);

                await tx(contract, 'setETHEnabled', {from: landSaleAdmin, gas}, true);

                const proof = tree.getProof(calculateLandHash({
                    x: 400,
                    y: 106,
                    size: 1,
                    price: '4047',
                    reserved: others[1],
                    salt: '0x1111111111111111111111111111111111111111111111111111111111111111'
                }));

                await increaseTime(saleDuration);

                await expectRevert(
                    tx(
                        contract, 'buyLandWithETH', {from: others[0], gas, value},
                        others[0],
                        others[0],
                        others[0],
                        400, 106, 1,
                        4047,
                        '0x1111111111111111111111111111111111111111111111111111111111111111',
                        proof,
                        emptyReferral,
                    ),
                    'sale is over'
                );
            });
        });
    });
}

module.exports = {
    runLandSaleEthTests
};
