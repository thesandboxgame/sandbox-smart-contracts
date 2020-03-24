const tap = require('tap');
const assert = require('assert');
const rocketh = require('rocketh');
const ethers = require('ethers');
const {Wallet, utils} = require('ethers');
const {getDeployedContract} = rocketh;
const {solidityKeccak256, arrayify} = ethers.utils;

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
        const sandContract = getDeployedContract('Sand');
        let token;
        let instance;

        const wallet = Wallet.createRandom();

        function getDomainData() {
            return {
                name: 'The Sandbox 3D',
                version: '1',
                verifyingContract: instance.address
            };
        }

        function getBasicSignature(auction, wallet) {
            const hash = solidityKeccak256([
                'uint256',
                'address',
                'uint256',
                'address',
                'uint256',
                'uint256',
                'uint256',
                'uint256',
            ], [
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

        t.beforeEach(async () => {
            const sand = new ethers.Contract(sandContract.address, sandContract.abi, ethersProvider);

            instance = await deployContract(
                deployer,
                'P2PERC721Sale',
                sandContract.address,
                deployer,
                deployer,
                initialFee,
            );

            token = await deployContract(
                deployer,
                'TestERC721',
                sandContract.address,
                deployer,
            );

            await tx(
                token,
                'mint', {
                    from: deployer,
                    gas,
                },
                wallet.address,
                0,
            );

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
        });

        t.test('Should get Sand contract address', async () => {
            const sandAddress = await call(
                instance,
                '_sand', {
                    from: deployer,
                    gas,
                },
            );

            assert.equal(sandAddress, sandContract.address, 'Sand address is wrong');
        });

        t.test('Should get the initial fee', async () => {
            const fee = await call(
                instance,
                '_fee', {
                    from: deployer,
                    gas,
                },
            );

            assert.equal(fee, initialFee, 'Fee is wrong');
        });

        t.test('Should update the fee', async () => {
            const newFee = 200;

            await tx(
                instance,
                'setFee', {
                    from: deployer,
                    gas,
                },
                deployer,
                newFee,
            );

            const fee = await call(
                instance,
                '_fee', {
                    from: deployer,
                    gas,
                },
            );

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

        t.test('Should claim seller offer', async () => {
            const auction = {
                id: 0,
                tokenAddress: token.address,
                tokenId: 0,
                seller: wallet.address,
                startingPrice: utils.parseEther('10').toString(),
                endingPrice: utils.parseEther('10').toString(),
                startedAt: Math.floor(Date.now() / 1000),
                duration: 60 * 60 * 24,
            };

            const signature = await getBasicSignature(auction, wallet);

            await tx(
                instance,
                'claimSellerOffer', {
                    from: others[0],
                    gas,
                },
                others[0],
                utils.parseEther('10').toString(),
                auction,
                signature,
                0,
                true,
            );
        });
    });
}

module.exports = {
    runP2PERC721SaleTests,
};
