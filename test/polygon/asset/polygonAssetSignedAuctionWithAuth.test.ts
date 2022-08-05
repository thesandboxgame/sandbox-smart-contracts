import {ethers} from 'hardhat';
import {setupPolygonAsset, signAuthMessageAs} from './fixtures';
import {waitFor} from '../../utils';
import BN from 'bn.js';
import crypto from 'crypto';
import {BigNumber, constants} from 'ethers';
import {assert} from 'chai';
import {expect} from '../../chai-setup';
import {auction712Data} from './fixtures_auction712Data';

const zeroAddress = constants.AddressZero;
const startingPrice = new BN('1000000000000000000');
const endingPrice = new BN('5000000000000000000');
const duration = 1000; // seconds
const packs = 1;
const buyAmount = 1;
const amounts = [1];
const name = 'The Sandbox';
const version = '1';

const AUCTION_TYPEHASH = ethers.utils.solidityKeccak256(
  ['string'],
  [
    'Auction(address from,address token,uint256 offerId,uint256 startingPrice,uint256 endingPrice,uint256 startedAt,uint256 duration,uint256 packs,bytes ids,bytes amounts)',
  ]
);

const backendAuthWallet = new ethers.Wallet(
  '0x4242424242424242424242424242424242424242424242424242424242424242'
);

