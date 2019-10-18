const BN = require('bn.js');
const tap = require('tap');
const assert = require('assert');
const rocketh = require('rocketh');

const {
    getEventsFromReceipt,
    getPastEvents,
    tx,
    gas,
    call,
    zeroAddress,
    expectThrow,
    emptyBytes,
    deployContract,
    getBlockNumber,
} = require('./utils');

const {
    TransferEvent,
    ApprovalEvent,
    ApprovalForAllEvent,
} = require('./erc721');

const {
    namedAccounts,
    accounts,
} = rocketh;

const {
    others,
} = namedAccounts;

const user0 = others[0];
const user1 = others[1];
const user2 = others[2];
const user3 = others[3];

function runERC721tests(title, contractStore) {
    tap.test(title + ' as ERC721', async (t) => {
        let contract;
        let tokenIds;
        let tokenId;
        t.beforeEach(async () => {
            contract = await contractStore.resetContract();
            tokenIds = [];
            tokenIds.push(await contractStore.mintERC721(user0));
            tokenIds.push(await contractStore.mintERC721(user0));
            tokenIds.push(await contractStore.mintERC721(user0));
            tokenId = tokenIds[0];
        });

        t.test('invalid token', async (t) => {
            t.test('transfering a non existing NFT fails', async () => {
                await expectThrow(tx(contract, 'transferFrom', {from: user0, gas}, user0, user1, 10000000));
            });

            t.test('tx balanceOf a zero owner fails', async () => {
                await expectThrow(tx(contract, 'balanceOf', {from: user0, gas}, zeroAddress));
            });

            t.test('call balanceOf a zero owner fails', async () => {
                await expectThrow(call(contract, 'balanceOf', {from: user0, gas}, zeroAddress));
            });

            t.test('tx ownerOf a non existing NFT fails', async () => {
                await expectThrow(tx(contract, 'ownerOf', {from: user0, gas}, 1000000000));
            });

            t.test('call ownerOf a non existing NFT fails', async () => {
                await expectThrow(call(contract, 'ownerOf', {from: user0, gas}, 1000000000));
            });

            t.test('tx getApproved a non existing NFT fails', async () => {
                await expectThrow(tx(contract, 'getApproved', {from: user0, gas}, 1000000000));
            });

            t.test('call getApproved a non existing NFT fails', async () => {
                await expectThrow(call(contract, 'getApproved', {from: user0, gas}, 1000000000));
            });

            // not technically required by erc721 standard //////////////////////////////////////////////
            // t.test('call isApprovedForAll for a zero address as owner fails', async () => {
            //     await expectThrow(call(contract, 'isApprovedForAll', {from: user0, gas}, zeroAddress, user1));
            // });

            // t.test('tx isApprovedForAll for a zero address as owner fails', async () => {
            //     await expectThrow(tx(contract, 'isApprovedForAll', {from: user0, gas}, zeroAddress, user1));
            // });

            // t.test('call isApprovedForAll for a zero address as operator fails', async () => {
            //     await expectThrow(call(contract, 'isApprovedForAll', {from: user0, gas}, user1, zeroAddress));
            // });

            // t.test('tx isApprovedForAll for the zero address as operator fails', async () => {
            //     await expectThrow(tx(contract, 'isApprovedForAll', {from: user0, gas}, user1, zeroAddress));
            // });

            // t.test('call isApprovedForAll on zero addresses for both owner and operator fails', async () => {
            //     await expectThrow(call(contract, 'isApprovedForAll', {from: user0, gas}, zeroAddress, zeroAddress));
            // });

            // t.test('tx isApprovedForAll on zero addresses for both owner and operator fails', async () => {
            //     await expectThrow(tx(contract, 'isApprovedForAll', {from: user0, gas}, zeroAddress, zeroAddress));
            // });
            // ///////////////////////////////////////////////////////////////////////////////////////////////
        });

        t.test('balance', async (t) => {
            t.test('balance is zero for new user', async () => {
                const balance = await call(contract, 'balanceOf', null, user1);
                assert.equal(new BN(balance).toNumber(), 0);
            });

            t.test('balance return correct value', async () => {
                const balance = await call(contract, 'balanceOf', null, user1);
                assert.equal(new BN(balance).toNumber(), 0);

                await tx(contract, 'transferFrom', {from: user0, gas}, user0, user1, tokenIds[0]);
                let newbalance = await call(contract, 'balanceOf', null, user1);
                assert.equal(new BN(newbalance).toNumber(), 1);

                await tx(contract, 'transferFrom', {from: user0, gas}, user0, user1, tokenIds[1]);
                newbalance = await call(contract, 'balanceOf', null, user1);
                assert.equal(new BN(newbalance).toNumber(), 2);

                await tx(contract, 'transferFrom', {from: user1, gas}, user1, user2, tokenIds[0]);
                newbalance = await call(contract, 'balanceOf', null, user1);
                assert.equal(new BN(newbalance).toNumber(), 1);
            });
        });

        t.test('minting', async (t) => {
            t.test('mint result in a transfer from 0 event', async () => {
                const blockNumber = await getBlockNumber();
                const newTokenId = await contractStore.mintERC721(user0);
                const eventsMatching = await getPastEvents(contract, TransferEvent, {fromBlock: blockNumber + 1});
                assert.equal(eventsMatching.length, 1);
                const transferEvent = eventsMatching[0];
                assert.equal(transferEvent.returnValues[0], zeroAddress);
                assert.equal(transferEvent.returnValues[1], user0);
                assert.equal(transferEvent.returnValues[2], newTokenId);
            });

            // t.test('mint for zero address should fail', async () => {
            //     let thrown = false;
            //     try{
            //         await contractStore.mintERC721(zeroAddress);
            //     } catch(e) {
            //         thrown = true;
            //     }
            //     assert(thrown);
            // });

            t.test('mint for gives correct owner', async () => {
                const tokenId = await contractStore.mintERC721(user0);
                const owner = await call(contract, 'ownerOf', null, tokenId);
                assert.equal(owner, user0);
            });

            // mint 2 ids
        });

        if (contractStore.burnERC721) {
            t.test('burning', async (t) => {
                t.test('burn result in a transfer to 0 event', async () => {
                    const tokenId = await contractStore.mintERC721(user0);

                    const blockNumber = await getBlockNumber();
                    await contractStore.burnERC721(user0, tokenId);
                    const eventsMatching = await getPastEvents(contract, TransferEvent, {fromBlock: blockNumber + 1});
                    assert.equal(eventsMatching.length, 1);
                    const transferEvent = eventsMatching[0];
                    assert.equal(transferEvent.returnValues[0], user0);
                    assert.equal(transferEvent.returnValues[1], zeroAddress);
                    assert.equal(transferEvent.returnValues[2], tokenId);
                });
            });
        }

        t.test('transfers', async (t) => {
            t.test('transfering one NFT results in one erc721 transfer event', async () => {
                const receipt = await tx(contract, 'transferFrom', {from: user0, gas}, user0, user1, tokenId);
                const eventsMatching = await getEventsFromReceipt(contract, TransferEvent, receipt);
                assert.equal(eventsMatching.length, 1);
                const transferEvent = eventsMatching[0];
                assert.equal(transferEvent.returnValues[0], user0);
                assert.equal(transferEvent.returnValues[1], user1);
                assert.equal(transferEvent.returnValues[2], tokenId);
            });
            t.test('transfering one NFT change to correct owner', async () => {
                await tx(contract, 'transferFrom', {from: user0, gas}, user0, user1, tokenId);
                const newOwner = await call(contract, 'ownerOf', null, tokenId);
                assert.equal(newOwner, user1);
            });

            t.test('transfering one NFT increase new owner balance', async () => {
                const balanceBefore = await call(contract, 'balanceOf', null, user1);
                await tx(contract, 'transferFrom', {from: user0, gas}, user0, user1, tokenId);
                const balanceAfter = await call(contract, 'balanceOf', null, user1);
                assert(new BN(balanceBefore).add(new BN(1)).eq(new BN(balanceAfter)));
            });

            t.test('transfering one NFT decrease past owner balance', async () => {
                const balanceBefore = await call(contract, 'balanceOf', null, user0);
                await tx(contract, 'transferFrom', {from: user0, gas}, user0, user1, tokenId);
                const balanceAfter = await call(contract, 'balanceOf', null, user0);
                assert(new BN(balanceBefore).sub(new BN(1)).eq(new BN(balanceAfter)));
            });

            t.test('transfering from without approval should fails', async () => {
                await expectThrow(tx(contract, 'transferFrom', {from: user1, gas}, user0, user1, tokenId));
            });

            t.test('transfering to zero address should fails', async () => {
                await expectThrow(tx(contract, 'transferFrom', {from: user0, gas}, user0, zeroAddress, tokenId));
            });

            t.test('transfering to a contract that do not accept erc721 token should not fail', async () => {
                const receiverContract = await deployContract(user0, 'TestERC721TokenReceiver', contract.options.address, false, true);
                const receiverAddress = receiverContract.options.address;
                await tx(contract, 'transferFrom', {from: user0, gas}, user0, receiverAddress, tokenId);
                const newOwner = await call(contract, 'ownerOf', null, tokenId);
                assert.equal(newOwner, receiverAddress);
            });
        });

        function testSafeTransfers(data) {
            let safeTransferFrom = (operator, from, to, tokenId) => {
                return tx(contract, 'safeTransferFrom', {from: operator, gas}, from, to, tokenId);
            };

            if (data) {
                safeTransferFrom = (operator, from, to, tokenId) => {
                    return tx(contract, 'safeTransferFrom', {from: operator, gas}, from, to, tokenId, data);
                };
            }

            t.test('safe transfers ' + (data ? 'with data' : 'without data'), async (t) => {
                t.test('transfering one NFT results in one erc721 transfer event', async () => {
                    const receipt = await safeTransferFrom(user0, user0, user1, tokenId);
                    const eventsMatching = await getEventsFromReceipt(contract, TransferEvent, receipt);
                    assert.equal(eventsMatching.length, 1);
                    const transferEvent = eventsMatching[0];
                    assert.equal(transferEvent.returnValues[0], user0);
                    assert.equal(transferEvent.returnValues[1], user1);
                    assert.equal(transferEvent.returnValues[2], tokenId);
                });

                t.test('transfering to zero address should fails', async () => {
                    await expectThrow(safeTransferFrom(user0, user0, zeroAddress, tokenId));
                });

                t.test('transfering one NFT change to correct owner', async () => {
                    await safeTransferFrom(user0, user0, user1, tokenId);
                    const newOwner = await call(contract, 'ownerOf', null, tokenId);
                    assert.equal(newOwner, user1);
                });

                t.test('transfering from without approval should fails', async () => {
                    await expectThrow(safeTransferFrom(user1, user0, user1, tokenId));
                });

                t.test('transfering to a contract that do not accept erc721 token should fail', async () => {
                    const receiverContract = await deployContract(user0, 'TestERC721TokenReceiver', contract.options.address, false, true);
                    const receiverAddress = receiverContract.options.address;
                    await expectThrow(safeTransferFrom(user0, user0, receiverAddress, tokenId));
                });

                t.test('transfering to a contract that do not return the correct onERC721Received bytes shoudl fail', async () => {
                    const receiverContract = await deployContract(user0, 'TestERC721TokenReceiver', contract.options.address, true, false);
                    const receiverAddress = receiverContract.options.address;
                    await expectThrow(safeTransferFrom(user0, user0, receiverAddress, tokenId));
                });

                t.test('transfering to a contract that do not implemented onERC721Received should fail', async () => {
                    const receiverContract = await deployContract(user0, 'ERC20Fund', contract.options.address);
                    const receiverAddress = receiverContract.options.address;
                    await expectThrow(safeTransferFrom(user0, user0, receiverAddress, tokenId));
                });

                t.test('transfering to a contract that return the correct onERC721Received bytes shoudl succeed', async () => {
                    const receiverContract = await deployContract(user0, 'TestERC721TokenReceiver', contract.options.address, true, true);
                    const receiverAddress = receiverContract.options.address;
                    await safeTransferFrom(user0, user0, receiverAddress, tokenId);
                    const newOwner = await call(contract, 'ownerOf', null, tokenId);
                    assert.equal(newOwner, receiverAddress);
                });
            });
        }

        testSafeTransfers();
        testSafeTransfers(emptyBytes);
        testSafeTransfers('0xff56fe3422');

        t.test('supportsInterface', async (t) => {
            t.test('claim to support erc165', async () => {
                const result = await call(contract, 'supportsInterface', null, '0x01ffc9a7');
                assert.equal(result, true);
            });

            t.test('claim to support base erc721 interface', async () => {
                const result = await call(contract, 'supportsInterface', null, '0x80ac58cd');
                assert.equal(result, true);
            });

            t.test('claim to support erc721 metadata interface', async () => {
                const result = await call(contract, 'supportsInterface', null, '0x5b5e139f');
                assert.equal(result, true);
            });

            t.test('does not claim to support random interface', async () => {
                const result = await call(contract, 'supportsInterface', null, '0x88888888');
                assert.equal(result, false);
            });

            t.test('does not claim to support the invalid interface', async () => {
                const result = await call(contract, 'supportsInterface', null, '0xFFFFFFFF');
                assert.equal(result, false);
            });
        });

        t.test('approvals', async (t) => {
            t.test('approving emit Approval event', async () => {
                const receipt = await tx(contract, 'approve', {from: user0, gas}, user1, tokenId);
                const eventsMatching = await getEventsFromReceipt(contract, ApprovalEvent, receipt);
                assert.equal(eventsMatching.length, 1);
                const eventValues = eventsMatching[0].returnValues;
                assert.equal(eventValues[0], user0);
                assert.equal(eventValues[1], user1);
                assert.equal(eventValues[2], tokenId);
            });

            t.test('removing approval emit Approval event', async () => {
                await tx(contract, 'approve', {from: user0, gas}, user1, tokenId);
                const receipt = await tx(contract, 'approve', {from: user0, gas}, zeroAddress, tokenId);
                const eventsMatching = await getEventsFromReceipt(contract, ApprovalEvent, receipt);
                assert.equal(eventsMatching.length, 1);
                const eventValues = eventsMatching[0].returnValues;
                assert.equal(eventValues[0], user0);
                assert.equal(eventValues[1], zeroAddress);
                assert.equal(eventValues[2], tokenId);
            });

            t.test('approving update the approval status', async () => {
                await tx(contract, 'approve', {from: user0, gas}, user1, tokenId);
                const approvedAddress = await call(contract, 'getApproved', null, tokenId);
                assert.equal(approvedAddress, user1);
            });

            t.test('cant approve if not owner or operator ', async () => {
                await tx(contract, 'transferFrom', {from: user0, gas}, user0, user1, tokenId);
                await expectThrow(tx(contract, 'approve', {from: user0, gas}, user1, tokenId));
            });

            t.test('approving allows transfer from the approved party', async () => {
                await tx(contract, 'approve', {from: user0, gas}, user1, tokenId);
                await tx(contract, 'transferFrom', {from: user1, gas}, user0, user2, tokenId);
                const newOwner = await call(contract, 'ownerOf', null, tokenId);
                assert.equal(newOwner, user2);
            });

            t.test('transfering the approved NFT results in aproval reset for it', async () => {
                await tx(contract, 'approve', {from: user0, gas}, user2, tokenId);
                await tx(contract, 'transferFrom', {from: user2, gas}, user0, user1, tokenId);
                const approvedAddress = await call(contract, 'getApproved', null, tokenId);
                assert.equal(approvedAddress, zeroAddress);
            });

            t.test('transfering the approved NFT results in aproval reset for it but no approval event', async () => {
                await tx(contract, 'approve', {from: user0, gas}, user2, tokenId);
                const receipt = await tx(contract, 'transferFrom', {from: user2, gas}, user0, user1, tokenId);
                const eventsMatching = await getEventsFromReceipt(contract, ApprovalEvent, receipt);
                assert.equal(eventsMatching.length, 0);
            });

            t.test('transfering the approved NFT again will fail', async () => {
                await tx(contract, 'approve', {from: user0, gas}, user2, tokenId);
                await tx(contract, 'transferFrom', {from: user2, gas}, user0, user1, tokenId);
                await expectThrow(tx(contract, 'transferFrom', {from: user2, gas}, user1, user0, tokenId));
            });

            t.test('approval by operator works', async () => {
                await tx(contract, 'transferFrom', {from: user0, gas}, user0, user1, tokenId);

                await tx(contract, 'setApprovalForAllFor', {from: user1, gas}, user1, user2, true);
                // await tx(contract, 'approve', {from: user1, gas}, user2, tokenId);
                await tx(contract, 'transferFrom', {from: user2, gas}, user1, user3, tokenId);
                const newOwner = await call(contract, 'ownerOf', null, tokenId);
                assert.equal(newOwner, user3);
            });
        });

        t.test('setApprovalForAll', async (t) => {
            t.test('approving all emit ApprovalForAll event', async () => {
                const receipt = await tx(contract, 'setApprovalForAll', {from: user0, gas}, user1, true);
                const eventsMatching = await getEventsFromReceipt(contract, ApprovalForAllEvent, receipt);
                assert.equal(eventsMatching.length, 1);
                const eventValues = eventsMatching[0].returnValues;
                assert.equal(eventValues[0], user0);
                assert.equal(eventValues[1], user1);
                assert.equal(eventValues[2], true);
            });

            t.test('approving all update the approval status', async () => {
                await tx(contract, 'setApprovalForAll', {from: user0, gas}, user1, true);
                const isUser1Approved = await call(contract, 'isApprovedForAll', null, user0, user1);
                assert.equal(isUser1Approved, true);
            });

            t.test('unsetting approval for all should update the approval status', async () => {
                await tx(contract, 'setApprovalForAll', {from: user0, gas}, user1, true);
                await tx(contract, 'setApprovalForAll', {from: user0, gas}, user1, false);
                const isUser1Approved = await call(contract, 'isApprovedForAll', null, user0, user1);
                assert.equal(isUser1Approved, false);
            });

            t.test('unsetting approval for all should emit ApprovalForAll event', async () => {
                await tx(contract, 'setApprovalForAll', {from: user0, gas}, user1, true);
                const receipt = await tx(contract, 'setApprovalForAll', {from: user0, gas}, user1, false);
                const eventsMatching = await getEventsFromReceipt(contract, ApprovalForAllEvent, receipt);
                assert.equal(eventsMatching.length, 1);
                const eventValues = eventsMatching[0].returnValues;
                assert.equal(eventValues[0], user0);
                assert.equal(eventValues[1], user1);
                assert.equal(eventValues[2], null); // assert.equal(eventValues[2], false);
            });

            t.test('approving for all allows transfer from the approved party', async () => {
                await tx(contract, 'setApprovalForAll', {from: user0, gas}, user1, true);
                await tx(contract, 'transferFrom', {from: user1, gas}, user0, user2, tokenId);
                const newOwner = await call(contract, 'ownerOf', null, tokenId);
                assert.equal(newOwner, user2);
            });
            t.test('transfering one NFT do not results in aprovalForAll reset', async () => {
                await tx(contract, 'setApprovalForAll', {from: user0, gas}, user2, true);
                await tx(contract, 'transferFrom', {from: user0, gas}, user0, user1, tokenId);
                const isUser2Approved = await call(contract, 'isApprovedForAll', null, user0, user2);
                assert.equal(isUser2Approved, true);
            });

            t.test('approval for all does not grant approval on a transfered NFT', async () => {
                await tx(contract, 'setApprovalForAll', {from: user0, gas}, user2, true);
                await tx(contract, 'transferFrom', {from: user0, gas}, user0, user1, tokenId);
                await expectThrow(tx(contract, 'transferFrom', {from: user2, gas}, user1, user2, tokenId));
            });

            t.test('approval for all set before will work on a transfered NFT', async () => {
                await tx(contract, 'setApprovalForAll', {from: user1, gas}, user2, true);
                await tx(contract, 'transferFrom', {from: user0, gas}, user0, user1, tokenId);
                await tx(contract, 'transferFrom', {from: user2, gas}, user1, user2, tokenId);
                const newOwner = await call(contract, 'ownerOf', null, tokenId);
                assert.equal(newOwner, user2);
            });

            t.test('approval for all allow to set individual nft approve', async () => {
                await tx(contract, 'transferFrom', {from: user0, gas}, user0, user1, tokenId);

                await tx(contract, 'setApprovalForAll', {from: user1, gas}, user2, true);

                // await tx(contract, 'approve', {from: user1, gas}, user2, tokenId);
                await tx(contract, 'transferFrom', {from: user2, gas}, user1, user3, tokenId);
                const newOwner = await call(contract, 'ownerOf', null, tokenId);
                assert.equal(newOwner, user3);
            });
        });
    });
}

module.exports = {
    runERC721tests
};
