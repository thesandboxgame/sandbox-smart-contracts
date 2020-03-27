const tap = require('tap');
const assert = require('assert');
const rocketh = require('rocketh');
const ethers = require('ethers');
const {Wallet, utils, BigNumber} = ethers;
const {getDeployedContract} = rocketh;
const {solidityKeccak256, arrayify} = ethers.utils;
const ethSigUtil = require('eth-sig-util');

const {
    call,
    tx,
    gas,
    deployContract,
    expectRevert,
    ethersProvider,
} = require('../utils');

const {
    deployer,
    others,
    P2PERC721SaleAdmin,
} = rocketh.namedAccounts;

const initialFee = 100;

function runP2PERC721SaleTests(title) {
    tap.test(title + ' tests', async (t) => {
        let token;
        let instance;
        let sand;

        let wallet = Wallet.createRandom();
        const provider = new ethers.providers.Web3Provider(rocketh.ethereum);
        wallet = wallet.connect(provider);
        await ethersProvider.getSigner(deployer).sendTransaction({to: wallet.address, value: BigNumber.from('1000000000000000000')});

        function getDomainData() {
            return {
                name: 'The Sandbox 3D',
                version: '1',
                verifyingContract: instance.address
            };
        }

        const domainType = [
            {name: 'name', type: 'string'},
            {name: 'version', type: 'string'},
            {name: 'verifyingContract', type: 'address'}
        ];

        const auctionType = [
            {name: 'id', type: 'uint256'},
            {name: 'tokenAddress', type: 'address'},
            {name: 'tokenId', type: 'uint256'},
            {name: 'seller', type: 'address'},
            {name: 'startingPrice', type: 'uint256'},
            {name: 'endingPrice', type: 'uint256'},
            {name: 'startedAt', type: 'uint256'},
            {name: 'duration', type: 'uint256'},
        ];

        function getBasicSignature(contractAddress, auction) {
            const hash = solidityKeccak256([
                'address',
                'uint256',
                'address',
                'uint256',
                'address',
                'uint256',
                'uint256',
                'uint256',
                'uint256',
            ], [
                contractAddress,
                auction.id,
                auction.tokenAddress,
                auction.tokenId,
                auction.seller,
                auction.startingPrice,
                auction.endingPrice,
                auction.startedAt,
                auction.duration,
            ]);

            return wallet.signMessage(arrayify(hash));
        }

        function getSignature(auction) {
            return ethSigUtil.signTypedData(
                wallet.privateKey, {
                    data: {
                        types: {
                            EIP712Domain: domainType,
                            Auction: auctionType,
                        },
                        domain: getDomainData(),
                        primaryType: 'Auction',
                        message: {...auction},
                    },
                },
            );
        }

        t.beforeEach(async () => {
            await rocketh.runStages();
            const sandContract = getDeployedContract('Sand');
            sand = new ethers.Contract(sandContract.address, sandContract.abi, ethersProvider);

            instance = await deployContract(
                deployer,
                'P2PERC721Sale',
                sandContract.address,
                deployer,
                deployer,
                initialFee,
            );

            token = await deployContract(deployer, 'TestERC721', sandContract.address, deployer);

            await tx(token, 'mint', {from: deployer, gas}, wallet.address, 1);

            const tokenWithSigner = token.connect(wallet);

            await tokenWithSigner.functions.approve(instance.address, 1);

            const amount = utils.parseEther('100');

            await tx(
                sand,
                'transferFrom', {
                    from: P2PERC721SaleAdmin,
                    gas,
                },
                P2PERC721SaleAdmin,
                others[0],
                amount.toString(),
            );

            await tx(sand, 'approve', {from: others[0], gas}, instance.address, amount.toString());
        });

        t.test('Should get the initial fee', async () => {
            const fee = await call(instance, '_fee', {from: deployer, gas});
            assert.equal(fee, initialFee, 'Fee is wrong');
        });

        t.test('Should update the fee', async () => {
            const newFee = 200;

            await tx(instance, 'setFee', {from: deployer, gas}, deployer, newFee);

            const fee = await call(instance, '_fee', {from: deployer, gas});

            assert.equal(fee, newFee, 'Fee is wrong');
        });

        t.test('Should NOT update the fee', async () => {
            const newFee = 200;

            await expectRevert(
                tx(
                    instance,
                    'setFee', {
                        from: others[0],
                        gas,
                    },
                    deployer,
                    newFee,
                ),
                'Sender not admin',
            );
        });

        t.test('Should NOT claim an offer that has not started yet', async () => {
            const auction = {
                id: 0,
                tokenAddress: token.address,
                tokenId: 1,
                seller: wallet.address,
                startingPrice: utils.parseEther('10').toString(),
                endingPrice: utils.parseEther('10').toString(),
                startedAt: Math.floor(Date.now() / 1000) + (60 * 60),
                duration: 60 * 60 * 24,
            };

            const signature = await getBasicSignature(instance.address, auction);

            await expectRevert(
                tx(
                    instance,
                    'claimSellerOffer', {
                        from: others[0],
                        gas,
                    },
                    others[0],
                    auction,
                    signature,
                    0,
                    true,
                ),
                'Auction has not started yet'
            );
        });

        t.test('Should NOT claim a finished offer', async () => {
            const auction = {
                id: 0,
                tokenAddress: token.address,
                tokenId: 1,
                seller: wallet.address,
                startingPrice: utils.parseEther('10').toString(),
                endingPrice: utils.parseEther('10').toString(),
                startedAt: Math.floor(Date.now() / 1000) - (60 * 60 * 24),
                duration: 60 * 60 * 23,
            };

            const signature = await getBasicSignature(instance.address, auction);

            await expectRevert(
                tx(
                    instance,
                    'claimSellerOffer', {
                        from: others[0],
                        gas,
                    },
                    others[0],
                    auction,
                    signature,
                    0,
                    true,
                ),
                'Auction finished'
            );
        });

        t.test('Should NOT claim a canceled offer', async () => {
            const auction = {
                id: 0,
                tokenAddress: token.address,
                tokenId: 1,
                seller: wallet.address,
                startingPrice: utils.parseEther('10').toString(),
                endingPrice: utils.parseEther('10').toString(),
                startedAt: Math.floor(Date.now() / 1000),
                duration: 60 * 60 * 24,
            };

            // Change the sender here to the signing wallet defined on top
            const receipt = await tx(instance, 'cancelSellerOffer', {from: others[0], gas}, auction.id);

            const event = receipt.events[0];

            assert.equal(event.event, 'OfferCancelled', 'Event is wrong');
            assert.equal(event.args[1].toString(), auction.id, 'Auction id is wrong');

            /*
            const signature = await getBasicSignature(instance.address, auction);

            await expectRevert(
                tx(
                    instance,
                    'claimSellerOffer', {
                        from: others[0],
                        gas,
                    },
                    others[0],
                    auction,
                    signature,
                    0,
                    true,
                ),
                'Auction canceled'
            );
            */
        });

        t.test('-> Direct signature without EIP712', async (t) => {
            t.test('Shoud NOT claim seller offer with a fake auction', async () => {
                const auction = {
                    id: 0,
                    tokenAddress: token.address,
                    tokenId: 1,
                    seller: wallet.address,
                    startingPrice: utils.parseEther('10').toString(),
                    endingPrice: utils.parseEther('10').toString(),
                    startedAt: Math.floor(Date.now() / 1000),
                    duration: 60 * 60 * 24,
                };

                const signature = await getBasicSignature(instance.address, auction);

                const fakeAuction = {
                    ...auction,
                };

                fakeAuction.tokenId = 2;

                await expectRevert(
                    tx(
                        instance,
                        'claimSellerOffer', {
                            from: others[0],
                            gas,
                        },
                        others[0],
                        fakeAuction,
                        signature,
                        0,
                        false,
                    ),
                    'Invalid sig',
                );
            });

            t.test('Should claim seller offer', async () => {
                const auction = {
                    id: 0,
                    tokenAddress: token.address,
                    tokenId: 1,
                    seller: wallet.address,
                    startingPrice: utils.parseEther('10').toString(),
                    endingPrice: utils.parseEther('10').toString(),
                    startedAt: Math.floor(Date.now() / 1000),
                    duration: 60 * 60 * 24,
                };

                const signature = await getBasicSignature(instance.address, auction);

                await tx(
                    instance,
                    'claimSellerOffer', {
                        from: others[0],
                        gas,
                    },
                    others[0],
                    auction,
                    signature,
                    0,
                    false,
                );

                const owner = await call(token, 'ownerOf', {from: others[0], gas}, auction.tokenId);

                assert.equal(owner, others[0], 'Owner is wrong');

                const balance = await call(sand, 'balanceOf', {from: others[0], gas}, wallet.address);

                console.log(balance.toString());
            });
        });

        t.test('-> Direct signature with EIP712', async (t) => {
            t.test('Shoud NOT claim seller offer with a fake auction', async () => {
                const auction = {
                    id: 0,
                    tokenAddress: token.address,
                    tokenId: 1,
                    seller: wallet.address,
                    startingPrice: utils.parseEther('10').toString(),
                    endingPrice: utils.parseEther('10').toString(),
                    startedAt: Math.floor(Date.now() / 1000),
                    duration: 60 * 60 * 24,
                };

                const signature = await getBasicSignature(instance.address, auction);

                const fakeAuction = {
                    ...auction,
                };

                fakeAuction.tokenId = 2;

                await expectRevert(
                    tx(
                        instance,
                        'claimSellerOffer', {
                            from: others[0],
                            gas,
                        },
                        others[0],
                        fakeAuction,
                        signature,
                        0,
                        true,
                    ),
                    'Invalid sig',
                );
            });

            t.test('Should claim seller offer', async () => {
                const auction = {
                    id: 0,
                    tokenAddress: token.address,
                    tokenId: 1,
                    seller: wallet.address,
                    startingPrice: utils.parseEther('10').toString(),
                    endingPrice: utils.parseEther('10').toString(),
                    startedAt: Math.floor(Date.now() / 1000),
                    duration: 60 * 60 * 24,
                };

                const signature = await getBasicSignature(instance.address, auction);

                await tx(
                    instance,
                    'claimSellerOffer', {
                        from: others[0],
                        gas,
                    },
                    others[0],
                    auction,
                    signature,
                    0,
                    false,
                );

                const owner = await call(token, 'ownerOf', {from: others[0], gas}, auction.tokenId);

                assert.equal(owner, others[0], 'Owner is wrong');

                const balance = await call(sand, 'balanceOf', {from: others[0], gas}, wallet.address);

                console.log(balance.toString());
            });
        });
    });
}

module.exports = {
    runP2PERC721SaleTests,
};
