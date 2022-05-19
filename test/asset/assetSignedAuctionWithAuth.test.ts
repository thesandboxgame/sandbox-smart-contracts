import {ethers} from 'hardhat';
import {
  assetFixtures,
  assetSignedAuctionFixtures,
  signAuthMessageAs,
} from '../common/fixtures/asset';
import {waitFor, withSnapshot} from '../utils';
import {transferSand} from '../polygon/catalyst/utils';
import BN from 'bn.js';
import crypto from 'crypto';
import {BigNumber, constants} from 'ethers';
import {assert, expect} from 'chai';

const zeroAddress = constants.AddressZero;

const backendAuthWallet = new ethers.Wallet(
  '0x4242424242424242424242424242424242424242424242424242424242424242'
);

const AUCTION_TYPEHASH = ethers.utils.solidityKeccak256(
  ['string'],
  [
    'Auction(address to,address from,address token,uint256 offerId,uint256 startingPrice,uint256 endingPrice,uint256 startedAt,uint256 duration,uint256 packs,bytes ids,bytes amounts)',
  ]
);

const setupAssetSignedAuction = withSnapshot(
  ['Asset', 'AuthValidator', 'AssetSignedAuctionWithAuth', 'Sand'],
  async () => {
    return {
      assetFixture: await assetFixtures(),
      assetSignedAuctionFixture: await assetSignedAuctionFixtures(),
    };
  }
);

