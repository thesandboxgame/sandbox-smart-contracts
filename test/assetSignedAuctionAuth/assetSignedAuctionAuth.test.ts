import {ethers, getNamedAccounts} from 'hardhat';
import {setupTestAuction} from './fixtures';
import {setupAsset} from '../asset/fixtures';
import {waitFor} from '../utils';
import BN from 'bn.js';
import crypto from 'crypto';
import {constants, Contract} from 'ethers';
import {assert} from 'chai';

const zeroAddress = constants.AddressZero;

// eslint-disable-next-line mocha/no-skipped-tests
describe('Auction', function () {
  let offerId: string;
  const startingPrice = new BN('1000000000000000000');
  const endingPrice = new BN('5000000000000000000');
  let startedAt: number;
  const duration = 1000;
  const packs = 1;
  const buyAmount = 1;
  const amounts = [1];
  let tokenId: number;
  let AssetSignedAuctionAuthContract: Contract;
  let assetContract: Contract;
  let others: Array<string>;
  let AssetSignedAuctionAuthContractAsUser: Contract;
  let sandContract: Contract;
  let sandAsAdmin: Contract;
  let sandAsUser: Contract;

  before(async function () {
    const {sandAdmin} = await getNamedAccounts();
    const options = {
      fee10000th: 200,
    };
    const {
      assetSignedAuctionAuthContract1,
      assetContract1,
      others1,
    } = await setupTestAuction(options);
    AssetSignedAuctionAuthContract = assetSignedAuctionAuthContract1;
    assetContract = assetContract1;
    others = others1;
    AssetSignedAuctionAuthContractAsUser = await AssetSignedAuctionAuthContract.connect(
      ethers.provider.getSigner(others[1])
    );

    const {mintAsset} = await setupAsset();
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
    startedAt = Math.floor(Date.now() / 1000) - 500;
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
          verifyingContract: AssetSignedAuctionAuthContractAsUser.address,
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

    await assetContract.setApprovalForAll(
      AssetSignedAuctionAuthContract.address,
      true,
      {from: others[0]}
    );

    const prevSellerEtherBalance = await ethers.provider.getBalance(others[0]);
    const prevFeeCollectorEtherBalance = await ethers.provider.getBalance(
      others[2]
    );

    await waitFor(
      AssetSignedAuctionAuthContractAsUser.claimSellerOffer(
        {
          buyer: others[1],
          seller: others[0],
          token: zeroAddress,
          purchase: [buyAmount, '5000000000000000000'],
          auctionData,
          ids: [tokenId.toString()],
          amounts,
          signature,
        },
        {value: '5000000000000000000'}
      )
    );

    assert.equal(
      new BN((await ethers.provider.getBalance(others[2])).toString()).cmp(
        new BN(prevFeeCollectorEtherBalance.toString())
      ),
      1
    );
    assert.equal(
      new BN((await ethers.provider.getBalance(others[0])).toString()).cmp(
        new BN(prevSellerEtherBalance.toString())
      ),
      1
    );
    assert.equal(
      new BN(
        await assetContract.balanceOfBatch([others[0]], [tokenId])
      ).toString(),
      '19'
    );
    assert.equal(
      new BN(
        await assetContract.balanceOfBatch([others[1]], [tokenId])
      ).toString(),
      '1'
    );

    console.log((await ethers.provider.getBalance(others[2])).toString());
  });

  it('should NOT be able to claim offer if signature mismatches', async function () {
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
          name: 'The Sandbox',
          version: '1',
          verifyingContract: AssetSignedAuctionAuthContractAsUser.address,
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

    await assetContract.setApprovalForAll(
      AssetSignedAuctionAuthContract.address,
      true,
      {from: others[0]}
    );

    let thrownError;
    try {
      await waitFor(
        AssetSignedAuctionAuthContractAsUser.claimSellerOffer(
          {
            buyer: others[1],
            seller: others[0],
            token: zeroAddress,
            purchase: [buyAmount, '5000000000000000000'],
            auctionData,
            ids: [tokenId.toString()],
            amounts,
            signature,
          },
          {value: '5000000000000000000'}
        )
      );
    } catch (error) {
      thrownError = error;
    }
    assert.include(thrownError.message, 'signer != from');
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
          verifyingContract: AssetSignedAuctionAuthContractAsUser.address,
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

    await sandAsAdmin.transfer(others[1], '5000000000000000000');

    await assetContract.setApprovalForAll(
      AssetSignedAuctionAuthContract.address,
      true,
      {from: others[0]}
    );
    await sandAsUser.approve(
      AssetSignedAuctionAuthContract.address,
      '5000000000000000000'
    );

    const prevSellerSandBalance = await sandContract.balanceOf(others[0]);
    const prevBuyerSandBalance = await sandContract.balanceOf(others[1]);
    const prevFeeCollectorSandBalance = await sandContract.balanceOf(others[2]);

    await waitFor(
      AssetSignedAuctionAuthContractAsUser.claimSellerOffer({
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

    assert.equal(
      new BN(
        await assetContract.balanceOfBatch([others[0]], [tokenId])
      ).toString(),
      '18'
    );
    assert.equal(
      new BN(
        await assetContract.balanceOfBatch([others[1]], [tokenId])
      ).toString(),
      '2'
    );
    assert.equal(
      (await sandContract.balanceOf(others[0]))
        .sub(prevSellerSandBalance)
        .add(
          (await sandContract.balanceOf(others[2])).sub(
            prevFeeCollectorSandBalance
          )
        )
        .toString(),
      prevBuyerSandBalance
        .sub(await sandContract.balanceOf(others[1]))
        .toString()
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
        'bytes',
      ],
      [
        AssetSignedAuctionAuthContract.address,
        ethers.utils.solidityKeccak256(
          ['string'],
          [
            'Auction(address from,address token,uint256 offerId,uint256 startingPrice,uint256 endingPrice,uint256 startedAt,uint256 duration,uint256 packs,bytes ids,bytes amounts)',
          ]
        ),
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

    const signature = await wallet.signMessage(
      ethers.utils.arrayify(hashedData)
    );

    const auctionData = [
      offerId,
      startingPrice.toString(),
      endingPrice.toString(),
      startedAt,
      duration,
      packs,
    ];

    await assetContract.setApprovalForAll(
      AssetSignedAuctionAuthContract.address,
      true,
      {from: others[0]}
    );

    const prevSellerEtherBalance = await ethers.provider.getBalance(others[0]);

    await waitFor(
      AssetSignedAuctionAuthContractAsUser.claimSellerOfferUsingBasicSig(
        {
          buyer: others[1],
          seller: others[0],
          token: zeroAddress,
          purchase: [buyAmount, '5000000000000000000'],
          auctionData,
          ids: [tokenId.toString()],
          amounts,
          signature,
        },
        {value: '5000000000000000000'}
      )
    );

    assert.equal(
      new BN((await ethers.provider.getBalance(others[0])).toString()).cmp(
        new BN(prevSellerEtherBalance.toString())
      ),
      1
    );
    assert.equal(
      new BN(
        await assetContract.balanceOfBatch([others[0]], [tokenId])
      ).toString(),
      '17'
    );
    assert.equal(
      new BN(
        await assetContract.balanceOfBatch([others[1]], [tokenId])
      ).toString(),
      '3'
    );
  });
  it('should be able to cancel offer', async function () {
    await AssetSignedAuctionAuthContract.cancelSellerOffer(offerId, {
      from: others[0],
    });

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
        'bytes',
      ],
      [
        AssetSignedAuctionAuthContract.address,
        ethers.utils.solidityKeccak256(
          ['string'],
          [
            'Auction(address from,address token,uint256 offerId,uint256 startingPrice,uint256 endingPrice,uint256 startedAt,uint256 duration,uint256 packs,bytes ids,bytes amounts)',
          ]
        ),
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

    const signature = await wallet.signMessage(
      ethers.utils.arrayify(hashedData)
    );

    const auctionData = [
      offerId,
      startingPrice.toString(),
      endingPrice.toString(),
      startedAt,
      duration,
      packs,
    ];

    await assetContract.setApprovalForAll(
      AssetSignedAuctionAuthContract.address,
      true,
      {from: others[0]}
    );

    let thrownError;
    try {
      await AssetSignedAuctionAuthContractAsUser.claimSellerOfferUsingBasicSig(
        {
          buyer: others[1],
          seller: others[0],
          token: zeroAddress,
          purchase: [buyAmount, '5000000000000000000'],
          auctionData,
          ids: [tokenId.toString()],
          amounts,
          signature,
        },
        {value: '5000000000000000000'}
      );
    } catch (error) {
      thrownError = error;
    }
    assert.include(thrownError.message, 'Auction cancelled');
  });

  it('should NOT be able to claim offer without sending ETH', async function () {
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
        'bytes',
      ],
      [
        AssetSignedAuctionAuthContract.address,
        ethers.utils.solidityKeccak256(
          ['string'],
          [
            'Auction(address from,address token,uint256 offerId,uint256 startingPrice,uint256 endingPrice,uint256 startedAt,uint256 duration,uint256 packs,bytes ids,bytes amounts)',
          ]
        ),
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

    const signature = await wallet.signMessage(
      ethers.utils.arrayify(hashedData)
    );

    const auctionData = [
      offerId,
      startingPrice.toString(),
      endingPrice.toString(),
      startedAt,
      duration,
      packs,
    ];

    await assetContract.setApprovalForAll(
      AssetSignedAuctionAuthContract.address,
      true,
      {from: others[0]}
    );

    let thrownError;
    try {
      await AssetSignedAuctionAuthContractAsUser.claimSellerOfferUsingBasicSig({
        buyer: others[1],
        seller: others[0],
        token: zeroAddress,
        purchase: [buyAmount, '5000000000000000000'],
        auctionData,
        ids: [tokenId.toString()],
        amounts,
        signature,
      });
    } catch (error) {
      thrownError = error;
    }
    assert.include(thrownError.message, 'ETH < offer+fee');
  });
  it('should NOT be able to claim offer without enough SAND', async function () {
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
          verifyingContract: AssetSignedAuctionAuthContractAsUser.address,
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

    await assetContract.setApprovalForAll(
      AssetSignedAuctionAuthContract.address,
      true,
      {from: others[0]}
    );
    await sandAsUser.approve(
      AssetSignedAuctionAuthContract.address,
      '5000000000000000000'
    );

    await sandAsUser.transfer(
      others[2],
      (await sandContract.balanceOf(others[1])).toString()
    );

    let thrownError;
    try {
      await AssetSignedAuctionAuthContractAsUser.claimSellerOffer({
        buyer: others[1],
        seller: others[0],
        token: sandContract.address,
        purchase: [buyAmount, '5000000000000000000'],
        auctionData,
        ids: [tokenId.toString()],
        amounts,
        signature,
      });
    } catch (error) {
      thrownError = error;
    }
    assert.include(thrownError.message, 'not enough fund');
  });

  it('should NOT be able to claim offer if it did not start yet', async function () {
    const seller = others[0];
    startedAt = Math.floor(Date.now() / 1000) + 1000;

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
          verifyingContract: AssetSignedAuctionAuthContractAsUser.address,
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

    await assetContract.setApprovalForAll(
      AssetSignedAuctionAuthContract.address,
      true,
      {from: others[0]}
    );

    let thrownError;
    try {
      await waitFor(
        AssetSignedAuctionAuthContractAsUser.claimSellerOffer(
          {
            buyer: others[1],
            seller: others[0],
            token: zeroAddress,
            purchase: [buyAmount, '5000000000000000000'],
            auctionData,
            ids: [tokenId.toString()],
            amounts,
            signature,
          },
          {value: '5000000000000000000'}
        )
      );
    } catch (error) {
      thrownError = error;
    }
    assert.include(thrownError.message, "Auction didn't start yet");
  });
  it('should NOT be able to claim offer if it already ended', async function () {
    const seller = others[0];
    startedAt = Math.floor(Date.now() / 1000) - 10000;

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
          verifyingContract: AssetSignedAuctionAuthContractAsUser.address,
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

    await assetContract.setApprovalForAll(
      AssetSignedAuctionAuthContract.address,
      true,
      {from: others[0]}
    );

    let thrownError;
    try {
      await waitFor(
        AssetSignedAuctionAuthContractAsUser.claimSellerOffer(
          {
            buyer: others[1],
            seller: others[0],
            token: zeroAddress,
            purchase: [buyAmount, '5000000000000000000'],
            auctionData,
            ids: [tokenId.toString()],
            amounts,
            signature,
          },
          {value: '5000000000000000000'}
        )
      );
    } catch (error) {
      thrownError = error;
    }
    assert.include(thrownError.message, 'Auction finished');
  });
});
