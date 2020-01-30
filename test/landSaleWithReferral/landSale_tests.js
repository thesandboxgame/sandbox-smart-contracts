const Web3 = require('web3');
const tap = require('tap');
const assert = require('assert');
const rocketh = require('rocketh');
const BN = require('bn.js');
const {
    getDeployedContract,
} = require('rocketh-web3')(rocketh, require('web3'));

const {
    tx,
    call,
    gas,
    expectThrow,
    zeroAddress,
    deployContract,
    increaseTime,
    expectRevert,
    getChainCurrentTime,
    encodeParameters,
    toWei,
} = require('../utils');

const {
    createReferral,
} = require('../../lib/referralValidator');

const {
    deployer,
    landSaleAdmin,
    landSaleBeneficiary,
    sandBeneficiary,
    landAdmin,
    sandAdmin,
    others,
} = rocketh.namedAccounts;

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
let contractName = 'LandSale';

const maxCommissionRate = '2000';
const signer = '0x26BC52894A05EDE59B34EE7B014b57ef0a8558B3';
const privateKey = '0x96aa38e97d1d0d19e0f1d5215ff9dad66dc5d99225b1657205d124d00d2de177';

const emptyReferral = '0x';
const referralLinkValidity = 60 * 60 * 24 * 30;

async function setupTestLandSale(contracts) {
    saleStart = getChainCurrentTime();
    saleDuration = 60 * 60;
    saleEnd = saleStart + saleDuration;
    const daiMedianizer = getDeployedContract('DAIMedianizer');
    const dai = getDeployedContract('DAI');
    const landHashArray = createDataArray(testLands);
    const tree = new MerkleTree(landHashArray);
    let contract;
    if (contractName === 'LandSaleWithReferral') {
        contract = await deployContract(
            deployer,
            contractName,
            contracts.Land.options.address,
            contracts.Sand.options.address,
            contracts.Sand.options.address,
            landSaleAdmin,
            landSaleBeneficiary,
            tree.getRoot().hash,
            saleEnd,
            daiMedianizer.options.address,
            dai.options.address,
            signer,
            maxCommissionRate,
        );
    } else {
        contract = await deployContract(
            deployer,
            contractName,
            contracts.Land.options.address,
            contracts.Sand.options.address,
            contracts.Sand.options.address,
            landSaleAdmin,
            landSaleBeneficiary,
            tree.getRoot().hash,
            saleEnd
        );
    }
    await tx(contract, 'setSANDEnabled', {from: landSaleAdmin, gas: 100000}, true);
    await tx(contracts.Land, 'setMinter', {from: landAdmin, gas: 1000000}, contract.options.address, true);
    await tx(contracts.Sand, 'setSuperOperator', {from: sandAdmin, gas: 1000000}, contract.options.address, true);

    return {contract, tree};
}