// eslint-disable-next-line mocha/no-skipped-tests
describe.only('assetSignedAuctionWithAuth', function () {
  const startingPrice = new BN('1000000000000000000');
  const endingPrice = new BN('5000000000000000000');
  const duration = 1000;
  const packs = 1;
  const buyAmount = 1;
  const amounts = [1];

  it('should be able to set fee', async function () {
    const {
      assetSignedAuctionFixture,
      assetFixture,
    } = await setupAssetSignedAuction();
    const {users} = assetFixture;
    const {assetSignedAuctionAuthContract, Admin} = assetSignedAuctionFixture;

    const AssetSignedAuctionAuthContractAsAdmin = assetSignedAuctionAuthContract.connect(
      ethers.provider.getSigner(Admin)
    );

    const newFee = 500;

    await waitFor(
      AssetSignedAuctionAuthContractAsAdmin.setFee(users[1].address, newFee)
    );

    const fee = await assetSignedAuctionAuthContract._fee10000th();

    expect(fee).to.be.equal(newFee);
  });

  it('should fail setting fee - no admin', async function () {
    const {
      assetSignedAuctionFixture,
      assetFixture,
    } = await setupAssetSignedAuction();
    const {users} = assetFixture;
    const {assetSignedAuctionAuthContract} = assetSignedAuctionFixture;

    const AssetSignedAuctionAuthContractAsUser = assetSignedAuctionAuthContract.connect(
      ethers.provider.getSigner(users[0].address)
    );

    const newFee = 500;

    await expect(
      AssetSignedAuctionAuthContractAsUser.setFee(users[1].address, newFee)
    ).to.be.revertedWith('only admin can change fee');
  });

  it('should fail is buyer == seller', async function () {
    const {
      assetSignedAuctionFixture,
      assetFixture,
    } = await setupAssetSignedAuction();
    const {users, mintAsset} = assetFixture;
    const {assetSignedAuctionAuthContract} = assetSignedAuctionFixture;

    const tokenId = await mintAsset(users[0].address, 20);

    const seller = users[0].address;
    const buyer = users[1].address;

    const offerId = new BN(crypto.randomBytes(32), 16).toString(10);
    const startedAt = Math.floor(Date.now() / 1000) - 500;

    const AssetSignedAuctionAuthContractAsUser = assetSignedAuctionAuthContract.connect(
      ethers.provider.getSigner(buyer)
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
              name: 'chainId',
              type: 'uint256',
            },
            {
              name: 'verifyingContract',
              type: 'address',
            },
          ],
          Auction: [
            {name: 'to', type: 'address'},
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
          chainId: 31337,
          verifyingContract: AssetSignedAuctionAuthContractAsUser.address,
        },
        message: {
          to: buyer,
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

    const backendSignature = await signAuthMessageAs(
      backendAuthWallet,
      AUCTION_TYPEHASH,
      seller, //buyer = seller
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

    await users[0].Asset.setApprovalForAll(
      assetSignedAuctionAuthContract.address,
      true
    );

    await expect(
      AssetSignedAuctionAuthContractAsUser.claimSellerOffer(
        {
          buyer: seller,
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
    ).to.be.revertedWith('not authorized');
  });

  it('should fail is ids.length != amounts.length', async function () {
    const {
      assetSignedAuctionFixture,
      assetFixture,
    } = await setupAssetSignedAuction();
    const {users, mintAsset} = assetFixture;
    const {assetSignedAuctionAuthContract} = assetSignedAuctionFixture;

    const tokenId = await mintAsset(users[0].address, 20);

    const seller = users[0].address;
    const buyer = users[1].address;

    const wrongAmount = [0, 1];

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
              name: 'chainId',
              type: 'uint256',
            },
            {
              name: 'verifyingContract',
              type: 'address',
            },
          ],
          Auction: [
            {name: 'to', type: 'address'},
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
          chainId: 31337,
          verifyingContract: AssetSignedAuctionAuthContractAsUser.address,
        },
        message: {
          to: buyer,
          from: seller,
          token: zeroAddress,
          offerId,
          startingPrice: startingPrice.toString(),
          endingPrice: endingPrice.toString(),
          startedAt,
          duration,
          packs,
          ids: ethers.utils.solidityPack(['uint[]'], [[tokenId]]),
          amounts: ethers.utils.solidityPack(['uint[]'], [wrongAmount]),
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

    const backendSignature = await signAuthMessageAs(
      backendAuthWallet,
      AUCTION_TYPEHASH,
      buyer,
      seller,
      zeroAddress,
      auctionData[0],
      auctionData[1],
      auctionData[2],
      auctionData[3],
      auctionData[4],
      auctionData[5],
      [tokenId],
      wrongAmount
    );

    await users[0].Asset.setApprovalForAll(
      assetSignedAuctionAuthContract.address,
      true
    );

    await expect(
      AssetSignedAuctionAuthContractAsUser.claimSellerOffer(
        {
          buyer: buyer,
          seller: seller,
          token: zeroAddress,
          purchase: [buyAmount, '5000000000000000000'],
          auctionData,
          ids: [tokenId.toString()],
          amounts: wrongAmount,
          signature,
          backendSignature,
        },
        {value: '5000000000000000000'}
      )
    ).to.be.revertedWith('ids and amounts length not matching');
  });

  it('should fail - insuficient amount', async function () {
    const {
      assetSignedAuctionFixture,
      assetFixture,
    } = await setupAssetSignedAuction();
    const {users, mintAsset} = assetFixture;
    const {assetSignedAuctionAuthContract} = assetSignedAuctionFixture;

    const tokenId = await mintAsset(users[0].address, 20);

    const seller = users[0].address;
    const buyer = users[1].address;

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
              name: 'chainId',
              type: 'uint256',
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
          chainId: 31337,
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
          ids: ethers.utils.solidityPack(['uint[]'], [[tokenId]]),
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

    const backendSignature = await signAuthMessageAs(
      backendAuthWallet,
      AUCTION_TYPEHASH,
      buyer,
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

    await users[0].Asset.setApprovalForAll(
      assetSignedAuctionAuthContract.address,
      true
    );

    await expect(
      AssetSignedAuctionAuthContractAsUser.claimSellerOffer(
        {
          buyer: buyer,
          seller: seller,
          token: zeroAddress,
          purchase: [30, '5000000000000000000'],
          auctionData,
          ids: [tokenId.toString()],
          amounts,
          signature,
          backendSignature,
        },
        {value: '5000000000000000000'}
      )
    ).to.be.revertedWith('Buy amount exceeds sell amount');
  });

  it('should be able to claim seller offer in ETH', async function () {
    const {
      assetSignedAuctionFixture,
      assetFixture,
    } = await setupAssetSignedAuction();
    const {Asset, users, mintAsset} = assetFixture;
    const {assetSignedAuctionAuthContract} = assetSignedAuctionFixture;

    const tokenId = await mintAsset(users[0].address, 20);

    const seller = users[0].address;
    const buyer = users[1].address;

    const offerId = new BN(crypto.randomBytes(32), 16).toString(10);
    const startedAt = Math.floor(Date.now() / 1000) - 500;

    const AssetSignedAuctionAuthContractAsUser = assetSignedAuctionAuthContract.connect(
      ethers.provider.getSigner(buyer)
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
              name: 'chainId',
              type: 'uint256',
            },
            {
              name: 'verifyingContract',
              type: 'address',
            },
          ],
          Auction: [
            {name: 'to', type: 'address'},
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
          chainId: 31337,
          verifyingContract: AssetSignedAuctionAuthContractAsUser.address,
        },
        message: {
          to: buyer,
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

    const backendSignature = await signAuthMessageAs(
      backendAuthWallet,
      AUCTION_TYPEHASH,
      buyer,
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

    await users[0].Asset.setApprovalForAll(
      assetSignedAuctionAuthContract.address,
      true
    );

    const prevSellerEtherBalance = await ethers.provider.getBalance(seller);

    await waitFor(
      AssetSignedAuctionAuthContractAsUser.claimSellerOffer(
        {
          buyer: buyer,
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
      new BN((await ethers.provider.getBalance(seller)).toString()).cmp(
        new BN(prevSellerEtherBalance.toString())
      ),
      1
    );
    assert.equal(
      new BN(await Asset.balanceOfBatch([seller], [tokenId])).toString(),
      '19'
    );
    assert.equal(
      new BN(await Asset.balanceOfBatch([buyer], [tokenId])).toString(),
      '1'
    );
  });

  it('should NOT be able to claim offer if signature mismatches', async function () {
    const {
      assetSignedAuctionFixture,
      assetFixture,
    } = await setupAssetSignedAuction();
    const {users, mintAsset} = assetFixture;
    const {assetSignedAuctionAuthContract} = assetSignedAuctionFixture;
    const tokenId = await mintAsset(users[0].address, 20);

    const seller = users[0].address;
    const buyer = users[1].address;

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
              name: 'chainId',
              type: 'uint256',
            },
            {
              name: 'verifyingContract',
              type: 'address',
            },
          ],
          Auction: [
            {name: 'to', type: 'address'},
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
          chainId: 31337,
          verifyingContract: AssetSignedAuctionAuthContractAsUser.address,
        },
        message: {
          to: buyer,
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

    const backendSignature = await signAuthMessageAs(
      backendAuthWallet,
      AUCTION_TYPEHASH,
      buyer,
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

    await users[0].Asset.setApprovalForAll(
      assetSignedAuctionAuthContract.address,
      true
    );

    await expect(
      AssetSignedAuctionAuthContractAsUser.claimSellerOffer(
        {
          buyer: buyer,
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
    ).to.be.revertedWith('signer != from');
  });

  it('should NOT be able to claim offer with invalid backend signature', async function () {
    const {
      assetSignedAuctionFixture,
      assetFixture,
    } = await setupAssetSignedAuction();
    const {users, mintAsset} = assetFixture;
    const {assetSignedAuctionAuthContract} = assetSignedAuctionFixture;
    const tokenId = await mintAsset(users[0].address, 20);

    const seller = users[0].address;
    const buyer = users[1].address;

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
              name: 'chainId',
              type: 'uint256',
            },
            {
              name: 'verifyingContract',
              type: 'address',
            },
          ],
          Auction: [
            {name: 'to', type: 'address'},
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
          chainId: 31337,
          verifyingContract: AssetSignedAuctionAuthContractAsUser.address,
        },
        message: {
          to: buyer,
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

    const wrongBackendSig = new ethers.Wallet(users[0].address);

    const backendSignature = await signAuthMessageAs(
      wrongBackendSig,
      AUCTION_TYPEHASH,
      buyer,
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

    await users[0].Asset.setApprovalForAll(
      assetSignedAuctionAuthContract.address,
      true
    );

    await expect(
      AssetSignedAuctionAuthContractAsUser.claimSellerOffer(
        {
          buyer: buyer,
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
    ).to.be.revertedWith('INVALID_AUTH');
  });

  it('should be able to claim seller offer in SAND', async function () {
    const {
      assetSignedAuctionFixture,
      assetFixture,
    } = await setupAssetSignedAuction();
    const {Asset, users, mintAsset} = assetFixture;
    const {assetSignedAuctionAuthContract, Sand} = assetSignedAuctionFixture;
    const tokenId = await mintAsset(users[0].address, 20);

    const seller = users[0].address;
    const buyer = users[1].address;

    const offerId = new BN(crypto.randomBytes(32), 16).toString(10);
    const startedAt = Math.floor(Date.now() / 1000) - 500;

    const AssetSignedAuctionAuthContractAsUser = assetSignedAuctionAuthContract.connect(
      ethers.provider.getSigner(buyer)
    );

    const sandAsUser = Sand.connect(ethers.provider.getSigner(buyer));

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
              name: 'chainId',
              type: 'uint256',
            },
            {
              name: 'verifyingContract',
              type: 'address',
            },
          ],
          Auction: [
            {name: 'to', type: 'address'},
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
          chainId: 31337,
          verifyingContract: AssetSignedAuctionAuthContractAsUser.address,
        },
        message: {
          to: buyer,
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

    const backendSignature = await signAuthMessageAs(
      backendAuthWallet,
      AUCTION_TYPEHASH,
      buyer,
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

    await transferSand(Sand, buyer, BigNumber.from('5000000000000000000'));

    await users[0].Asset.setApprovalForAll(
      assetSignedAuctionAuthContract.address,
      true
    );
    await sandAsUser.approve(
      assetSignedAuctionAuthContract.address,
      '5000000000000000000'
    );

    const prevSellerSandBalance = await Sand.balanceOf(users[0].address);

    expect(
      AssetSignedAuctionAuthContractAsUser.claimSellerOffer({
        buyer: buyer,
        seller: seller,
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
      new BN(await Asset.balanceOfBatch([seller], [tokenId])).toString(),
      '19'
    );
    assert.equal(
      new BN(await Asset.balanceOfBatch([buyer], [tokenId])).toString(),
      '1'
    );

    assert.equal(
      new BN((await Sand.balanceOf(seller)).toString()).cmp(
        new BN(prevSellerSandBalance.toString())
      ),
      1
    );
  });

  it('should be able to cancel offer', async function () {
    const {
      assetSignedAuctionFixture,
      assetFixture,
    } = await setupAssetSignedAuction();
    const {users, mintAsset} = assetFixture;
    const {assetSignedAuctionAuthContract} = assetSignedAuctionFixture;
    const tokenId = await mintAsset(users[0].address, 20);

    const seller = users[0].address;
    const buyer = users[1].address;

    const offerId = new BN(crypto.randomBytes(32), 16).toString(10);
    const startedAt = Math.floor(Date.now() / 1000) - 500;

    const AssetSignedAuctionAuthContractAsUser = assetSignedAuctionAuthContract.connect(
      ethers.provider.getSigner(users[1].address)
    );

    await assetSignedAuctionAuthContract.cancelSellerOffer(offerId);

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
              name: 'chainId',
              type: 'uint256',
            },
            {
              name: 'verifyingContract',
              type: 'address',
            },
          ],
          Auction: [
            {name: 'to', type: 'address'},
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
          chainId: 31337,
          verifyingContract: AssetSignedAuctionAuthContractAsUser.address,
        },
        message: {
          to: buyer,
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

    const backendSignature = await signAuthMessageAs(
      backendAuthWallet,
      AUCTION_TYPEHASH,
      buyer,
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

    await users[0].Asset.setApprovalForAll(
      assetSignedAuctionAuthContract.address,
      true
    );

    expect(
      AssetSignedAuctionAuthContractAsUser.claimSellerOffer(
        {
          buyer: buyer,
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
    ).to.be.revertedWith('Auction cancelled');
  });

  it('should NOT be able to claim offer without enough SAND', async function () {
    const {
      assetSignedAuctionFixture,
      assetFixture,
    } = await setupAssetSignedAuction();
    const {users, mintAsset} = assetFixture;
    const {assetSignedAuctionAuthContract, Sand} = assetSignedAuctionFixture;
    const tokenId = await mintAsset(users[0].address, 20);

    const seller = users[0].address;
    const buyer = users[1].address;

    const offerId = new BN(crypto.randomBytes(32), 16).toString(10);
    const startedAt = Math.floor(Date.now() / 1000) - 500;

    const AssetSignedAuctionAuthContractAsUser = assetSignedAuctionAuthContract.connect(
      ethers.provider.getSigner(buyer)
    );

    const sandAsUser = Sand.connect(ethers.provider.getSigner(buyer));

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
              name: 'chainId',
              type: 'uint256',
            },
            {
              name: 'verifyingContract',
              type: 'address',
            },
          ],
          Auction: [
            {name: 'to', type: 'address'},
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
          chainId: 31337,
          verifyingContract: AssetSignedAuctionAuthContractAsUser.address,
        },
        message: {
          to: buyer,
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

    const backendSignature = await signAuthMessageAs(
      backendAuthWallet,
      AUCTION_TYPEHASH,
      buyer,
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
      (await Sand.balanceOf(buyer)).toString()
    );

    await expect(
      AssetSignedAuctionAuthContractAsUser.claimSellerOffer({
        buyer: buyer,
        seller: seller,
        token: Sand.address,
        purchase: [buyAmount, '5000000000000000000'],
        auctionData,
        ids: [tokenId.toString()],
        amounts,
        signature,
        backendSignature,
      })
    ).to.be.revertedWith('not enough fund');
  });

  it('should NOT be able to claim offer if it did not start yet', async function () {
    const {
      assetSignedAuctionFixture,
      assetFixture,
    } = await setupAssetSignedAuction();
    const {users, mintAsset} = assetFixture;
    const {assetSignedAuctionAuthContract} = assetSignedAuctionFixture;
    const tokenId = await mintAsset(users[0].address, 20);

    const seller = users[0].address;
    const buyer = users[1].address;

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
              name: 'chainId',
              type: 'uint256',
            },
            {
              name: 'verifyingContract',
              type: 'address',
            },
          ],
          Auction: [
            {name: 'to', type: 'address'},
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
          chainId: 31337,
          verifyingContract: AssetSignedAuctionAuthContractAsUser.address,
        },
        message: {
          to: buyer,
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

    const backendSignature = await signAuthMessageAs(
      backendAuthWallet,
      AUCTION_TYPEHASH,
      buyer,
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

    await users[0].Asset.setApprovalForAll(
      assetSignedAuctionAuthContract.address,
      true
    );

    await expect(
      AssetSignedAuctionAuthContractAsUser.claimSellerOffer(
        {
          buyer: buyer,
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
    ).to.be.revertedWith("Auction didn't start yet");
  });

  it('should NOT be able to claim offer if it already ended', async function () {
    const {
      assetSignedAuctionFixture,
      assetFixture,
    } = await setupAssetSignedAuction();
    const {users, mintAsset} = assetFixture;
    const {assetSignedAuctionAuthContract} = assetSignedAuctionFixture;
    const tokenId = await mintAsset(users[0].address, 20);

    const seller = users[0].address;
    const buyer = users[1].address;

    const offerId = new BN(crypto.randomBytes(32), 16).toString(10);
    const startedAt = Math.floor(Date.now() / 1000) - 10000;

    const AssetSignedAuctionAuthContractAsUser = assetSignedAuctionAuthContract.connect(
      ethers.provider.getSigner(buyer)
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
              name: 'chainId',
              type: 'uint256',
            },
            {
              name: 'verifyingContract',
              type: 'address',
            },
          ],
          Auction: [
            {name: 'to', type: 'address'},
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
          chainId: 31337,
          verifyingContract: AssetSignedAuctionAuthContractAsUser.address,
        },
        message: {
          to: buyer,
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

    const backendSignature = await signAuthMessageAs(
      backendAuthWallet,
      AUCTION_TYPEHASH,
      buyer,
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

    await users[0].Asset.setApprovalForAll(
      assetSignedAuctionAuthContract.address,
      true
    );

    await expect(
      AssetSignedAuctionAuthContractAsUser.claimSellerOffer(
        {
          buyer: buyer,
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
    ).to.be.revertedWith('Auction finished');
  });
});
