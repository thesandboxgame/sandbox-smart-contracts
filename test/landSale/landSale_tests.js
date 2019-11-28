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
} = require('../utils');

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

async function setupTestLandSale(contracts) {
    saleStart = getChainCurrentTime();
    saleDuration = 60 * 60;
    saleEnd = saleStart + saleDuration;
    const daiMedianizer = getDeployedContract('DAIMedianizer');
    const dai = getDeployedContract('DAI');
    const landHashArray = createDataArray(testLands);
    const tree = new MerkleTree(landHashArray);
    let contract;
    if (contractName === 'LandSaleWithETHAndDAI') {
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
            const deployment = rocketh.deployment('LandPreSale_1');
            lands = deployment.data;

            landHashArray = createDataArray(lands);
            tree = new MerkleTree(landHashArray);

            await tx(contracts.Sand, 'transferFrom', {from: sandBeneficiary, gas}, sandBeneficiary, others[0], '1000000000000000000000000');
            await tx(contracts.Sand, 'transferFrom', {from: sandBeneficiary, gas}, sandBeneficiary, others[1], '1000000000000000000000000');
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
                    proof
                );

                const balance = await call(contracts.Land, 'balanceOf', {from: others[0]}, others[0]);
                assert.equal(balance, lands[5].size * lands[5].size, 'Balance is wrong');
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
                            proof
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
                        proof
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
                        proof
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
                        proof
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
                    proof
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
                        proof
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
                    proof
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
                    proof
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
                    proof
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
                    proof
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
                    proof
                );
                await expectThrow(tx(contracts.LandSale, 'buyLandWithSand', {from: others[0], gas},
                    others[0],
                    others[0],
                    zeroAddress,
                    lands[5].x, lands[5].y, lands[5].size,
                    lands[5].price,
                    lands[5].salt,
                    proof
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
                        proof
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
                        proof
                    ),
                    'Invalid land provided'
                );
            });

            t.test('after buying user own all Land bought', async () => {
                const proof = tree.getProof(calculateLandHash(lands[2]));
                await tx(contracts.LandSale, 'buyLandWithSand', {from: others[0], gas},
                    others[0],
                    others[0],
                    zeroAddress,
                    lands[2].x, lands[2].y, lands[2].size,
                    lands[2].price,
                    lands[2].salt,
                    proof
                );
                for (let x = lands[2].x; x < lands[2].x + 12; x++) {
                    for (let y = lands[2].y; y < lands[2].y + 12; y++) {
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
                            proof
                        ));
                    } else {
                        await tx(contracts.LandSale, 'buyLandWithSand', {from: others[0], gas},
                            others[0],
                            others[0],
                            zeroAddress,
                            land.x, land.y, land.size,
                            land.price,
                            land.salt,
                            proof
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
                        proof
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