describe('PolygonAssetSignedAuctionAuth', function () {
  it('should be able to claim seller offer in ETH', async function () {
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

    const message = {
      from: seller,
      token: zeroAddress,
      offerId,
      startingPrice: startingPrice.toString(),
      endingPrice: endingPrice.toString(),
      startedAt,
      duration,
      packs,
      ids: ethers.utils.solidityPack(['uint[]'], [[tokenId]]),
      amounts: ethers.utils.solidityPack(['uint[]'], [amounts]),
    };

    const signature = await ethers.provider.send('eth_signTypedData_v4', [
      seller,
      auction712Data(
        name,
        version,
        AssetSignedAuctionAuthContractAsUser,
        message
      ),
    ]);

    const auctionData = [
      offerId,
      startingPrice.toString(),
      endingPrice.toString(),
      startedAt,
      duration,
      packs,
    ];

    const backendSignature = await signAuthMessageAs(
      backendAuthWallet,
      AUCTION_TYPEHASH,
      seller,
      zeroAddress,
      auctionData[0],
      auctionData[1],
      auctionData[2],
      auctionData[3],
      auctionData[4],
      auctionData[5],
      [tokenId],
      [amounts]
    );

    const assetAsUser = await PolygonAssetERC1155.connect(
      ethers.provider.getSigner(users[0].address)
    );

    await assetAsUser.setApprovalForAll(
      assetSignedAuctionAuthContract.address,
      true
    );

    const prevSellerEtherBalance = await ethers.provider.getBalance(
      users[0].address
    );

    await waitFor(
      AssetSignedAuctionAuthContractAsUser.claimSellerOffer(
        {
          buyer: users[1].address,
          seller: seller,
          token: zeroAddress,
          purchase: [buyAmount, '5000000000000000000'],
          auctionData,
          ids: [tokenId.toString()],
          amounts,
          signature,
          backendSignature,
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

  it('should NOT be able to claim offer if signature mismatches', async function () {
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

    const message = {
      from: seller,
      token: zeroAddress,
      offerId,
      startingPrice: startingPrice.toString(),
      endingPrice: endingPrice.toString(),
      startedAt,
      duration,
      packs,
      ids: ethers.utils.solidityPack(['uint[]'], [[tokenId]]),
      amounts: ethers.utils.solidityPack(['uint[]'], [amounts]),
    };

    const signature = await ethers.provider.send('eth_signTypedData_v4', [
      seller,
      auction712Data(
        'Wrong Domain', // Bad param
        version,
        AssetSignedAuctionAuthContractAsUser,
        message
      ),
    ]);

    const auctionData = [
      offerId,
      startingPrice.toString(),
      endingPrice.toString(),
      startedAt,
      duration,
      packs,
    ];

    const backendSignature = await signAuthMessageAs(
      backendAuthWallet,
      AUCTION_TYPEHASH,
      seller,
      zeroAddress,
      auctionData[0],
      auctionData[1],
      auctionData[2],
      auctionData[3],
      auctionData[4],
      auctionData[5],
      [tokenId],
      [amounts]
    );

    const assetAsUser = await PolygonAssetERC1155.connect(
      ethers.provider.getSigner(users[0].address)
    );

    await assetAsUser.setApprovalForAll(
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
          backendSignature,
        },
        {value: '5000000000000000000'}
      )
    ).to.be.revertedWith('signer != from');
  });

  it('should be able to claim seller offer in SAND', async function () {
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

    const message = {
      from: seller,
      token: Sand.address,
      offerId,
      startingPrice: startingPrice.toString(),
      endingPrice: endingPrice.toString(),
      startedAt,
      duration,
      packs,
      ids: ethers.utils.solidityPack(['uint[]'], [[tokenId]]),
      amounts: ethers.utils.solidityPack(['uint[]'], [amounts]),
    };

    const signature = await ethers.provider.send('eth_signTypedData_v4', [
      seller,
      auction712Data(
        name,
        version,
        AssetSignedAuctionAuthContractAsUser,
        message
      ),
    ]);

    const auctionData = [
      offerId,
      startingPrice.toString(),
      endingPrice.toString(),
      startedAt,
      duration,
      packs,
    ];

    const backendSignature = await signAuthMessageAs(
      backendAuthWallet,
      AUCTION_TYPEHASH,
      seller,
      Sand.address,
      auctionData[0],
      auctionData[1],
      auctionData[2],
      auctionData[3],
      auctionData[4],
      auctionData[5],
      [tokenId],
      [amounts]
    );

    const assetAsUser = await PolygonAssetERC1155.connect(
      ethers.provider.getSigner(users[0].address)
    );

    await assetAsUser.setApprovalForAll(
      assetSignedAuctionAuthContract.address,
      true
    );

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
        backendSignature,
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

  it('should be able to claim seller offer with basic signature', async function () {
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

    const backendSignature = await signAuthMessageAs(
      backendAuthWallet,
      AUCTION_TYPEHASH,
      seller,
      zeroAddress,
      auctionData[0],
      auctionData[1],
      auctionData[2],
      auctionData[3],
      auctionData[4],
      auctionData[5],
      [tokenId],
      [amounts]
    );

    const assetAsUser = await PolygonAssetERC1155.connect(
      ethers.provider.getSigner(users[0].address)
    );

    await assetAsUser.setApprovalForAll(
      assetSignedAuctionAuthContract.address,
      true
    );

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
          backendSignature,
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

  it('should be able to cancel offer', async function () {
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
    const assetSignedAuctionAuthContractAsSeller = assetSignedAuctionAuthContract.connect(
      ethers.provider.getSigner(seller)
    );
    await assetSignedAuctionAuthContractAsSeller.cancelSellerOffer(offerId);

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

    const backendSignature = await signAuthMessageAs(
      backendAuthWallet,
      AUCTION_TYPEHASH,
      seller,
      zeroAddress,
      auctionData[0],
      auctionData[1],
      auctionData[2],
      auctionData[3],
      auctionData[4],
      auctionData[5],
      [tokenId],
      [amounts]
    );

    const assetAsUser = await PolygonAssetERC1155.connect(
      ethers.provider.getSigner(users[0].address)
    );

    await assetAsUser.setApprovalForAll(
      assetSignedAuctionAuthContract.address,
      true
    );

    await expect(
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
          backendSignature,
        },
        {value: '5000000000000000000'}
      )
    ).to.be.revertedWith('Auction cancelled');
  });

  it('should NOT be able to claim offer without sending ETH', async function () {
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

    const backendSignature = await signAuthMessageAs(
      backendAuthWallet,
      AUCTION_TYPEHASH,
      seller,
      zeroAddress,
      auctionData[0],
      auctionData[1],
      auctionData[2],
      auctionData[3],
      auctionData[4],
      auctionData[5],
      [tokenId],
      [amounts]
    );

    const assetAsUser = await PolygonAssetERC1155.connect(
      ethers.provider.getSigner(users[0].address)
    );

    await assetAsUser.setApprovalForAll(
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
        backendSignature,
      })
    ).to.be.revertedWith('ETH < total');
  });

  it('should NOT be able to claim offer without enough SAND', async function () {
    const {
      users,
      mintAsset,
      assetSignedAuctionAuthContract,
      Sand,
      PolygonAssetERC1155,
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

    const message = {
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
    };

    const signature = await ethers.provider.send('eth_signTypedData_v4', [
      seller,
      auction712Data(
        name,
        version,
        AssetSignedAuctionAuthContractAsUser,
        message
      ),
    ]);
    const auctionData = [
      offerId,
      startingPrice.toString(),
      endingPrice.toString(),
      startedAt,
      duration,
      packs,
    ];

    const backendSignature = await signAuthMessageAs(
      backendAuthWallet,
      AUCTION_TYPEHASH,
      seller,
      Sand.address,
      auctionData[0],
      auctionData[1],
      auctionData[2],
      auctionData[3],
      auctionData[4],
      auctionData[5],
      [tokenId],
      [amounts]
    );

    const assetAsUser = await PolygonAssetERC1155.connect(
      ethers.provider.getSigner(users[0].address)
    );

    await assetAsUser.setApprovalForAll(
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
        backendSignature,
      })
    ).to.be.revertedWith('INSUFFICIENT_FUNDS');
  });

  it('should NOT be able to claim offer if it did not start yet', async function () {
    const {
      users,
      mintAsset,
      assetSignedAuctionAuthContract,
      PolygonAssetERC1155,
    } = await setupPolygonAsset();
    const tokenId = await mintAsset(users[0].address, 20);

    const seller = users[0].address;

    const offerId = new BN(crypto.randomBytes(32), 16).toString(10);
    const startedAt = Math.floor(Date.now() / 1000) + 1000;

    const AssetSignedAuctionAuthContractAsUser = assetSignedAuctionAuthContract.connect(
      ethers.provider.getSigner(users[1].address)
    );

    const message = {
      from: seller,
      token: zeroAddress,
      offerId,
      startingPrice: startingPrice.toString(),
      endingPrice: endingPrice.toString(),
      startedAt,
      duration,
      packs,
      ids: ethers.utils.solidityPack(['uint[]'], [[tokenId]]),
      amounts: ethers.utils.solidityPack(['uint[]'], [amounts]),
    };

    const signature = await ethers.provider.send('eth_signTypedData_v4', [
      seller,
      auction712Data(
        name,
        version,
        AssetSignedAuctionAuthContractAsUser,
        message
      ),
    ]);

    const auctionData = [
      offerId,
      startingPrice.toString(),
      endingPrice.toString(),
      startedAt,
      duration,
      packs,
    ];

    const backendSignature = await signAuthMessageAs(
      backendAuthWallet,
      AUCTION_TYPEHASH,
      seller,
      zeroAddress,
      auctionData[0],
      auctionData[1],
      auctionData[2],
      auctionData[3],
      auctionData[4],
      auctionData[5],
      [tokenId],
      [amounts]
    );

    const assetAsUser = await PolygonAssetERC1155.connect(
      ethers.provider.getSigner(users[0].address)
    );

    await assetAsUser.setApprovalForAll(
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
          backendSignature,
        },
        {value: '5000000000000000000'}
      )
    ).to.be.revertedWith("Auction didn't start yet");
  });

  it('should NOT be able to claim offer if it already ended', async function () {
    const {
      users,
      mintAsset,
      assetSignedAuctionAuthContract,
      PolygonAssetERC1155,
    } = await setupPolygonAsset();
    const tokenId = await mintAsset(users[0].address, 20);

    const seller = users[0].address;

    const offerId = new BN(crypto.randomBytes(32), 16).toString(10);
    const startedAt = Math.floor(Date.now() / 1000) - 10000;

    const AssetSignedAuctionAuthContractAsUser = assetSignedAuctionAuthContract.connect(
      ethers.provider.getSigner(users[1].address)
    );

    const message = {
      from: seller,
      token: zeroAddress,
      offerId,
      startingPrice: startingPrice.toString(),
      endingPrice: endingPrice.toString(),
      startedAt,
      duration,
      packs,
      ids: ethers.utils.solidityPack(['uint[]'], [[tokenId]]),
      amounts: ethers.utils.solidityPack(['uint[]'], [amounts]),
    };

    const signature = await ethers.provider.send('eth_signTypedData_v4', [
      seller,
      auction712Data(
        name,
        version,
        AssetSignedAuctionAuthContractAsUser,
        message
      ),
    ]);

    const auctionData = [
      offerId,
      startingPrice.toString(),
      endingPrice.toString(),
      startedAt,
      duration,
      packs,
    ];

    const backendSignature = await signAuthMessageAs(
      backendAuthWallet,
      AUCTION_TYPEHASH,
      seller,
      zeroAddress,
      auctionData[0],
      auctionData[1],
      auctionData[2],
      auctionData[3],
      auctionData[4],
      auctionData[5],
      [tokenId],
      [amounts]
    );

    const assetAsUser = await PolygonAssetERC1155.connect(
      ethers.provider.getSigner(users[0].address)
    );

    await assetAsUser.setApprovalForAll(
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
          backendSignature,
        },
        {value: '5000000000000000000'}
      )
    ).to.be.revertedWith('Auction finished');
  });
});
