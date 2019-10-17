const tap = require('tap');
const rocketh = require('rocketh');
const {assert} = require('chai');

const {
    balanceOf,
} = require('../erc721');

const {
    gas,
    expectThrow,
} = require('../utils');

const {
    namedAccounts,
    accounts,
} = rocketh;

const {
    landAdmin,
} = namedAccounts;

const availableSizes = [1, 3, 6, 12, 24];
const gridSize = 408;

async function mintBlock(contract, to, size, x, y, options) {
    return contract.methods.mintBlock(to, size, x, y).send(options);
}

function runQuadTreeTests(title, deployLand) {
    tap.test(title + ' : Quad Tree tests ', async (t) => {
        let land;

        t.beforeEach(async () => {
            land = await deployLand();
        });

        t.test('Check the super operators', async () => {
            const isAdminSuperOperator = await land.methods.isSuperOperator(landAdmin).call();
            assert.equal(isAdminSuperOperator, true, 'LandAdmin should be SuperOperator');
        });

        t.test('Block minting with correct sizes', async (t) => {
            for (let i = 0; i < availableSizes.length; i += 1) {
                const size = availableSizes[i];

                t.test(`Should mint a ${size}x${size} block for account 0`, async () => {
                    await mintBlock(land, landAdmin, size, 0, 0, {
                        from: landAdmin,
                        gas,
                    });

                    const balance = await balanceOf(land, accounts[0]);
                    assert.equal(balance, size * size, 'Account 0 balance is wrong');
                });
            }
        });

        t.test('Block minting all over the grid', {
            skip: true,
        }, async (t) => {
            for (let x = 0; x < gridSize - 1; x += 1) {
                for (let y = 0; y < gridSize - 1; y += 1) {
                    const size = 1;

                    t.test(`Should mint a ${size}x${size} block for account 0 at ${x} ${y}`, async () => {
                        await mintBlock(land, accounts[0], size, x, y, {
                            from: landAdmin,
                            gas,
                        });

                        const balance = await balanceOf(land, accounts[0]);
                        assert.equal(balance, size * size, 'Account 0 balance is wrong');
                    });
                }
            }
        });

        t.test('No block minting with incorrect sizes', async (t) => {
            for (let i = 0; i < 30; i += 1) {
                const size = i;

                if (!availableSizes.includes(size)) {
                    t.test(`Should not mint a ${size}x${size} block for account 0`, async () => {
                        await expectThrow(
                            mintBlock(land, landAdmin, size, 0, 0, {
                                from: landAdmin,
                                gas,
                            }),
                        );

                        const balance = await balanceOf(land, accounts[0]);
                        assert.equal(balance, 0, 'Account 0 balance is wrong');
                    });
                }
            }
        });

        t.test('No block minting outside of the bounds', async () => {
            await expectThrow(
                mintBlock(land, accounts[0], 1, 408, 408, {
                    from: landAdmin,
                    gas,
                }),
            );

            const balance = await balanceOf(land, accounts[0]);
            assert.equal(balance, 0, 'Account 0 balance is wrong');
        });

        t.test('No block minting if not enough space', async () => {
            await expectThrow(
                mintBlock(land, accounts[0], 3, 407, 407, {
                    from: landAdmin,
                    gas,
                }),
            );

            const balance = await balanceOf(land, accounts[0]);
            assert.equal(balance, 0, 'Account 0 balance is wrong');
        });

        t.test('Should not mint a land on top of another one (from small size to big)', async () => {
            await mintBlock(land, accounts[0], 1, 0, 0, {
                from: landAdmin,
                gas,
            });

            for (let i = 0; i < availableSizes.length; i += 1) {
                const size = availableSizes[i];

                await expectThrow(
                    mintBlock(land, accounts[0], size, 0, 0, {
                        from: landAdmin,
                        gas,
                    })
                );
            }
        });

        t.test('Should not mint a land on top of another one (from big size to small)', async () => {
            await mintBlock(land, accounts[0], 24, 0, 0, {
                from: landAdmin,
                gas,
            });

            for (let i = availableSizes.length - 1; i >= 0; i -= 1) {
                const size = availableSizes[i];

                await expectThrow(
                    mintBlock(land, accounts[0], size, 0, 0, {
                        from: landAdmin,
                        gas,
                    })
                );
            }
        });

        t.test('Should not mint if not SuperOperator', async () => {
            await expectThrow(
                mintBlock(land, accounts[1], 1, 0, 0, {
                    from: accounts[1],
                    gas,
                }),
            );
        });
    });
}

module.exports = {
    runQuadTreeTests,
};