function runLandSaleTests(title, contactStore) {
    contractName = contactStore.contractName || 'LandSale';
    tap.test(title + ' tests', async (t) => {
        // t.runOnly = true;
        let contracts;
        let tree;
        let lands;
        let landHashArray;

        t.beforeEach(async () => {
            contracts = await contactStore.resetContracts();
            const deployment = rocketh.deployment('LandPreSale_2');
            lands = deployment.data;

            landHashArray = createDataArray(lands);
            tree = new MerkleTree(landHashArray);

            await tx(contracts.Sand, 'transferFrom', {from: sandBeneficiary, gas}, sandBeneficiary, others[0], '1000000000000000000000000');
            await tx(contracts.Sand, 'transferFrom', {from: sandBeneficiary, gas}, sandBeneficiary, others[1], '1000000000000000000000000');

            await tx(contracts.Sand, 'approve', {from: others[0], gas}, contracts.LandSale.options.address, toWei('1000000')); // TODO remove and move it inot test

            await tx(
                contracts.LandSale,
                'updateSigningWallet', {
                    from: landAdmin,
                    gas,
                },
                signer,
            );
        });

        t.test('-> Sand payments', async (t) => {
            // t.runOnly = true;
            t.test('can buy Land with SAND', async () => {
                const proof = tree.getProof(calculateLandHash(lands[5]));

                await tx(contracts.LandSale, 'buyLandWithSand', {from: others[0], gas},
                    others[0],
                    others[0],
                    zeroAddress,
                    lands[5].x, lands[5].y, lands[5].size,
                    lands[5].price,
                    lands[5].salt,
                    proof,
                    emptyReferral,
                );

                const balance = await call(contracts.Land, 'balanceOf', {from: others[0]}, others[0]);
                assert.equal(balance, lands[5].size * lands[5].size, 'Balance is wrong');
            });

            t.test('can buy Land with SAND and a referral', async () => {
                const web3 = new Web3();
                web3.setProvider(rocketh.ethereum);

                const referral = {
                    referrer: others[2],
                    referee: others[0],
                    expiryTime: Math.floor(Date.now() / 1000) + referralLinkValidity,
                    commissionRate: '500',
                };

                const sig = createReferral(
                    web3,
                    privateKey,
                    referral.referrer,
                    referral.referee,
                    referral.expiryTime,
                    referral.commissionRate,
                );

                const proof = tree.getProof(calculateLandHash(lands[5]));

                const isReferralValid = await call(
                    contracts.LandSale,
                    'isReferralValid', {
                        from: others[0],
                    },
                    sig.signature,
                    referral.referrer,
                    referral.referee,
                    referral.expiryTime,
                    referral.commissionRate,
                );

                assert.equal(isReferralValid, true, 'Referral should be valid');

                const encodedReferral = encodeParameters(
                    [
                        'bytes',
                        'address',
                        'address',
                        'uint256',
                        'uint256'
                    ],
                    [
                        sig.signature,
                        referral.referrer,
                        referral.referee,
                        referral.expiryTime,
                        referral.commissionRate,
                    ],
                );

                const receipt = await tx(contracts.LandSale, 'buyLandWithSand', {from: others[0], gas},
                    others[0],
                    others[0],
                    zeroAddress,
                    lands[5].x, lands[5].y, lands[5].size,
                    lands[5].price,
                    lands[5].salt,
                    proof,
                    encodedReferral,
                );

                const balance = await call(contracts.Land, 'balanceOf', {from: others[0]}, others[0]);
                assert.equal(balance, lands[5].size * lands[5].size, 'Balance is wrong');

                const event = receipt.events.ReferralUsed;

                assert.equal(event.event, 'ReferralUsed', 'Event name is wrong');

                const {
                    referrer,
                    referee,
                    token,
                    amount,
                    commission,
                    commissionRate,
                }  = event.returnValues;

                assert.equal(referrer, referral.referrer, 'Referrer is wrong');
                assert.equal(referee, referral.referee, 'Referee is wrong');
                assert.equal(token, contracts.Sand.options.address, 'Token is wrong');
                assert.equal(amount, lands[5].price, 'Amount is wrong');
                assert.equal(commissionRate, referral.commissionRate, 'Amount is wrong');

                const referrerBalance = await call(
                    contracts.Sand,
                    'balanceOf', {
                        from: others[0],
                    },
                    others[2],
                );

                const expectedCommission = new BN(amount).mul(new BN(commissionRate)).div(new BN('10000'));
                assert.equal(commission, expectedCommission.toString(), 'Commission is wrong');

                assert.equal(commission, referrerBalance, 'Referrer balance is wrong');
            });

            if (contractName === 'LandSaleWithETHAndDAI') {
                t.test('cannot buy Land with SAND if not enabled', async () => {
                    await tx(contracts.LandSale, 'setSANDEnabled', {from: landSaleAdmin, gas}, false);

                    const proof = tree.getProof(calculateLandHash(lands[5]));

                    await expectRevert(
                        tx(
                            contracts.LandSale, 'buyLandWithSand', {from: others[0], gas},
                            others[0],
                            others[0],
                            zeroAddress,
                            lands[5].x, lands[5].y, lands[5].size,
                            lands[5].price,
                            lands[5].salt,
                            proof,
                            emptyReferral,
                        ),
                        'sand payments not enabled'
                    );
                });

                t.test('can disable SAND payment', async () => {
                    await tx(contracts.LandSale, 'setSANDEnabled', {from: landSaleAdmin, gas}, false);
                    const isSANDEnabled = await call(contracts.LandSale, 'isSANDEnabled', {from: landSaleAdmin});
                    assert.equal(isSANDEnabled, false, 'SAND should not be enabled');
                });

                t.test('cannot disable SAND payment if not admin', async () => {
                    await expectRevert(
                        tx(contracts.LandSale, 'setSANDEnabled', {from: others[0], gas}, false),
                        'only admin can enable/disable SAND'
                    );
                });
            }

            t.test('cannot buy Land without SAND', async () => {
                const proof = tree.getProof(calculateLandHash(lands[1]));

                await expectThrow(
                    tx(contracts.LandSale, 'buyLandWithSand', {from: others[2], gas},
                        others[2],
                        others[2],
                        zeroAddress,
                        lands[1].x, lands[1].y, lands[1].size,
                        lands[1].price,
                        lands[1].salt,
                        proof,
                        emptyReferral,
                    ),
                );
            });

            t.test('cannot buy Land without enough tokens', async () => {
                await tx(contracts.Sand, 'transferFrom', {from: sandBeneficiary, gas}, sandBeneficiary, others[2], 4046);
                const proof = tree.getProof(calculateLandHash(lands[1]));

                await expectThrow(
                    tx(
                        contracts.LandSale, 'buyLandWithSand', {from: others[2], gas},
                        others[2],
                        others[2],
                        zeroAddress,
                        lands[5].x, lands[5].y, lands[5].size,
                        lands[5].price,
                        lands[5].salt,
                        proof,
                        emptyReferral,
                    ),
                );
            });

            t.test('cannot buy Land without just enough tokens', async () => {
                await tx(contracts.Sand, 'transferFrom', {from: sandBeneficiary, gas}, sandBeneficiary, others[2], new BN(lands[5].price).sub(new BN(1)).toString(10));
                const proof = tree.getProof(calculateLandHash(lands[1]));

                await expectThrow(
                    tx(
                        contracts.LandSale, 'buyLandWithSand', {from: others[2], gas},
                        others[2],
                        others[2],
                        zeroAddress,
                        lands[5].x, lands[5].y, lands[5].size,
                        lands[5].price,
                        lands[5].salt,
                        proof,
                        emptyReferral,
                    ),
                );
            });

            t.test('can buy Land with just enough tokens', async () => {
                await tx(contracts.Sand, 'transferFrom', {from: sandBeneficiary, gas}, sandBeneficiary, others[2], lands[5].price);
                const proof = tree.getProof(calculateLandHash(lands[5]));

                await tx(contracts.LandSale, 'buyLandWithSand', {from: others[2], gas},
                    others[2],
                    others[2],
                    zeroAddress,
                    lands[5].x, lands[5].y, lands[5].size,
                    lands[5].price,
                    lands[5].salt,
                    proof,
                    emptyReferral,
                );
            });

            t.test('cannot buy Land from a non reserved Land with reserved param', async () => {
                const proof = tree.getProof(calculateLandHash(lands[5]));
                await expectThrow(
                    tx(
                        contracts.LandSale, 'buyLandWithSand', {from: others[0], gas},
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

            t.test('cannot buy Land from a reserved Land of a different address', async () => {
                const {contract, tree} = await setupTestLandSale(contracts);
                const proof = tree.getProof(calculateLandHash({
                    x: 400,
                    y: 106,
                    size: 1,
                    price: '4047',
                    reserved: others[1],
                    salt: '0x1111111111111111111111111111111111111111111111111111111111111111',
                }));
                await expectThrow(tx(contract, 'buyLandWithSand', {from: others[0], gas},
                    others[0],
                    others[0],
                    others[0],
                    400, 106, 1,
                    '4047',
                    '0x1111111111111111111111111111111111111111111111111111111111111111',
                    proof,
                    emptyReferral,
                ));
            });

            t.test('can buy Land from a reserved Land if matching address', async () => {
                const {contract, tree} = await setupTestLandSale(contracts);
                const proof = tree.getProof(calculateLandHash({
                    x: 400,
                    y: 106,
                    size: 1,
                    price: '4047',
                    reserved: others[1],
                    salt: '0x1111111111111111111111111111111111111111111111111111111111111111'
                }));
                await tx(contract, 'buyLandWithSand', {from: others[1], gas},
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

            t.test('can buy Land from a reserved Land and send it to another address', async () => {
                const {contract, tree} = await setupTestLandSale(contracts);
                const proof = tree.getProof(calculateLandHash({
                    x: 400,
                    y: 106,
                    size: 1,
                    price: '4047',
                    reserved: others[1],
                    salt: '0x1111111111111111111111111111111111111111111111111111111111111111'
                }));
                await tx(contract, 'buyLandWithSand', {from: others[1], gas},
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

            t.test('CANNOT buy Land when minter rights revoked', async () => {
                await tx(contracts.Land, 'setMinter', {from: landAdmin, gas}, contracts.LandSale.options.address, false);
                const proof = tree.getProof(calculateLandHash(lands[5]));
                await expectThrow(tx(contracts.LandSale, 'buyLandWithSand', {from: others[0], gas},
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

            t.test('CANNOT buy Land twice', async () => {
                const proof = tree.getProof(calculateLandHash(lands[5]));
                await tx(contracts.LandSale, 'buyLandWithSand', {from: others[0], gas},
                    others[0],
                    others[0],
                    zeroAddress,
                    lands[5].x, lands[5].y, lands[5].size,
                    lands[5].price,
                    lands[5].salt,
                    proof,
                    emptyReferral,
                );
                await expectThrow(tx(contracts.LandSale, 'buyLandWithSand', {from: others[0], gas},
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

            t.test('CANNOT buy Land with invalid proof', async () => {
                const proof = [
                    '0x0000000000000000000000000000000000000000000000000000000000000001',
                    '0x0000000000000000000000000000000000000000000000000000000000000002',
                    '0x0000000000000000000000000000000000000000000000000000000000000003',
                ];
                await expectRevert(
                    tx(
                        contracts.LandSale, 'buyLandWithSand', {from: others[0], gas},
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

            t.test('CANNOT buy Land with wrong proof', async () => {
                const proof = tree.getProof(calculateLandHash(lands[2]));
                await expectRevert(
                    tx(
                        contracts.LandSale, 'buyLandWithSand', {from: others[0], gas},
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

            t.test('after buying user own all Land bought', async () => {
                const proof = tree.getProof(calculateLandHash(lands[3]));
                await tx(contracts.LandSale, 'buyLandWithSand', {from: others[0], gas},
                    others[0],
                    others[0],
                    zeroAddress,
                    lands[3].x, lands[3].y, lands[3].size,
                    lands[3].price,
                    lands[3].salt,
                    proof,
                    emptyReferral,
                );
                for (let x = lands[3].x; x < lands[3].x + 12; x++) {
                    for (let y = lands[3].y; y < lands[3].y + 12; y++) {
                        const owner = await call(contracts.Land, 'ownerOf', null, x + (y * 408));
                        const balance = await call(contracts.Land, 'balanceOf', null, others[0]);
                        assert.equal(owner, others[0]);
                        assert.equal(balance, 144);
                    }
                }
            });

            t.test('can buy all Lands specified in json except reserved lands', async () => {
                await tx(contracts.Sand, 'transferFrom', {from: sandBeneficiary, gas}, sandBeneficiary, others[0], '1000000000000000000000000000');

                // const balance = await call(contracts.Sand, 'balanceOf', null, others[0]);
                // let totalPrice = new BN(0);
                // for (const land of lands) {
                //     totalPrice = totalPrice.add(new BN(land.price, 10));
                // }
                // console.log({
                //     totalPrice: totalPrice.toString(10),
                //     balance
                // });

                for (const land of lands) {
                    const landHash = calculateLandHash(land);
                    const proof = tree.getProof(landHash);
                    if (land.reserved) {
                        await expectThrow(tx(contracts.LandSale, 'buyLandWithSand', {from: others[0], gas},
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
                        await tx(contracts.LandSale, 'buyLandWithSand', {from: others[0], gas},
                            others[0],
                            others[0],
                            zeroAddress,
                            land.x, land.y, land.size,
                            land.price,
                            land.salt,
                            proof,
                            emptyReferral,
                        );
                    }
                }
            });

            t.test('check the expiry time of the sale', async () => {
                const {contract} = await setupTestLandSale(contracts);

                const expiryTime = await call(contract, 'getExpiryTime');
                assert.equal(expiryTime, saleEnd, 'Expiry time is wrong');
            });

            t.test('Cannot buy a land after the expiry time', async () => {
                const {contract, tree} = await setupTestLandSale(contracts);
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
                        contract, 'buyLandWithSand', {from: others[0], gas},
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
    runLandSaleTests
};
