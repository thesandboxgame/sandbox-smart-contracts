import {ethers} from 'hardhat';
import {setupTestAuction} from './fixtures';
import {setupAsset} from '../asset/fixtures';
import {waitFor, toWei} from '../utils';
import BN from 'bn.js';
import crypto from 'crypto';
import {constants} from 'ethers';

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

  before(async function () {
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

    const {mintAsset} = await setupAsset();
    tokenId = await mintAsset(others[0], 20);
  });

  beforeEach(async function () {
    offerId = new BN(crypto.randomBytes(32), 16).toString(10);
    startedAt = Math.floor(Date.now() / 1000);
  });

  it('Claiming sell offer is working correctly.', async function () {
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
            {name: 'from', type: 'address'},
            {name: 'token', type: 'address'},
            {name: 'offerId', type: 'uint256'},
            {name: 'startingPrice', type: 'uint256'},
            {name: 'endingPrice', type: 'uint256'},
            {name: 'startedAt', type: 'uint256'},
            {name: 'duration', type: 'uint256'},
            {name: 'packs', type: 'uint256'},
            {name: 'ids', type: 'bytes'},
            {name: 'amounts', type: 'bytes'},
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
      })
    );
  });
});