import {ethers} from 'hardhat';
import {setupPolygonAsset} from './fixtures';
import {waitFor} from '../../utils';
import {transferSand} from '../catalyst/utils';
import BN from 'bn.js';
import crypto from 'crypto';
import {BigNumber, constants} from 'ethers';
import {assert} from 'chai';
import {expect} from '../../chai-setup';
import {AbiCoder} from 'ethers/lib/utils';

import {auction712Data, messageTypes} from './fixtures_auction712Data';

const zeroAddress = constants.AddressZero;
const startingPrice = new BN('1000000000000000000');
const endingPrice = new BN('5000000000000000000');
const duration = 1000; // seconds
const packs = 1;
const buyAmount = 1;
const amounts = [1];
const name = 'The Sandbox';
const version = '1';

// eslint-disable-next-line mocha/no-skipped-tests
describe.only('PolygonAssetSignedAuctionAuth', function () {
  it('should be able to claim seller offer in ETH', async function () {
    const {
      PolygonAssetERC1155,
      users,
      mintAsset,
      assetSignedAuctionAuthContract,
      backendAuthWallet,
      authValidatorContract,
    } = await setupPolygonAsset();
    const tokenId = await mintAsset(users[0].address, 20);
    const seller = users[0].address;
    const offerId = new BN(crypto.randomBytes(32), 16).toString(10); // uint256
    const startedAt = Math.floor(Date.now() / 1000) - 500;

    const AssetSignedAuctionAuthContractAsUser = assetSignedAuctionAuthContract.connect(
      ethers.provider.getSigner(users[1].address)
    );

    const verifyingContract = AssetSignedAuctionAuthContractAsUser;

    const registeredAuthValidatorContractAddress = await assetSignedAuctionAuthContract._authValidator();
    const authValidatorWallet = await authValidatorContract._signingAuthWallet(); // read the backendAuthWallet address, 0x17c5185167401eD00cF5F5b2fc97D9BBfDb7D025

    const abiCoder = new AbiCoder();

    const message = {
      from: seller,
      token: zeroAddress,
      offerId,
      startingPrice: startingPrice,
      endingPrice: endingPrice,
      startedAt,
      duration,
      packs,
      ids: ethers.utils.solidityPack(['uint[]'], [[tokenId]]),
      amounts: ethers.utils.solidityPack(['uint[]'], [amounts]),
    };

    const signature = await ethers.provider.send('eth_signTypedData_v4', [
      seller,
      auction712Data(name, version, verifyingContract, message),
    ]);

    const typeHash = ethers.utils.keccak256(
      ethers.utils.toUtf8Bytes(
        'Auction(address from,address token,uint256 offerId,uint256 startingPrice,uint256 endingPrice,uint256 startedAt,uint256 duration,uint256 packs,bytes ids,bytes amounts)'
      )
    );

    const hashedData = ethers.utils.solidityKeccak256(messageTypes, [
      typeHash,
      seller,
      zeroAddress,
      offerId,
      startingPrice,
      endingPrice,
      startedAt,
      duration,
      packs,
      ethers.utils.solidityPack(['uint[]'], [[tokenId]]),
      ethers.utils.solidityPack(['uint[]'], [amounts]),
    ]);

    // isAuthValid(
    //   input.backendSignature,
    //   _hashAuction(input.seller, input.token, input.auctionData, input.ids, input.amounts)
    // )

    const auctionData = [
      offerId,
      startingPrice,
      endingPrice,
      startedAt,
      duration,
      packs,
    ];

    // const auctionDataTypes = [
    //   'uint256',
    //   'uint256',
    //   'uint256',
    //   'uint256',
    //   'uint256',
    //   'uint256',
    // ];

    const backendSignature = backendAuthWallet.signMessage(
      ethers.utils.arrayify(hashedData)
    );

    await PolygonAssetERC1155.connect(
      ethers.provider.getSigner(users[0].address)
    ).setApprovalForAll(assetSignedAuctionAuthContract.address, true);

    const prevSellerEtherBalance = await ethers.provider.getBalance(
      users[0].address
    );

    //   struct ClaimSellerOfferRequest {
    //     address buyer;
    //     address payable seller;
    //     address token;
    //     uint256[] purchase;
    //     uint256[] auctionData;
    //     uint256[] ids;
    //     uint256[] amounts;
    //     bytes signature;
    //     bytes backendSignature;
    // }

    const claimParams = {
      buyer: users[1].address,
      seller: users[0].address,
      token: zeroAddress,
      purchase: [buyAmount, '5000000000000000000'], // buy amount,  amount to spend
      auctionData,
      ids: [tokenId],
      amounts,
      signature,
      backendSignature,
    };

    await waitFor(
      AssetSignedAuctionAuthContractAsUser.claimSellerOffer(claimParams, {
        value: '5000000000000000000',
      })
    );

    // assert.equal(
    //   new BN(
    //     (await ethers.provider.getBalance(users[0].address)).toString()
    //   ).cmp(new BN(prevSellerEtherBalance.toString())),
    //   1
    // );
    // assert.equal(
    //   new BN(
    //     await PolygonAssetERC1155.balanceOfBatch([users[0].address], [tokenId])
    //   ).toString(),
    //   '19'
    // );
    // assert.equal(
    //   new BN(
    //     await PolygonAssetERC1155.balanceOfBatch([users[1].address], [tokenId])
    //   ).toString(),
    //   '1'
    // );
  });

  it.skip('should NOT be able to claim offer if signature mismatches', async function () {
    const {
      users,
      mintAsset,
      PolygonAssetERC1155,
      assetSignedAuctionAuthContract,
    } = await setupPolygonAsset();
    const tokenId = await mintAsset(users[0].address, 20);

    const seller = users[0].address;

    const offerId = new BN(crypto.randomBytes(32), 16).toString(10);
    const startedAt = Math.floor(Date.now() / 1000) - 500;

    const AssetSignedAuctionAuthContractAsUser = assetSignedAuctionAuthContract.connect(
      ethers.provider.getSigner(users[1].address)
    );

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
          name: 'Wrong domain',
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

    await PolygonAssetERC1155.connect(
      ethers.provider.getSigner(users[0].address)
    ).setApprovalForAll(assetSignedAuctionAuthContract.address, true);

    await expect(
      AssetSignedAuctionAuthContractAsUser.claimSellerOffer(
        {
          buyer: users[1].address,
          seller: users[0].address,
          token: zeroAddress,
          purchase: [buyAmount, '5000000000000000000'],
          auctionData,
          ids: [tokenId.toString()],
          amounts,
          signature,
        },
        {value: '5000000000000000000'}
      )
    ).to.be.revertedWith('signer != from');
  });

  it.skip('should be able to claim seller offer in SAND', async function () {
    const {
      PolygonAssetERC1155,
      users,
      mintAsset,
      assetSignedAuctionAuthContract,
      Sand,
      provideSand,
    } = await setupPolygonAsset();
    const tokenId = await mintAsset(users[0].address, 20);

    const seller = users[0].address;

    const offerId = new BN(crypto.randomBytes(32), 16).toString(10);
    const startedAt = Math.floor(Date.now() / 1000) - 500;

    await provideSand(users[1].address, BigNumber.from('5000000000000000000'));

    const AssetSignedAuctionAuthContractAsUser = assetSignedAuctionAuthContract.connect(
      ethers.provider.getSigner(users[1].address)
    );

    const sandAsUser = Sand.connect(
      ethers.provider.getSigner(users[1].address)
    );

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
          token: Sand.address,
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

    await PolygonAssetERC1155.connect(
      ethers.provider.getSigner(users[0].address)
    ).setApprovalForAll(assetSignedAuctionAuthContract.address, true);

    await sandAsUser.approve(
      assetSignedAuctionAuthContract.address,
      '5000000000000000000'
    );

    const prevSellerSandBalance = await Sand.balanceOf(users[0].address);

    expect(
      await AssetSignedAuctionAuthContractAsUser.claimSellerOffer({
        buyer: users[1].address,
        seller: users[0].address,
        token: Sand.address,
        purchase: [buyAmount, '5000000000000000000'],
        auctionData,
        ids: [tokenId.toString()],
        amounts,
        signature,
      })
    ).to.be.ok;

    assert.equal(
      new BN(
        await PolygonAssetERC1155.balanceOfBatch([users[0].address], [tokenId])
      ).toString(),
      '19'
    );
    assert.equal(
      new BN(
        await PolygonAssetERC1155.balanceOfBatch([users[1].address], [tokenId])
      ).toString(),
      '1'
    );

    assert.equal(
      new BN((await Sand.balanceOf(users[0].address)).toString()).cmp(
        new BN(prevSellerSandBalance.toString())
      ),
      1
    );
  });

  it.skip('should be able to claim seller offer with basic signature', async function () {
    const {
      PolygonAssetERC1155,
      users,
      mintAsset,
      assetSignedAuctionAuthContract,
    } = await setupPolygonAsset();
    const tokenId = await mintAsset(users[0].address, 20);

    const seller = users[0].address;

    const offerId = new BN(crypto.randomBytes(32), 16).toString(10);
    const startedAt = Math.floor(Date.now() / 1000) - 500;

    const AssetSignedAuctionAuthContractAsUser = assetSignedAuctionAuthContract.connect(
      ethers.provider.getSigner(users[1].address)
    );

    const hashedData = ethers.utils.solidityKeccak256(
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
        assetSignedAuctionAuthContract.address,
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

    const wallet = await ethers.getSigner(users[0].address);

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

    await PolygonAssetERC1155.connect(
      ethers.provider.getSigner(users[0].address)
    ).setApprovalForAll(assetSignedAuctionAuthContract.address, true);

    const prevSellerEtherBalance = await ethers.provider.getBalance(
      users[0].address
    );

    await waitFor(
      AssetSignedAuctionAuthContractAsUser.claimSellerOfferUsingBasicSig(
        {
          buyer: users[1].address,
          seller: users[0].address,
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
      new BN(
        (await ethers.provider.getBalance(users[0].address)).toString()
      ).cmp(new BN(prevSellerEtherBalance.toString())),
      1
    );
    assert.equal(
      new BN(
        await PolygonAssetERC1155.balanceOfBatch([users[0].address], [tokenId])
      ).toString(),
      '19'
    );
    assert.equal(
      new BN(
        await PolygonAssetERC1155.balanceOfBatch([users[1].address], [tokenId])
      ).toString(),
      '1'
    );
  });

  it.skip('should be able to cancel offer', async function () {
    const {
      PolygonAssetERC1155,
      users,
      mintAsset,
      assetSignedAuctionAuthContract,
    } = await setupPolygonAsset();
    const tokenId = await mintAsset(users[0].address, 20);

    const seller = users[0].address;

    const offerId = new BN(crypto.randomBytes(32), 16).toString(10);
    const startedAt = Math.floor(Date.now() / 1000) - 500;

    const AssetSignedAuctionAuthContractAsUser = assetSignedAuctionAuthContract.connect(
      ethers.provider.getSigner(users[1].address)
    );

    await assetSignedAuctionAuthContract.cancelSellerOffer(offerId);

    const hashedData = ethers.utils.solidityKeccak256(
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
        assetSignedAuctionAuthContract.address,
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

    const wallet = await ethers.getSigner(users[0].address);

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

    await PolygonAssetERC1155.connect(
      ethers.provider.getSigner(users[0].address)
    ).setApprovalForAll(assetSignedAuctionAuthContract.address, true);

    expect(
      AssetSignedAuctionAuthContractAsUser.claimSellerOfferUsingBasicSig(
        {
          buyer: users[1].address,
          seller: users[0].address,
          token: zeroAddress,
          purchase: [buyAmount, '5000000000000000000'],
          auctionData,
          ids: [tokenId.toString()],
          amounts,
          signature,
        },
        {value: '5000000000000000000'}
      )
    ).to.be.revertedWith('Auction cancelled');
  });

  it.skip('should NOT be able to claim offer without sending ETH', async function () {
    const {
      PolygonAssetERC1155,
      users,
      mintAsset,
      assetSignedAuctionAuthContract,
    } = await setupPolygonAsset();
    const tokenId = await mintAsset(users[0].address, 20);

    const seller = users[0].address;

    const offerId = new BN(crypto.randomBytes(32), 16).toString(10);
    const startedAt = Math.floor(Date.now() / 1000) - 500;

    const AssetSignedAuctionAuthContractAsUser = assetSignedAuctionAuthContract.connect(
      ethers.provider.getSigner(users[1].address)
    );

    // await assetSignedAuctionAuthContract.cancelSellerOffer(offerId);

    const hashedData = ethers.utils.solidityKeccak256(
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
        assetSignedAuctionAuthContract.address,
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

    const wallet = await ethers.getSigner(users[0].address);

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

    await PolygonAssetERC1155.setApprovalForAll(
      assetSignedAuctionAuthContract.address,
      true
    );

    await expect(
      AssetSignedAuctionAuthContractAsUser.claimSellerOfferUsingBasicSig({
        buyer: users[1].address,
        seller: users[0].address,
        token: zeroAddress,
        purchase: [buyAmount, '5000000000000000000'],
        auctionData,
        ids: [tokenId.toString()],
        amounts,
        signature,
      })
    ).to.be.revertedWith('ETH < total');
  });

  it.skip('should NOT be able to claim offer without enough SAND', async function () {
    const {
      users,
      mintAsset,
      assetSignedAuctionAuthContract,
      Sand,
    } = await setupPolygonAsset();
    const tokenId = await mintAsset(users[0].address, 20);

    const seller = users[0].address;

    const offerId = new BN(crypto.randomBytes(32), 16).toString(10);
    const startedAt = Math.floor(Date.now() / 1000) - 500;

    const AssetSignedAuctionAuthContractAsUser = assetSignedAuctionAuthContract.connect(
      ethers.provider.getSigner(users[1].address)
    );

    const sandAsUser = Sand.connect(
      ethers.provider.getSigner(users[1].address)
    );

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
          token: Sand.address,
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

    await users[0].Asset.setApprovalForAll(
      assetSignedAuctionAuthContract.address,
      true
    );
    await sandAsUser.approve(
      assetSignedAuctionAuthContract.address,
      '5000000000000000000'
    );

    await sandAsUser.transfer(
      users[2].address,
      (await Sand.balanceOf(users[1].address)).toString()
    );

    await expect(
      AssetSignedAuctionAuthContractAsUser.claimSellerOffer({
        buyer: users[1].address,
        seller: users[0].address,
        token: Sand.address,
        purchase: [buyAmount, '5000000000000000000'],
        auctionData,
        ids: [tokenId.toString()],
        amounts,
        signature,
      })
    ).to.be.revertedWith('INSUFFICIENT_FUNDS');
  });

  it.skip('should NOT be able to claim offer if it did not start yet', async function () {
    const {
      users,
      mintAsset,
      assetSignedAuctionAuthContract,
    } = await setupPolygonAsset();
    const tokenId = await mintAsset(users[0].address, 20);

    const seller = users[0].address;

    const offerId = new BN(crypto.randomBytes(32), 16).toString(10);
    const startedAt = Math.floor(Date.now() / 1000) + 1000;

    const AssetSignedAuctionAuthContractAsUser = assetSignedAuctionAuthContract.connect(
      ethers.provider.getSigner(users[1].address)
    );

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

    await users[0].Asset.setApprovalForAll(
      assetSignedAuctionAuthContract.address,
      true
    );

    await expect(
      AssetSignedAuctionAuthContractAsUser.claimSellerOffer(
        {
          buyer: users[1].address,
          seller: users[0].address,
          token: zeroAddress,
          purchase: [buyAmount, '5000000000000000000'],
          auctionData,
          ids: [tokenId.toString()],
          amounts,
          signature,
        },
        {value: '5000000000000000000'}
      )
    ).to.be.revertedWith("Auction didn't start yet");
  });

  it.skip('should NOT be able to claim offer if it already ended', async function () {
    const {
      users,
      mintAsset,
      assetSignedAuctionAuthContract,
    } = await setupPolygonAsset();
    const tokenId = await mintAsset(users[0].address, 20);

    const seller = users[0].address;

    const offerId = new BN(crypto.randomBytes(32), 16).toString(10);
    const startedAt = Math.floor(Date.now() / 1000) - 10000;

    const AssetSignedAuctionAuthContractAsUser = assetSignedAuctionAuthContract.connect(
      ethers.provider.getSigner(users[1].address)
    );

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

    await users[0].Asset.setApprovalForAll(
      assetSignedAuctionAuthContract.address,
      true
    );

    await expect(
      AssetSignedAuctionAuthContractAsUser.claimSellerOffer(
        {
          buyer: users[1].address,
          seller: users[0].address,
          token: zeroAddress,
          purchase: [buyAmount, '5000000000000000000'],
          auctionData,
          ids: [tokenId.toString()],
          amounts,
          signature,
        },
        {value: '5000000000000000000'}
      )
    ).to.be.revertedWith('Auction finished');
  });
});
