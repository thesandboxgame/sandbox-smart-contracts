import { ethers, getNamedAccounts } from 'hardhat';
import { setupTestAuction } from './fixtures';
import { setupAsset } from '../asset/fixtures';
import { waitFor, toWei } from '../utils';
import BN from 'bn.js';
import crypto from 'crypto';
import { constants } from 'ethers';

const zeroAddress = constants.AddressZero;

// eslint-disable-next-line mocha/no-skipped-tests
describe('Auction', function () {
    let offerId: any;
    const startingPrice = toWei('1');
    const endingPrice = toWei('5');
    let startedAt: any;
    const duration = 1000;
    const packs = 1;
    const buyAmount = 1;
    const amounts = [1];
    let tokenId: any;
    let assetSignedAuctionContract: any;
    let assetContract: any;
    let others: any;
    let assetSignedAuctionContractAsUser: any;
    let sandContract: any;
    let sandAsAdmin: any;
    let sandAsUser: any;

    before(async function () {
        const { sandAdmin } = await getNamedAccounts();
        const options = {
            fee10000th: 200,
        };
        const {
            assetSignedAuctionContract1,
            assetContract1,
            others1,
        } = await setupTestAuction(options);
        assetSignedAuctionContract = assetSignedAuctionContract1;
        assetContract = assetContract1;
        others = others1;
        assetSignedAuctionContractAsUser = await assetSignedAuctionContract.connect(
            ethers.provider.getSigner(others[1])
        );

        const { mintAsset } = await setupAsset();
        tokenId = await mintAsset(others[0], 20);

        sandContract = await ethers.getContract('Sand');
        sandAsAdmin = await sandContract.connect(
            ethers.provider.getSigner(sandAdmin)
        );
        sandAsUser = await sandContract.connect(
            ethers.provider.getSigner(others[1])
        );
    });

    beforeEach(async function () {
        offerId = new BN(crypto.randomBytes(32), 16).toString(10);
        startedAt = Math.floor(Date.now() / 1000);
    });

    it('should be able to claim seller offer in ETH', async function () {
        const seller = others[0];
        // address from,address token,uint256 offerId,uint256 startingPrice,uint256 endingPrice,uint256 startedAt,uint256 duration,uint256 packs,bytes ids,bytes amounts
        const signature = await ethers.provider.send('eth_signTypedData_v4', [
            seller,
            {
                types: {
                    EIP712Domain: [
                        {
                            name: 'name',
                            type: 'string',
                        },
                        {
                            name: 'version',
                            type: 'string',
                        },
                        {
                            name: 'verifyingContract',
                            type: 'address',
                        },
                    ],
                    Auction: [
                        { name: 'from', type: 'address' },
                        { name: 'token', type: 'address' },
                        { name: 'offerId', type: 'uint256' },
                        { name: 'startingPrice', type: 'uint256' },
                        { name: 'endingPrice', type: 'uint256' },
                        { name: 'startedAt', type: 'uint256' },
                        { name: 'duration', type: 'uint256' },
                        { name: 'packs', type: 'uint256' },
                        { name: 'ids', type: 'bytes' },
                        { name: 'amounts', type: 'bytes' },
                    ],
                },
                primaryType: 'Auction',
                domain: {
                    name: 'The Sandbox 3D',
                    version: '1',
                    verifyingContract: assetSignedAuctionContractAsUser.address,
                },
                message: {
                    from: seller,
                    token: zeroAddress,
                    offerId,
                    startingPrice: startingPrice.toString(),
                    endingPrice: endingPrice.toString(),
                    startedAt,
                    duration,
                    packs,
                    ids: ethers.utils.solidityPack(['uint[]'], [[tokenId.toString()]]),
                    amounts: ethers.utils.solidityPack(['uint[]'], [amounts]),
                },
            },
        ]);
        const auctionData = [
            offerId,
            startingPrice.toString(),
            endingPrice.toString(),
            startedAt,
            duration,
            packs,
        ];

        await assetContract.setApprovalForAll(assetSignedAuctionContract.address, true, { from: others[0] })

        await waitFor(
            assetSignedAuctionContractAsUser.claimSellerOffer({
                buyer: others[1],
                seller: others[0],
                token: zeroAddress,
                purchase: [buyAmount, '5000000000000000000'],
                auctionData,
                ids: [tokenId.toString()],
                amounts,
                signature,
            }, { value: '5000000000000000000' })
        );
    });
    it('should be able to claim seller offer in SAND', async function () {
        const seller = others[0];
        // address from,address token,uint256 offerId,uint256 startingPrice,uint256 endingPrice,uint256 startedAt,uint256 duration,uint256 packs,bytes ids,bytes amounts
        const signature = await ethers.provider.send('eth_signTypedData_v4', [
            seller,
            {
                types: {
                    EIP712Domain: [
                        {
                            name: 'name',
                            type: 'string',
                        },
                        {
                            name: 'version',
                            type: 'string',
                        },
                        {
                            name: 'verifyingContract',
                            type: 'address',
                        },
                    ],
                    Auction: [
                        { name: 'from', type: 'address' },
                        { name: 'token', type: 'address' },
                        { name: 'offerId', type: 'uint256' },
                        { name: 'startingPrice', type: 'uint256' },
                        { name: 'endingPrice', type: 'uint256' },
                        { name: 'startedAt', type: 'uint256' },
                        { name: 'duration', type: 'uint256' },
                        { name: 'packs', type: 'uint256' },
                        { name: 'ids', type: 'bytes' },
                        { name: 'amounts', type: 'bytes' },
                    ],
                },
                primaryType: 'Auction',
                domain: {
                    name: 'The Sandbox 3D',
                    version: '1',
                    verifyingContract: assetSignedAuctionContractAsUser.address,
                },
                message: {
                    from: seller,
                    token: sandContract.address,
                    offerId,
                    startingPrice: startingPrice.toString(),
                    endingPrice: endingPrice.toString(),
                    startedAt,
                    duration,
                    packs,
                    ids: ethers.utils.solidityPack(['uint[]'], [[tokenId.toString()]]),
                    amounts: ethers.utils.solidityPack(['uint[]'], [amounts]),
                },
            },
        ]);
        const auctionData = [
            offerId,
            startingPrice.toString(),
            endingPrice.toString(),
            startedAt,
            duration,
            packs,
        ];

        await sandAsAdmin.transfer(
            others[1],
            '5000000000000000000'
        );

        await assetContract.setApprovalForAll(assetSignedAuctionContract.address, true, { from: others[0] })
        await sandAsUser.approve(assetSignedAuctionContract.address, '5000000000000000000')

        await waitFor(
            assetSignedAuctionContractAsUser.claimSellerOffer({
                buyer: others[1],
                seller: others[0],
                token: sandContract.address,
                purchase: [buyAmount, '5000000000000000000'],
                auctionData,
                ids: [tokenId.toString()],
                amounts,
                signature,
            })
        );
    });
    it('should be able to claim seller offer with basic signature', async function () {
        const seller = others[0];

        const hashedData = await ethers.utils.solidityKeccak256(
            [
                'address',
                'bytes',
                'address',
                'address',
                'uint256',
                'uint256',
                'uint256',
                'uint256',
                'uint256',
                'uint256',
                'bytes',
                'bytes'
            ],
            [
                assetSignedAuctionContract.address,
                ethers.utils.solidityKeccak256(['string'],['Auction(address from,address token,uint256 offerId,uint256 startingPrice,uint256 endingPrice,uint256 startedAt,uint256 duration,uint256 packs,bytes ids,bytes amounts)']),
                seller,
                zeroAddress,
                offerId,
                startingPrice.toString(),
                endingPrice.toString(),
                startedAt,
                duration,
                packs,
                ethers.utils.solidityKeccak256(['uint[]'], [[tokenId.toString()]]),
                ethers.utils.solidityKeccak256(['uint[]'], [amounts]),
            ]
        );

        

        const wallet = await ethers.getSigner(others[0]);

        const signature = await wallet.signMessage(ethers.utils.arrayify(hashedData));

        const auctionData = [
            offerId,
            startingPrice.toString(),
            endingPrice.toString(),
            startedAt,
            duration,
            packs,
        ];

        await assetContract.setApprovalForAll(assetSignedAuctionContract.address, true, { from: others[0] })

        console.log(signature);

        await waitFor(
            assetSignedAuctionContractAsUser.claimSellerOffer({
                buyer: others[1],
                seller: others[0],
                token: zeroAddress,
                purchase: [buyAmount, '5000000000000000000'],
                auctionData,
                ids: [tokenId.toString()],
                amounts,
                signature,
            }, {value: '5000000000000000000'})
        );
    });
});