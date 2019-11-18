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

        t.test('transferQuad 1x1 of non minted fails', async (t) => {
            const x = 311;
            const y = 295;
            const size = 1;
            await expectThrow(tx(land, 'transferQuad', {from: user0, gas: 8000000}, user0, user1, size, x, y, emptyBytes));
        });

        t.test('transferQuad 6x6 of non minted fails', async (t) => {
            const x = 312;
            const y = 294;
            const size = 6;
            await expectThrow(tx(land, 'transferQuad', {from: user0, gas: 8000000}, user0, user1, size, x, y, emptyBytes));
        });

        t.test('transferQuad of non minted fails', async (t) => {
            const x = 312;
            const y = 288;
            const size = 24;
            await expectThrow(tx(land, 'transferQuad', {from: user0, gas: 8000000}, user0, user1, size, x, y, emptyBytes));
        });

        t.test('transferQuad subset of a higher quad with one approved to someone else', async (t) => {
            const px = 312;
            const py = 288;
            const psize = 24;
            await mintQuad(land, user0, psize, px, py, {
                from: landMinter,
                gas,
            });
            const x = px + 12;
            const y = py + 18;
            const size = 6;
            await tx(land, 'approve', {from: user0, gas: 8000000}, user2, landId(x + 1, y + 1));
            const receipt = await tx(land, 'transferQuad', {from: user0, gas: 8000000}, user0, user1, size, x, y, emptyBytes);
            console.log('gasUsed for formed transferQuad 6x6 = ' + receipt.gasUsed);
            const balance = await balanceOf(land, user1);
            assert.equal(balance, size * size, 'user balance is wrong');
            for (let ix = x; ix < x + size; ix++) {
                for (let iy = y; iy < y + size; iy++) {
                    const tokenId = landId(ix, iy);
                    const ownerOfToken = await call(land, 'ownerOf', null, tokenId);
                    assert.equal(ownerOfToken, user1);
                }
            }
            for (let ix = px; ix < px + psize; ix++) {
                for (let iy = py; iy < py + psize; iy++) {
                    if ((ix < x || ix >= x + size) && (iy < y || iy >= y + size)) {
                        const tokenId = landId(ix, iy);
                        const ownerOfToken = await call(land, 'ownerOf', null, tokenId);
                        assert.equal(ownerOfToken, user0);
                    }
                }
            }
        });

        t.test('transferQuad subset of a higher quad', async (t) => {
            const px = 312;
            const py = 288;
            const psize = 24;
            await mintQuad(land, user0, psize, px, py, {
                from: landMinter,
                gas,
            });
            const x = px + 12;
            const y = py + 18;
            const size = 6;
            const receipt = await tx(land, 'transferQuad', {from: user0, gas: 8000000}, user0, user1, size, x, y, emptyBytes);
            console.log('gasUsed for formed transferQuad 6x6 = ' + receipt.gasUsed);
            const balance = await balanceOf(land, user1);
            assert.equal(balance, size * size, 'user balance is wrong');
            for (let ix = x; ix < x + size; ix++) {
                for (let iy = y; iy < y + size; iy++) {
                    const tokenId = landId(ix, iy);
                    const ownerOfToken = await call(land, 'ownerOf', null, tokenId);
                    assert.equal(ownerOfToken, user1);
                }
            }
            for (let ix = px; ix < px + psize; ix++) {
                for (let iy = py; iy < py + psize; iy++) {
                    if ((ix < x || ix >= x + size) && (iy < y || iy >= y + size)) {
                        const tokenId = landId(ix, iy);
                        const ownerOfToken = await call(land, 'ownerOf', null, tokenId);
                        assert.equal(ownerOfToken, user0);
                    }
                }
            }
        });

        t.test('transferQuad subset whose individual owner is from', async (t) => {
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
            }
            const receipt = await tx(land, 'transferQuad', {from: user1, gas: 8000000}, user1, user2, size, x, y, emptyBytes);
            console.log('gasUsed for fully broken transferQuad = ' + receipt.gasUsed);
            const balance = await balanceOf(land, user2);
            assert.equal(balance, size * size, 'user balance is wrong');
            for (let ix = x; ix < x + size; ix++) {
                for (let iy = y; iy < y + size; iy++) {
                    const tokenId = landId(ix, iy);
                    const ownerOfToken = await call(land, 'ownerOf', null, tokenId); // check the land at the extreme boundary
                    if (ownerOfToken != user2) {
                        console.log(tokenId);
                    }
                    assert.equal(ownerOfToken, user2);
                }
            }
        });

        // TODO :
        //t.test('transfering to a contract that check for adjency shoudl succeed', async () => {
        //    const x = 24;
        //    const y = 48;
        //    const size = 24;
        //    await mintQuad(land, user0, size, x, y, {
        //        from: landMinter,
        //        gas,
        //    });

        //    const receiverContract = await deployContract(user0, 'TestAdjacentLandReceiver', land.options.address);
        //    const receiverAddress = receiverContract.options.address;
        //    await tx(land, 'transferQuad', {from: user0, gas}, user0, receiverAddress, x, y, size, emptyBytes);
        //});

        t.test('transferQuad subset whose individual owner is from but higher quad is different', async (t) => {
            const px = 24;
            const py = 48;
            const psize = 24;
            await mintQuad(land, user0, psize, px, py, {
                from: landMinter,
                gas,
            });

            const x = px + 12;
            const y = py;
            const size = 12;
            for (let ix = x; ix < x + size; ix++) {
                const landIdsToTransfer = [];
                for (let iy = y; iy < y + size; iy++) {
                    landIdsToTransfer.push(landId(ix, iy));
                }
                await tx(land, 'batchTransferFrom', {from: user0, gas: 8000000}, user0, user1, landIdsToTransfer, emptyBytes);
            }
            await tx(land, 'transferQuad', {from: user1, gas: 8000000}, user1, user2, size, x, y, emptyBytes);
            const balance = await balanceOf(land, user2);
            assert.equal(balance, size * size, 'user balance is wrong');
            for (let ix = x; ix < x + size; ix++) {
                for (let iy = y; iy < y + size; iy++) {
                    const tokenId = landId(ix, iy);
                    const ownerOfToken = await call(land, 'ownerOf', null, tokenId); // check the land at the extreme boundary
                    if (ownerOfToken != user2) {
                        console.log(tokenId);
                    }
                    assert.equal(ownerOfToken, user2);
                }
            }
        });

        t.test('transferQuad subset whose individual owner is from but 2 level higher quad is different', async (t) => {
            const px = 24;
            const py = 48;
            const psize = 24;
            await mintQuad(land, user0, psize, px, py, {
                from: landMinter,
                gas,
            });

            const x = px + 18;
            const y = py + 6;
            const size = 6;
            for (let ix = x; ix < x + size; ix++) {
                const landIdsToTransfer = [];
                for (let iy = y; iy < y + size; iy++) {
                    landIdsToTransfer.push(landId(ix, iy));
                }
                await tx(land, 'batchTransferFrom', {from: user0, gas: 8000000}, user0, user1, landIdsToTransfer, emptyBytes);
            }
            await tx(land, 'transferQuad', {from: user1, gas: 8000000}, user1, user2, size, x, y, emptyBytes);
            const balance = await balanceOf(land, user2);
            assert.equal(balance, size * size, 'user balance is wrong');
            for (let ix = x; ix < x + size; ix++) {
                for (let iy = y; iy < y + size; iy++) {
                    const tokenId = landId(ix, iy);
                    const ownerOfToken = await call(land, 'ownerOf', null, tokenId); // check the land at the extreme boundary
                    if (ownerOfToken != user2) {
                        console.log(tokenId);
                    }
                    assert.equal(ownerOfToken, user2);
                }
            }
        });

        t.test('REVERT: transferQuad subset whose individual owner is from (except one)', async (t) => {
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
                    if (!(ix === 23 && iy === 23)) { // skip last
                        landIdsToTransfer.push(landId(x + ix, y + iy));
                    }
                }
                await tx(land, 'batchTransferFrom', {from: user0, gas: 8000000}, user0, user1, landIdsToTransfer, emptyBytes);
            }
            await expectThrow(tx(land, 'transferQuad', {from: user1, gas: 8000000}, user1, user2, size, x, y, emptyBytes));
        });

        t.test('REVERT: transferQuad subset whose individual owner is from (except one) but higher quad is different', async (t) => {
            const px = 24;
            const py = 48;
            const psize = 24;
            await mintQuad(land, user0, psize, px, py, {
                from: landMinter,
                gas,
            });

            const x = px + 12;
            const y = py;
            const size = 12;
            for (let ix = x; ix < x + size; ix++) {
                const landIdsToTransfer = [];
                for (let iy = y; iy < y + size; iy++) {
                    if (!(ix === x + size - 1 && iy === y + size - 1)) { // skip last
                        landIdsToTransfer.push(landId(ix, iy));
                    }
                }
                await tx(land, 'batchTransferFrom', {from: user0, gas: 8000000}, user0, user1, landIdsToTransfer, emptyBytes);
            }
            await expectThrow(tx(land, 'transferQuad', {from: user1, gas: 8000000}, user1, user2, size, x, y, emptyBytes));
        });

        t.test('REVERT: transferQuad subset whose individual owner is from (except one) but 2 level higher quad is different', async (t) => {
            const px = 24;
            const py = 48;
            const psize = 24;
            await mintQuad(land, user0, psize, px, py, {
                from: landMinter,
                gas,
            });

            const x = px + 18;
            const y = py + 6;
            const size = 6;
            for (let ix = x; ix < x + size; ix++) {
                const landIdsToTransfer = [];
                for (let iy = y; iy < y + size; iy++) {
                    if (!(ix === x + size - 1 && iy === y + size - 1)) { // skip last
                        landIdsToTransfer.push(landId(ix, iy));
                    }
                }
                await tx(land, 'batchTransferFrom', {from: user0, gas: 8000000}, user0, user1, landIdsToTransfer, emptyBytes);
            }
            await expectThrow(tx(land, 'transferQuad', {from: user1, gas: 8000000}, user1, user2, size, x, y, emptyBytes));
        });

        t.test('transferQuad 1x1 of a higher quad', async (t) => {
            const px = 312;
            const py = 288;
            const psize = 12;
            await mintQuad(land, user0, psize, px, py, {
                from: landMinter,
                gas,
            });
            const x = px + 7;
            const y = py + 2;
            const size = 1;
            const receipt = await tx(land, 'transferQuad', {from: user0, gas: 8000000}, user0, user1, size, x, y, emptyBytes);
            console.log('gasUsed for formed transferQuad 1x1 = ' + receipt.gasUsed);
            const balance = await balanceOf(land, user1);
            assert.equal(balance, size * size, 'user balance is wrong');
            for (let ix = x; ix < x + size; ix++) {
                for (let iy = y; iy < y + size; iy++) {
                    const tokenId = landId(ix, iy);
                    const ownerOfToken = await call(land, 'ownerOf', null, tokenId);
                    assert.equal(ownerOfToken, user1);
                }
            }
            for (let ix = px; ix < px + psize; ix++) {
                for (let iy = py; iy < py + psize; iy++) {
                    if ((ix < x || ix >= x + size) && (iy < y || iy >= y + size)) {
                        const tokenId = landId(ix, iy);
                        const ownerOfToken = await call(land, 'ownerOf', null, tokenId);
                        assert.equal(ownerOfToken, user0);
                    }
                }
            }
        });

        t.test('batchTransferQuad 12x12+ 2* 6x6', async (t) => {
            const px = 312;
            const py = 288;
            const psize = 24;
            await mintQuad(land, user0, psize, px, py, {
                from: landMinter,
                gas,
            });
            const sizes = [12, 6, 6];
            const xs = [px + 12, px + 6, px + 12];
            const ys = [py, py, py + 12];
            const receipt = await tx(land, 'batchTransferQuad', {from: user0, gas: 8000000}, user0, user1,
                sizes,
                xs,
                ys,
                emptyBytes
            );
            console.log('gasUsed for 12x12+ 2* 6x6 batchTransferQuad = ' + receipt.gasUsed);
            const balance = await balanceOf(land, user1);
            assert.equal(balance, (12 * 12) + (2 * (6 * 6)), 'user balance is wrong');
            for (let j = 0; j < sizes.length; j++) {
                for (let ix = xs[j]; ix < sizes[j]; ix++) {
                    for (let iy = ys[j]; iy < sizes[j]; iy++) {
                        const tokenId = landId(ix, iy);
                        const ownerOfToken = await call(land, 'ownerOf', null, tokenId); // check the land at the extreme boundary
                        assert.equal(ownerOfToken, user1);
                    }
                }
            }
        });

        t.test('batchTransferQuad 12x12 from a block of 24x24', async (t) => {
            const px = 312;
            const py = 288;
            const psize = 24;
            await mintQuad(land, user0, psize, px, py, {
                from: landMinter,
                gas,
            });
            const sizes = [12];
            const xs = [px + 12];
            const ys = [py];
            const receipt = await tx(land, 'batchTransferQuad', {from: user0, gas: 8000000}, user0, user1,
                sizes,
                xs,
                ys,
                emptyBytes
            );
            console.log('gasUsed for 12x12 batchTransferQuad = ' + receipt.gasUsed);
        });

        t.test('transferQuad 12x12 from a block of 24x24', async (t) => {
            const px = 312;
            const py = 288;
            const psize = 24;
            await mintQuad(land, user0, psize, px, py, {
                from: landMinter,
                gas,
            });
            const receipt = await tx(land, 'transferQuad', {from: user0, gas: 8000000}, user0, user1,
                12,
                px + 12,
                py,
                emptyBytes
            );
            console.log('gasUsed for 12x12 transferQuad = ' + receipt.gasUsed);
        });

        t.test('batchTransferFrom 12x12 from broken 12x12', async (t) => {
            const px = 312;
            const py = 288;
            const psize = 12;
            await mintQuad(land, user0, psize, px, py, {
                from: landMinter,
                gas,
            });
            const allLands = [];
            for (let ix = 0; ix < psize; ix++) {
                const landIdsToTransfer = [];
                for (let iy = 0; iy < psize; iy++) {
                    const landIdToTransfer = landId(px + ix, py + iy);
                    landIdsToTransfer.push(landIdToTransfer);
                    allLands.push(landIdToTransfer);
                }
                await tx(land, 'batchTransferFrom', {from: user0, gas: 8000000}, user0, user1, landIdsToTransfer, emptyBytes);
                await tx(land, 'batchTransferFrom', {from: user1, gas: 8000000}, user1, user0, landIdsToTransfer, emptyBytes);
            }
            const receipt = await tx(land, 'batchTransferFrom', {from: user0, gas: 8000000}, user0, user1, allLands, emptyBytes);
            console.log('gasUsed for 12x12 batchTransferFrom from broken quad = ' + receipt.gasUsed);
        });

        t.test('batchTransferFrom 12x12 from broken 12x12 with from = to', async (t) => {
            const px = 312;
            const py = 288;
            const psize = 12;
            await mintQuad(land, user0, psize, px, py, {
                from: landMinter,
                gas,
            });
            const allLands = [];
            for (let ix = 0; ix < psize; ix++) {
                const landIdsToTransfer = [];
                for (let iy = 0; iy < psize; iy++) {
                    const landIdToTransfer = landId(px + ix, py + iy);
                    landIdsToTransfer.push(landIdToTransfer);
                    allLands.push(landIdToTransfer);
                }
                await tx(land, 'batchTransferFrom', {from: user0, gas: 8000000}, user0, user1, landIdsToTransfer, emptyBytes);
                await tx(land, 'batchTransferFrom', {from: user1, gas: 8000000}, user1, user0, landIdsToTransfer, emptyBytes);
            }
            const receipt = await tx(land, 'batchTransferFrom', {from: user0, gas: 8000000}, user0, user0, allLands, emptyBytes);
            console.log('gasUsed for 12x12 batchTransferFrom (from == to) from broken quad = ' + receipt.gasUsed);
        });

        t.test('batchTransferFrom 24x24 from broken 24x24', async (t) => {
            const px = 312;
            const py = 288;
            const psize = 24;
            await mintQuad(land, user0, psize, px, py, {
                from: landMinter,
                gas,
            });
            const allLands = [];
            for (let ix = 0; ix < psize; ix++) {
                const landIdsToTransfer = [];
                for (let iy = 0; iy < psize; iy++) {
                    const landIdToTransfer = landId(px + ix, py + iy);
                    landIdsToTransfer.push(landIdToTransfer);
                    allLands.push(landIdToTransfer);
                }
                await tx(land, 'batchTransferFrom', {from: user0, gas: 8000000}, user0, user1, landIdsToTransfer, emptyBytes);
                await tx(land, 'batchTransferFrom', {from: user1, gas: 8000000}, user1, user0, landIdsToTransfer, emptyBytes);
            }
            const receipt = await tx(land, 'batchTransferFrom', {from: user0, gas: 20000000}, user0, user1, allLands, emptyBytes);
            console.log('gasUsed for 24x24 batchTransferFrom from broken quad = ' + receipt.gasUsed);
        });

        t.test('batchTransferFrom 24x24 from broken 24x24 with from = to', async (t) => {
            const px = 312;
            const py = 288;
            const psize = 24;
            await mintQuad(land, user0, psize, px, py, {
                from: landMinter,
                gas,
            });
            const allLands = [];
            for (let ix = 0; ix < psize; ix++) {
                const landIdsToTransfer = [];
                for (let iy = 0; iy < psize; iy++) {
                    const landIdToTransfer = landId(px + ix, py + iy);
                    landIdsToTransfer.push(landIdToTransfer);
                    allLands.push(landIdToTransfer);
                }
                await tx(land, 'batchTransferFrom', {from: user0, gas: 8000000}, user0, user1, landIdsToTransfer, emptyBytes);
                await tx(land, 'batchTransferFrom', {from: user1, gas: 8000000}, user1, user0, landIdsToTransfer, emptyBytes);
            }
            const receipt = await tx(land, 'batchTransferFrom', {from: user0, gas: 20000000}, user0, user0, allLands, emptyBytes);
            console.log('gasUsed for 24x24 batchTransferFrom (from == to) from broken quad = ' + receipt.gasUsed);
        });

        t.test('batchTransferFrom 12x12 from unbroken quad', async (t) => {
            const px = 312;
            const py = 288;
            const psize = 12;
            await mintQuad(land, user0, psize, px, py, {
                from: landMinter,
                gas,
            });
            const allLands = [];
            for (let ix = 0; ix < psize; ix++) {
                for (let iy = 0; iy < psize; iy++) {
                    const landIdToTransfer = landId(px + ix, py + iy);
                    allLands.push(landIdToTransfer);
                }
            }
            const receipt = await tx(land, 'batchTransferFrom', {from: user0, gas: 8000000}, user0, user1, allLands, emptyBytes);
            console.log('gasUsed for 12x12 batchTransferFrom from unbroken quad = ' + receipt.gasUsed);
        });

        t.test('batchTransferFrom 12x12 from unbroken quad (from == to)', async (t) => {
            const px = 312;
            const py = 288;
            const psize = 12;
            await mintQuad(land, user0, psize, px, py, {
                from: landMinter,
                gas,
            });
            const allLands = [];
            for (let ix = 0; ix < psize; ix++) {
                for (let iy = 0; iy < psize; iy++) {
                    const landIdToTransfer = landId(px + ix, py + iy);
                    allLands.push(landIdToTransfer);
                }
            }
            const receipt = await tx(land, 'batchTransferFrom', {from: user0, gas: 8000000}, user0, user0, allLands, emptyBytes);
            console.log('gasUsed for 12x12 batchTransferFrom from unbroken quad (from == to) = ' + receipt.gasUsed);
        });

        t.test('batchTransferFrom 24x24 from unbroken quad', async (t) => {
            const px = 312;
            const py = 288;
            const psize = 24;
            await mintQuad(land, user0, psize, px, py, {
                from: landMinter,
                gas,
            });
            const allLands = [];
            for (let ix = 0; ix < psize; ix++) {
                for (let iy = 0; iy < psize; iy++) {
                    const landIdToTransfer = landId(px + ix, py + iy);
                    allLands.push(landIdToTransfer);
                }
            }
            const receipt = await tx(land, 'batchTransferFrom', {from: user0, gas: 20000000}, user0, user1, allLands, emptyBytes);
            console.log('gasUsed for 24x24 batchTransferFrom from unbroken quad = ' + receipt.gasUsed);
        });

        t.test('batchTransferFrom 24x24 from unbroken quad (from == to)', async (t) => {
            const px = 312;
            const py = 288;
            const psize = 24;
            await mintQuad(land, user0, psize, px, py, {
                from: landMinter,
                gas,
            });
            const allLands = [];
            for (let ix = 0; ix < psize; ix++) {
                for (let iy = 0; iy < psize; iy++) {
                    const landIdToTransfer = landId(px + ix, py + iy);
                    allLands.push(landIdToTransfer);
                }
            }
            const receipt = await tx(land, 'batchTransferFrom', {from: user0, gas: 20000000}, user0, user0, allLands, emptyBytes);
            console.log('gasUsed for 24x24 batchTransferFrom from unbroken quad (from == to) = ' + receipt.gasUsed);
        });

        t.test('batchTransferQuad 6x6+ 2* 3x3 + 1x1', async (t) => {
            const px = 312;
            const py = 288;
            const psize = 12;
            await mintQuad(land, user0, psize, px, py, {
                from: landMinter,
                gas,
            });
            const sizes = [3, 6, 1, 3];
            const xs = [px + 3, px + 6, px + 2, px + 3];
            const ys = [py + 6, py + 6, py + 3, py + 3];
            const receipt = await tx(land, 'batchTransferQuad', {from: user0, gas: 8000000}, user0, user1,
                sizes,
                xs,
                ys,
                emptyBytes
            );
            console.log('gasUsed for 6x6+ 2* 3x3 + 1x1 batchTransferQuad = ' + receipt.gasUsed);
            const balance = await balanceOf(land, user1);
            const numTokensTransfered = (6 * 6) + (2 * (3 * 3)) + 1;
            assert.equal(balance, numTokensTransfered, 'user balance is wrong');

            const eventsMatching = await getEventsFromReceipt(land, TransferEvent, receipt);
            assert.equal(eventsMatching.length, numTokensTransfered, 'number of transfer event should match');

            const tokens = {};
            for (let ix = px; ix < psize; ix++) {
                for (let iy = py; iy < psize; iy++) {
                    const tokenId = landId(ix, iy);
                    tokens[tokenId] = user0;
                }
            }
            for (let j = 0; j < sizes.length; j++) {
                for (let ix = xs[j]; ix < sizes[j]; ix++) {
                    for (let iy = ys[j]; iy < sizes[j]; iy++) {
                        const tokenId = landId(ix, iy);
                        tokens[tokenId] = user1;
                    }
                }
            }

            for (const tokenId of Object.keys(tokens)) {
                const ownerOfToken = await call(land, 'ownerOf', null, tokenId); // check the land at the extreme boundary
                assert.equal(ownerOfToken, tokens[tokenId]);
            }
        });

        t.test('REVERT: batchTransferQuad 6x6 + 1x1 + 2* 3x3  overlap', async (t) => {
            const px = 312;
            const py = 288;
            const psize = 12;
            await mintQuad(land, user0, psize, px, py, {
                from: landMinter,
                gas,
            });
            const sizes = [3, 6, 1, 3];
            const xs = [px + 3, px + 6, px + 3, px + 3];
            const ys = [py + 6, py + 6, py + 3, py + 3];
            await expectThrow(tx(land, 'batchTransferQuad', {from: user0, gas: 8000000}, user0, user1,
                sizes,
                xs,
                ys,
                emptyBytes
            ));
        });

        t.test('REVERT: batchTransferQuad 6x6 + 1x1 + 2* 3x3  overlap even from=to', async (t) => {
            const px = 312;
            const py = 288;
            const psize = 12;
            await mintQuad(land, user0, psize, px, py, {
                from: landMinter,
                gas,
            });
            const sizes = [3, 6, 1, 3];
            const xs = [px + 3, px + 6, px + 3, px + 3];
            const ys = [py + 6, py + 6, py + 3, py + 3];
            await expectThrow(tx(land, 'batchTransferQuad', {from: user0, gas: 8000000}, user0, user0,
                sizes,
                xs,
                ys,
                emptyBytes
            ));
        });

        t.test('REVERT: batchTransferQuad 6x6 + 2* 3x3 + 1x1  overlap', async (t) => {
            const px = 312;
            const py = 288;
            const psize = 12;
            await mintQuad(land, user0, psize, px, py, {
                from: landMinter,
                gas,
            });
            const sizes = [3, 6, 3, 1];
            const xs = [px + 3, px + 6, px + 3, px + 3];
            const ys = [py + 6, py + 6, py + 3, py + 3];
            await expectThrow(tx(land, 'batchTransferQuad', {from: user0, gas: 8000000}, user0, user1,
                sizes,
                xs,
                ys,
                emptyBytes
            ));
        });

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

        t.skip('Quad 1x1 minting all over the grid', async (t) => {
            for (let x = 0; x < gridSize; x += 1) {
                for (let y = 0; y < gridSize; y += 1) {
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

        t.skip('Quad 24x24 minting all over the grid', async (t) => {
            for (let x = 0; x < gridSize; x += 24) {
                for (let y = 0; y < gridSize; y += 24) {
                    const size = 24;

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

        t.test('full Quad 24x24 minting all over the grid', async (t) => {
            for (let x = 0; x < gridSize; x += 24) {
                for (let y = 0; y < gridSize; y += 24) {
                    const size = 24;

                    await mintQuad(land, user0, size, x, y, {
                        from: landMinter,
                        gas,
                    });
                }
            }
            const balance = await balanceOf(land, user0);
            assert.equal(balance, gridSize * gridSize, 'user balance is wrong');
        });

        t.skip('Quad 12x12 minting all over the grid', async (t) => {
            for (let x = 0; x < gridSize; x += 12) {
                for (let y = 0; y < gridSize; y += 12) {
                    const size = 24;

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
