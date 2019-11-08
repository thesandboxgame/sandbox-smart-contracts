const tap = require('tap');
const rocketh = require('rocketh');
const {assert} = require('chai');

const {
    balanceOf,
    TransferEvent,
} = require('../erc721');

const {
    getEventsFromReceipt,
    tx,
    call,
    gas,
    expectThrow,
    emptyBytes
} = require('../utils');

const {
    namedAccounts,
} = rocketh;

const {
    others
} = namedAccounts;

const user0 = others[0];
const user1 = others[1];
const user2 = others[2];

const availableSizes = [1, 3, 6, 12, 24];
const gridSize = 408;

async function mintQuad(contract, to, size, x, y, options) {
    return contract.methods.mintQuad(to, size, x, y).send(options);
}

function landId(x, y) {
    return x + (y * gridSize);
}

function landIds(x, y, size) {
    const arr = [];
    for (let xi = x; xi < x + size; xi++) {
        for (let yi = y; yi < y + size; yi++) {
            arr.push(landId(xi, yi));
        }
    }
    return arr;
}

function runQuadTreeTests(title, landDeployer) {
    const landMinter = landDeployer.minter;
    tap.test(title + ' : Quad Tree tests ', async (t) => {
        // t.runOnly = true;
        let land;

        t.beforeEach(async () => {
            land = await landDeployer.resetContract();
        });

        // cannot be done in one quad
        // t.test('24 x 24 batch transfer', async (t) => {
        //     const size = 24;
        //     await mintQuad(land, user0, size, 0, 0, {
        //         from: landMinter,
        //         gas,
        //     });
        //     await tx(land, 'batchTransferFrom', {from: user0, gas: 8000000}, user0, user1, landIds(0, 0, size));
        //     const balance = await balanceOf(land, user1);
        //     assert.equal(balance, size * size, 'user balance is wrong');
        // });

        // TODO
        // t.test('24 x 24 quad transfer', async (t) => {
        //     const size = 24;
        //     await mintQuad(land, user0, size, 0, 0, {
        //         from: landMinter,
        //         gas,
        //     });
        //     await tx(land, 'transferQuad', {from: user0, gas: 8000000}, user0, user1, size, 0, 0);
        //     const balance = await balanceOf(land, user1);
        //     assert.equal(balance, size * size, 'user balance is wrong');
        // });

        t.test('already formed 24 x 24 transferQuad', async (t) => {
            const x = 312;
            const y = 288;
            const size = 24;
            await mintQuad(land, user0, size, x, y, {
                from: landMinter,
                gas,
            });
            const receipt = await tx(land, 'transferQuad', {from: user0, gas: 8000000}, user0, user1, size, x, y, emptyBytes);
            console.log('gasUsed for formed transferQuad = ' + receipt.gasUsed);
            const balance = await balanceOf(land, user1);
            assert.equal(balance, size * size, 'user balance is wrong');
            for (let ix = x; ix < size; ix++) {
                for (let iy = y; iy < size; iy++) {
                    const tokenId = landId(ix, iy);
                    const ownerOfToken = await call(land, 'ownerOf', null, tokenId); // check the land at the extreme boundary
                    assert.equal(ownerOfToken, user1);
                }
            }
        });

        t.test('broken 24 x 24 transferQuad', async (t) => {
            const x = 384;
            const y = 360;
            const size = 24;
            await mintQuad(land, user0, size, x, y, {
                from: landMinter,
                gas,
            });
            // await tx(land, 'transferFrom', {from: user0, gas: 8000000}, user0, user1, landId(1, 1));
            // await tx(land, 'transferFrom', {from: user1, gas: 8000000}, user1, user0, landId(1, 1));
            const landIdsToTransfer = [
                landId(x + 1, y + 1),
                landId(x + 23, y + 23),
                landId(x + 6, y + 5),
                landId(x + 15, y + 15),
            ];
            await tx(land, 'batchTransferFrom', {from: user0, gas: 8000000}, user0, user1, landIdsToTransfer, emptyBytes);
            await tx(land, 'batchTransferFrom', {from: user1, gas: 8000000}, user1, user0, landIdsToTransfer, emptyBytes);
            const receipt = await tx(land, 'transferQuad', {from: user0, gas: 8000000}, user0, user1, size, x, y, emptyBytes);
            console.log('gasUsed for broken transferQuad = ' + receipt.gasUsed);
            const balance = await balanceOf(land, user1);
            assert.equal(balance, size * size, 'user balance is wrong');
            for (let ix = x; ix < x + size; ix++) {
                for (let iy = y; iy < y + size; iy++) {
                    const tokenId = landId(ix, iy);
                    let ownerOfToken;
                    try {
                        ownerOfToken = await call(land, 'ownerOf', null, tokenId);
                    } catch (e) {
                        console.error('tokenID not exist ' + tokenId, ix, iy);
                    }

                    if (ownerOfToken != user1) {
                        console.error('tokenID not correct owner ' + tokenId, ix, iy);
                    }
                    assert.equal(ownerOfToken, user1);
                }
            }
        });

        t.test('REVERT : 3 x 3 transferQuad with top quad non-owner', async (t) => {
            const x = 384;
            const y = 360;
            const size = 24;
            await mintQuad(land, user0, size, x, y, {
                from: landMinter,
                gas,
            });
            const landIdsToTransfer = [
                landId(x + 23, y + 23),
            ];
            await tx(land, 'batchTransferFrom', {from: user0, gas: 8000000}, user0, user1, landIdsToTransfer, emptyBytes);
            await expectThrow(tx(land, 'transferQuad', {from: user1, gas: 8000000}, user1, user2, 3, x + 21, y + 21, emptyBytes));
        });

        t.test('REVERT : 24 x 24 transferQuad with one quad non-owner', async (t) => {
            const x = 384;
            const y = 360;
            const size = 24;
            await mintQuad(land, user0, size, x, y, {
                from: landMinter,
                gas,
            });
            await tx(land, 'transferQuad', {from: user0, gas: 8000000}, user0, user1, 3, x + 21, y + 21, emptyBytes);
            await expectThrow(tx(land, 'transferQuad', {from: user0, gas: 8000000}, user0, user1, size, x, y, emptyBytes));
        });

        t.test('fully broken 24 x 24 transferQuad', async (t) => {
            const x = 24;
            const y = 48;
            const size = 24;
            await mintQuad(land, user0, size, x, y, {
                from: landMinter,
                gas,
            });

            for (let ix = 0; ix < 24; ix++) {
                const landIdsToTransfer = [];
                for (let iy = 0; iy < 24; iy++) {
                    landIdsToTransfer.push(landId(x + ix, y + iy));
                }
                await tx(land, 'batchTransferFrom', {from: user0, gas: 8000000}, user0, user1, landIdsToTransfer, emptyBytes);
                await tx(land, 'batchTransferFrom', {from: user1, gas: 8000000}, user1, user0, landIdsToTransfer, emptyBytes);
            }
            const receipt = await tx(land, 'transferQuad', {from: user0, gas: 8000000}, user0, user1, size, x, y, emptyBytes);
            console.log('gasUsed for fully broken transferQuad = ' + receipt.gasUsed);
            const balance = await balanceOf(land, user1);
            assert.equal(balance, size * size, 'user balance is wrong');
            for (let ix = x; ix < x + size; ix++) {
                for (let iy = y; iy < y + size; iy++) {
                    const tokenId = landId(ix, iy);
                    const ownerOfToken = await call(land, 'ownerOf', null, tokenId); // check the land at the extreme boundary
                    if (ownerOfToken != user1) {
                        console.log(tokenId);
                    }
                    assert.equal(ownerOfToken, user1);
                }
            }
        });

        t.test('Quad minting with correct sizes', async (t) => {
            for (let i = 0; i < availableSizes.length; i += 1) {
                const size = availableSizes[i];

                t.test(`Should mint a ${size}x${size} quad for user`, async () => {
                    await mintQuad(land, user0, size, 0, 0, {
                        from: landMinter,
                        gas,
                    });

                    const balance = await balanceOf(land, user0);
                    assert.equal(balance, size * size, 'user balance is wrong');

                    const tokenId = landId(size - 1, size - 1);
                    const ownerOfToken = await call(land, 'ownerOf', null, tokenId); // check the land at the extreme boundary
                    assert.equal(ownerOfToken, user0);
                });
            }
        });

        t.test('Quad minting all over the grid', {
            skip: true,
        }, async (t) => {
            for (let x = 0; x < gridSize - 1; x += 1) {
                for (let y = 0; y < gridSize - 1; y += 1) {
                    const size = 1;

                    t.test(`Should mint a ${size}x${size} quad for user at ${x} ${y}`, async () => {
                        await mintQuad(land, user0, size, x, y, {
                            from: landMinter,
                            gas,
                        });

                        const balance = await balanceOf(land, user0);
                        assert.equal(balance, size * size, 'user balance is wrong');
                    });
                }
            }
        });

        t.test('No quad minting with incorrect sizes', async (t) => {
            for (let i = 0; i < 30; i += 1) {
                const size = i;

                if (!availableSizes.includes(size)) {
                    t.test(`Should not mint a ${size}x${size} quad for user`, async () => {
                        await expectThrow(
                            mintQuad(land, user0, size, 0, 0, {
                                from: landMinter,
                                gas,
                            }),
                        );

                        const balance = await balanceOf(land, user0);
                        assert.equal(balance, 0, 'user balance is wrong');
                    });
                }
            }
        });

        t.test('No quad minting outside of the bounds', async () => {
            await expectThrow(
                mintQuad(land, user0, 1, 408, 408, {
                    from: landMinter,
                    gas,
                }),
            );

            const balance = await balanceOf(land, user0);
            assert.equal(balance, 0, 'user balance is wrong');
        });

        t.test('No quad minting if not enough space', async () => {
            await expectThrow(
                mintQuad(land, user0, 3, 407, 407, {
                    from: landMinter,
                    gas,
                }),
            );

            const balance = await balanceOf(land, user0);
            assert.equal(balance, 0, 'user balance is wrong');
        });

        t.test('Should not mint a land on top of another one (from small size to big)', async () => {
            await mintQuad(land, user0, 1, 0, 0, {
                from: landMinter,
                gas,
            });

            for (let i = 0; i < availableSizes.length; i += 1) {
                const size = availableSizes[i];

                await expectThrow(
                    mintQuad(land, user0, size, 0, 0, {
                        from: landMinter,
                        gas,
                    })
                );
            }
        });

        t.test('can transfer multiple Land and still preserve original Land owner for the rest of the quad', async () => {
            await mintQuad(land, user0, 3, 3, 6, {
                from: landMinter,
                gas,
            });
            const tokenIds = [landId(4, 7), landId(4, 8), landId(3, 7)];
            const receipt = await tx(land, 'batchTransferFrom', {from: user0, gas}, user0, user1, tokenIds, emptyBytes);
            const eventsMatching = await getEventsFromReceipt(land, TransferEvent, receipt);
            assert.equal(eventsMatching.length, 3);
            const transferEvent = eventsMatching[0];
            assert.equal(transferEvent.returnValues[0], user0);
            assert.equal(transferEvent.returnValues[1], user1);
            assert.equal(transferEvent.returnValues[2], tokenIds[0]);

            const ownerOfTokenTransfered = await call(land, 'ownerOf', null, tokenIds[0]);
            assert.equal(ownerOfTokenTransfered, user1);
            const ownerOfAnotherPart = await call(land, 'ownerOf', null, landId(5, 8));
            assert.equal(ownerOfAnotherPart, user0);
        });

        t.test('can transfer one Land and still preserve other Land owner', async () => {
            await mintQuad(land, user0, 3, 3, 6, {
                from: landMinter,
                gas,
            });
            const tokenId = landId(4, 7);
            const receipt = await tx(land, 'transferFrom', {from: user0, gas}, user0, user1, tokenId);
            const eventsMatching = await getEventsFromReceipt(land, TransferEvent, receipt);
            assert.equal(eventsMatching.length, 1);
            const transferEvent = eventsMatching[0];
            assert.equal(transferEvent.returnValues[0], user0);
            assert.equal(transferEvent.returnValues[1], user1);
            assert.equal(transferEvent.returnValues[2], tokenId);

            const ownerOfTokenTransfered = await call(land, 'ownerOf', null, tokenId);
            assert.equal(ownerOfTokenTransfered, user1);
            const ownerOfAnotherPart = await call(land, 'ownerOf', null, landId(4, 8));
            assert.equal(ownerOfAnotherPart, user0);
        });

        t.test('Should not mint a land on top of another one (from big size to small)', async () => {
            await mintQuad(land, user0, 24, 0, 0, {
                from: landMinter,
                gas,
            });

            for (let i = availableSizes.length - 1; i >= 0; i -= 1) {
                const size = availableSizes[i];

                await expectThrow(
                    mintQuad(land, user0, size, 0, 0, {
                        from: landMinter,
                        gas,
                    })
                );
            }
        });

        t.test('Should not mint if not minter', async () => {
            await expectThrow(
                mintQuad(land, user1, 1, 0, 0, {
                    from: user1,
                    gas,
                }),
            );
        });
    });
}

module.exports = {
    runQuadTreeTests,
};
