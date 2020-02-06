const tap = require('tap');
const BN = require('bn.js');
const assert = require('assert');
const rocketh = require('rocketh');
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
    toWei,
    getChainCurrentTime,
} = require('../utils');

const {
    deployer,
    landSaleAdmin,
    landSaleBeneficiary,
    landAdmin,
    sandAdmin,
    others,
} = rocketh.namedAccounts;

const MerkleTree = require('../../lib/merkleTree');
const {createDataArray, calculateLandHash} = require('../../lib/merkleTreeHelper');

function sandToUSD(sand) {
    return new BN(sand).mul(new BN('14400000000000000')).div(new BN('1000000000000000000')).toString(10);
}

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

async function setupTestLandSale(contracts) {
    saleStart = getChainCurrentTime();
    saleDuration = 60 * 60;
    saleEnd = saleStart + saleDuration;
    const daiMedianizer = getDeployedContract('DAIMedianizer');
    const dai = getDeployedContract('DAI');
    const landHashArray = createDataArray(testLands);
    const tree = new MerkleTree(landHashArray);
    const contract = await deployContract(
        deployer,
        'LandSaleWithETHAndDAI',
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

    await tx(contracts.Land, 'setMinter', {from: landAdmin, gas: 1000000}, contract.options.address, true);
    await tx(contracts.Sand, 'setSuperOperator', {from: sandAdmin, gas: 1000000}, contract.options.address, true);

    return {contract, tree};
}

function runLandSaleDaiTests(title, contractStore) {
    tap.test(title + ' tests', async (t) => {
        let contracts;
        let tree;
        let lands;
        let landHashArray;

        t.beforeEach(async () => {
            contracts = await contractStore.resetContracts();
            const deployment = rocketh.deployment(contractStore.contractName);
            lands = deployment.data;

            landHashArray = createDataArray(lands);
            tree = new MerkleTree(landHashArray);

            await tx(contracts.FakeDAI, 'transfer', {from: deployer, gas}, others[0], toWei('1000000'));
            await tx(contracts.FakeDAI, 'approve', {from: others[0], gas}, contracts.LandSale.options.address, toWei('1000000')); // TODO remove and move it inot test
        });

        t.test('-> DAI payments', async (t) => {
            t.test('can enable DAI payment', async () => {
                const isDAIEnabled = await call(contracts.LandSale, 'isDAIEnabled', {from: landSaleAdmin});
                assert.ok(isDAIEnabled, 'DAI should be enabled');
            });

            t.test('can disable DAI payment', async () => {
                await tx(contracts.LandSale, 'setDAIEnabled', {from: landSaleAdmin, gas}, false);
                const isDAIEnabled = await call(contracts.LandSale, 'isDAIEnabled', {from: landSaleAdmin});
                assert.ok(!isDAIEnabled, 'DAI should not be enabled');
            });

            t.test('cannot enable DAI payment if not admin', async () => {
                await tx(contracts.LandSale, 'setDAIEnabled', {from: landSaleAdmin, gas}, false);

                await expectRevert(
                    tx(contracts.LandSale, 'setDAIEnabled', {from: others[0], gas}, true),
                    'only admin can enable/disable DAI'
                );
            });

            t.test('can buy Land with DAI', async () => {
                const proof = tree.getProof(calculateLandHash(lands[5]));

                await tx(contracts.LandSale, 'buyLandWithDAI', {from: others[0], gas},
                    others[0],
                    others[0],
                    zeroAddress,
                    lands[5].x, lands[5].y, lands[5].size,
                    lands[5].price,
                    lands[5].salt,
                    proof
                );
            });

            t.test('cannot buy Land with DAI if not enabled', async () => {
                await tx(contracts.LandSale, 'setDAIEnabled', {from: landSaleAdmin, gas}, false);

                const proof = tree.getProof(calculateLandHash(lands[5]));

                await expectRevert(
                    tx(contracts.LandSale, 'buyLandWithDAI', {from: others[0], gas},
                        others[0],
                        others[0],
                        zeroAddress,
                        lands[5].x, lands[5].y, lands[5].size,
                        lands[5].price,
                        lands[5].salt,
                        proof
                    ),
                    'dai payments not enabled'
                );
            });

            t.test('cannot buy Land without DAI', async () => {
                const proof = tree.getProof(calculateLandHash(lands[5]));

                await tx(contracts.FakeDAI, 'transfer', {from: others[0], gas}, others[1], toWei('1000000'));

                await expectThrow(
                    tx(contracts.LandSale, 'buyLandWithDAI', {from: others[0], gas},
                        others[0],
                        others[0],
                        zeroAddress,
                        lands[5].x, lands[5].y, lands[5].size,
                        lands[5].price,
                        lands[5].salt,
                        proof
                    )
                );
            });

            t.test('cannot buy Land without just enough DAI', async () => {
                const proof = tree.getProof(calculateLandHash(lands[5]));

                await tx(contracts.FakeDAI, 'transfer', {from: others[0], gas}, others[1], toWei('1000000'));
                await tx(contracts.FakeDAI, 'transfer', {from: others[1], gas}, others[0], new BN(sandToUSD(lands[5].price)).sub(new BN(1)).toString(10));

                await expectThrow(
                    tx(contracts.LandSale, 'buyLandWithDAI', {from: others[0], gas},
                        others[0],
                        others[0],
                        zeroAddress,
                        lands[5].x, lands[5].y, lands[5].size,
                        lands[5].price,
                        lands[5].salt,
                        proof
                    )
                );
            });

            t.test('can buy Land with just enough DAI', async () => {
                const proof = tree.getProof(calculateLandHash(lands[5]));

                await tx(contracts.FakeDAI, 'transfer', {from: others[0], gas}, others[1], toWei('1000000'));
                await tx(contracts.FakeDAI, 'transfer', {from: others[1], gas}, others[0], sandToUSD(lands[5].price));

                await tx(contracts.LandSale, 'buyLandWithDAI', {from: others[0], gas},
                    others[0],
                    others[0],
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
                    tx(contracts.LandSale, 'buyLandWithDAI', {from: others[0], gas},
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

                await tx(contract, 'setDAIEnabled', {from: landSaleAdmin, gas}, true);
                await tx(contracts.FakeDAI, 'approve', {from: others[0], gas}, contract.options.address, toWei('1000000'));

                const proof = tree.getProof(calculateLandHash({
                    x: 400,
                    y: 106,
                    size: 1,
                    price: '4047',
                    reserved: others[1],
                    salt: '0x1111111111111111111111111111111111111111111111111111111111111111',
                }));
                await expectThrow(
                    tx(
                        contract, 'buyLandWithDAI', {from: others[0], gas},
                        others[0],
                        others[0],
                        others[0],
                        400, 106, 1,
                        '4047',
                        '0x1111111111111111111111111111111111111111111111111111111111111111',
                        proof
                    )
                );
            });

            t.test('can buy Land from a reserved Land if matching address', async () => {
                const {contract, tree} = await setupTestLandSale(contracts);

                await tx(contract, 'setDAIEnabled', {from: landSaleAdmin, gas}, true);
                await tx(contracts.FakeDAI, 'transfer', {from: others[0], gas}, others[1], toWei('1000000'));
                await tx(contracts.FakeDAI, 'approve', {from: others[1], gas}, contract.options.address, toWei('1000000'));

                const proof = tree.getProof(calculateLandHash({
                    x: 400,
                    y: 106,
                    size: 1,
                    price: '4047',
                    reserved: others[1],
                    salt: '0x1111111111111111111111111111111111111111111111111111111111111111'
                }));
                await tx(contract, 'buyLandWithDAI', {from: others[1], gas},
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

                await tx(contract, 'setDAIEnabled', {from: landSaleAdmin, gas}, true);
                await tx(contracts.FakeDAI, 'transfer', {from: others[0], gas}, others[1], toWei('1000000'));
                await tx(contracts.FakeDAI, 'approve', {from: others[1], gas}, contract.options.address, toWei('1000000'));

                const proof = tree.getProof(calculateLandHash({
                    x: 400,
                    y: 106,
                    size: 1,
                    price: '4047',
                    reserved: others[1],
                    salt: '0x1111111111111111111111111111111111111111111111111111111111111111'
                }));
                await tx(contract, 'buyLandWithDAI', {from: others[1], gas},
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
                await expectThrow(tx(contracts.LandSale, 'buyLandWithDAI', {from: others[0], gas},
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
                await tx(contracts.LandSale, 'buyLandWithDAI', {from: others[0], gas},
                    others[0],
                    others[0],
                    zeroAddress,
                    lands[5].x, lands[5].y, lands[5].size,
                    lands[5].price,
                    lands[5].salt,
                    proof
                );
                await expectThrow(tx(contracts.LandSale, 'buyLandWithDAI', {from: others[0], gas},
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
                    tx(contracts.LandSale, 'buyLandWithDAI', {from: others[0], gas},
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
                        contracts.LandSale, 'buyLandWithDAI', {from: others[0], gas},
                        others[0],
                        others[0],
                        zeroAddress,
                        lands[5].x, lands[5].y, lands[5].size,
                        lands[5].price,
                        lands[5].salt,
                        proof
                    ),
                    'Invalid land provided',
                );
            });

            // t.test('after buying user own all Land bought', async () => {
            //     const proof = tree.getProof(calculateLandHash(lands[3]));
            //     await tx(contracts.LandSale, 'buyLandWithDAI', {from: others[0], gas},
            //         others[0],
            //         others[0],
            //         zeroAddress,
            //         lands[3].x, lands[3].y, lands[3].size,
            //         lands[3].price,
            //         lands[3].salt,
            //         proof
            //     );
            //     for (let x = lands[3].x; x < lands[3].x + 12; x++) {
            //         for (let y = lands[3].y; y < lands[3].y + 12; y++) {
            //             const owner = await call(contracts.Land, 'ownerOf', null, x + (y * 408));
            //             const balance = await call(contracts.Land, 'balanceOf', null, others[0]);
            //             assert.equal(owner, others[0]);
            //             assert.equal(balance, 144);
            //         }
            //     }
            // });

            t.test('can buy all Lands specified in json except reserved lands', async () => {
                await tx(contracts.FakeDAI, 'transfer', {from: deployer, gas}, others[0], toWei('1000000'));
                for (const land of lands) {
                    const landHash = calculateLandHash(land);
                    const proof = tree.getProof(landHash);
                    if (land.reserved) {
                        await expectThrow(tx(contracts.LandSale, 'buyLandWithDAI', {from: others[0], gas},
                            others[0],
                            others[0],
                            land.reserved,
                            land.x, land.y, land.size,
                            land.price,
                            land.salt,
                            proof
                        ));
                    } else {
                        await tx(contracts.LandSale, 'buyLandWithDAI', {from: others[0], gas},
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

                await tx(contract, 'setDAIEnabled', {from: landSaleAdmin, gas}, true);
                await tx(contracts.FakeDAI, 'approve', {from: others[0], gas}, contract.options.address, toWei('1000000'));

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
                        contract, 'buyLandWithDAI', {from: others[0], gas},
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
                await increaseTime(saleDuration);
            });
        });
    });
}

module.exports = {
    runLandSaleDaiTests
};
