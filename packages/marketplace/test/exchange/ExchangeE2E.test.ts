import {expect} from 'chai';
import {deployFixtures} from '../fixtures';
import {loadFixture, mine} from '@nomicfoundation/hardhat-network-helpers';
import {
  AssetERC1155,
  AssetERC20,
  AssetERC721,
  FeeRecipientsData,
  LibPartData,
} from '../utils/assets.ts';

import {hashKey, OrderDefault, signOrder} from '../utils/order.ts';
import {ZeroAddress} from 'ethers';

describe('Exchange End to End test', function () {
  it('should not execute match order when order start time is in the future', async function () {
    const {
      ExchangeContractAsUser,
      OrderValidatorAsAdmin,
      ERC20Contract,
      ERC20Contract2,
      user1: maker,
      user2: taker,
    } = await loadFixture(deployFixtures);

    await ERC20Contract.mint(maker.address, 200);
    await ERC20Contract.connect(maker).approve(
      await ExchangeContractAsUser.getAddress(),
      200
    );

    await ERC20Contract2.mint(taker.address, 100);
    await ERC20Contract2.connect(taker).approve(
      await ExchangeContractAsUser.getAddress(),
      100
    );

    expect(await ERC20Contract.balanceOf(maker)).to.be.equal(200);
    expect(await ERC20Contract.balanceOf(taker)).to.be.equal(0);
    expect(await ERC20Contract2.balanceOf(maker)).to.be.equal(0);
    expect(await ERC20Contract2.balanceOf(taker)).to.be.equal(100);

    const makerAsset = await AssetERC20(ERC20Contract, 200);
    const takerAsset = await AssetERC20(ERC20Contract2, 100);
    const orderLeft = await OrderDefault(
      maker,
      makerAsset,
      ZeroAddress,
      takerAsset,
      1,
      (await ethers.provider.getBlock('latest')).timestamp + 100,
      0
    );
    const orderRight = await OrderDefault(
      taker,
      takerAsset,
      ZeroAddress,
      makerAsset,
      1,
      0,
      0
    );

    const makerSig = await signOrder(orderLeft, maker, OrderValidatorAsAdmin);
    const takerSig = await signOrder(orderRight, taker, OrderValidatorAsAdmin);

    await expect(
      ExchangeContractAsUser.matchOrders([
        {
          orderLeft,
          signatureLeft: makerSig,
          orderRight,
          signatureRight: takerSig,
        },
      ])
    ).to.be.revertedWith('Order start validation failed');
  });

  it('should not execute match order when order end time is in the past', async function () {
    const {
      ExchangeContractAsUser,
      OrderValidatorAsAdmin,
      ERC20Contract,
      ERC20Contract2,
      user1: maker,
      user2: taker,
    } = await loadFixture(deployFixtures);

    await ERC20Contract.mint(maker.address, 200);
    await ERC20Contract.connect(maker).approve(
      await ExchangeContractAsUser.getAddress(),
      200
    );

    await ERC20Contract2.mint(taker.address, 100);
    await ERC20Contract2.connect(taker).approve(
      await ExchangeContractAsUser.getAddress(),
      100
    );

    expect(await ERC20Contract.balanceOf(maker)).to.be.equal(200);
    expect(await ERC20Contract.balanceOf(taker)).to.be.equal(0);
    expect(await ERC20Contract2.balanceOf(maker)).to.be.equal(0);
    expect(await ERC20Contract2.balanceOf(taker)).to.be.equal(100);

    const makerAsset = await AssetERC20(ERC20Contract, 200);
    const takerAsset = await AssetERC20(ERC20Contract2, 100);
    const orderLeft = await OrderDefault(
      maker,
      makerAsset,
      ZeroAddress,
      takerAsset,
      1,
      0,
      (await ethers.provider.getBlock('latest')).timestamp - 100
    );
    const orderRight = await OrderDefault(
      taker,
      takerAsset,
      ZeroAddress,
      makerAsset,
      1,
      0,
      0
    );

    const makerSig = await signOrder(orderLeft, maker, OrderValidatorAsAdmin);
    const takerSig = await signOrder(orderRight, taker, OrderValidatorAsAdmin);

    await expect(
      ExchangeContractAsUser.matchOrders([
        {
          orderLeft,
          signatureLeft: makerSig,
          orderRight,
          signatureRight: takerSig,
        },
      ])
    ).to.be.revertedWith('Order end validation failed');
  });

  it('should execute a complete match order between ERC20 and ERC721 tokens', async function () {
    const {
      ExchangeContractAsUser,
      OrderValidatorAsAdmin,
      ERC20Contract,
      ERC721Contract,
      defaultFeeReceiver,
      protocolFeeSecondary,
      user1: maker,
      user2: taker,
    } = await loadFixture(deployFixtures);

    await ERC20Contract.mint(maker.address, 10000000000);
    await ERC20Contract.connect(maker).approve(
      await ExchangeContractAsUser.getAddress(),
      10000000000
    );
    await ERC721Contract.mint(taker.address, 1);
    await ERC721Contract.connect(taker).approve(
      await ExchangeContractAsUser.getAddress(),
      1
    );

    expect(await ERC20Contract.balanceOf(maker.address)).to.be.equal(
      10000000000
    );
    expect(await ERC721Contract.ownerOf(1)).to.be.equal(taker.address);
    const makerAsset = await AssetERC20(ERC20Contract, 10000000000);
    const takerAsset = await AssetERC721(ERC721Contract, 1);
    const orderLeft = await OrderDefault(
      maker,
      makerAsset,
      ZeroAddress,
      takerAsset,
      1,
      0,
      0
    );
    const orderRight = await OrderDefault(
      taker,
      takerAsset,
      ZeroAddress,
      makerAsset,
      1,
      0,
      0
    );
    const makerSig = await signOrder(orderLeft, maker, OrderValidatorAsAdmin);
    const takerSig = await signOrder(orderRight, taker, OrderValidatorAsAdmin);

    expect(await ExchangeContractAsUser.fills(hashKey(orderLeft))).to.be.equal(
      0
    );
    expect(await ExchangeContractAsUser.fills(hashKey(orderRight))).to.be.equal(
      0
    );

    await ExchangeContractAsUser.matchOrders([
      {
        orderLeft,
        signatureLeft: makerSig,
        orderRight,
        signatureRight: takerSig,
      },
    ]);
    expect(await ExchangeContractAsUser.fills(hashKey(orderLeft))).to.be.equal(
      1
    );
    expect(await ExchangeContractAsUser.fills(hashKey(orderRight))).to.be.equal(
      10000000000
    );
    expect(await ERC721Contract.ownerOf(1)).to.be.equal(maker.address);
    expect(await ERC20Contract.balanceOf(taker.address)).to.be.equal(
      9750000000
    );

    // check protocol fee -> 250 * 10000000000 / 10000 = 250000000
    expect(
      await ERC20Contract.balanceOf(defaultFeeReceiver.address)
    ).to.be.equal(
      (Number(protocolFeeSecondary) * Number(makerAsset.value)) / 10000
    );
  });

  it('should execute a complete match order between ERC20 and ERC1155 tokens', async function () {
    const {
      ExchangeContractAsUser,
      OrderValidatorAsAdmin,
      ERC20Contract,
      ERC1155Contract,
      defaultFeeReceiver,
      protocolFeeSecondary,
      user1: maker,
      user2: taker,
    } = await loadFixture(deployFixtures);

    await ERC20Contract.mint(maker.address, 10000000000);
    await ERC20Contract.connect(maker).approve(
      await ExchangeContractAsUser.getAddress(),
      10000000000
    );

    await ERC1155Contract.mint(taker.address, 1, 10);
    await ERC1155Contract.connect(taker).setApprovalForAll(
      await ExchangeContractAsUser.getAddress(),
      true
    );

    expect(await ERC20Contract.balanceOf(maker.address)).to.be.equal(
      10000000000
    );
    expect(await ERC1155Contract.balanceOf(taker.address, 1)).to.be.equal(10);

    const makerAsset = await AssetERC20(ERC20Contract, 10000000000);
    const takerAsset = await AssetERC1155(ERC1155Contract, 1, 10);

    const orderLeft = await OrderDefault(
      maker,
      makerAsset,
      ZeroAddress,
      takerAsset,
      1,
      0,
      0
    );
    const orderRight = await OrderDefault(
      taker,
      takerAsset,
      ZeroAddress,
      makerAsset,
      1,
      0,
      0
    );
    const makerSig = await signOrder(orderLeft, maker, OrderValidatorAsAdmin);
    const takerSig = await signOrder(orderRight, taker, OrderValidatorAsAdmin);
    expect(await ExchangeContractAsUser.fills(hashKey(orderLeft))).to.be.equal(
      0
    );
    expect(await ExchangeContractAsUser.fills(hashKey(orderRight))).to.be.equal(
      0
    );
    await ExchangeContractAsUser.matchOrders([
      {
        orderLeft,
        signatureLeft: makerSig,
        orderRight,
        signatureRight: takerSig,
      },
    ]);
    expect(await ExchangeContractAsUser.fills(hashKey(orderLeft))).to.be.equal(
      10
    );
    expect(await ExchangeContractAsUser.fills(hashKey(orderRight))).to.be.equal(
      10000000000
    );
    expect(await ERC1155Contract.balanceOf(maker.address, 1)).to.be.equal(10);
    expect(await ERC1155Contract.balanceOf(taker.address, 1)).to.be.equal(0);
    expect(await ERC20Contract.balanceOf(maker.address)).to.be.equal(0);
    expect(await ERC20Contract.balanceOf(taker.address)).to.be.equal(
      9750000000
    );

    // check protocol fee -> 250 * 10000000000 / 10000 = 250000000
    expect(
      await ERC20Contract.balanceOf(defaultFeeReceiver.address)
    ).to.be.equal(
      (Number(protocolFeeSecondary) * Number(makerAsset.value)) / 10000
    );
  });

  it('should execute a complete match order between ERC721 and ERC20 tokens in primary market', async function () {
    const {
      ExchangeContractAsUser,
      OrderValidatorAsAdmin,
      ERC20Contract,
      ERC721WithRoyaltyV2981,
      defaultFeeReceiver,
      deployer: maker, // making deployer the maker to sell in primary market
      user2: taker,
    } = await loadFixture(deployFixtures);

    await ERC721WithRoyaltyV2981.mint(maker.address, 1, [
      await FeeRecipientsData(maker.address, 10000),
    ]);

    await ERC721WithRoyaltyV2981.connect(maker).approve(
      await ExchangeContractAsUser.getAddress(),
      1
    );
    await ERC20Contract.mint(taker.address, 100000000000);
    await ERC20Contract.connect(taker).approve(
      await ExchangeContractAsUser.getAddress(),
      100000000000
    );

    expect(await ERC721WithRoyaltyV2981.ownerOf(1)).to.be.equal(maker.address);
    expect(await ERC20Contract.balanceOf(taker.address)).to.be.equal(
      100000000000
    );
    const makerAsset = await AssetERC721(ERC721WithRoyaltyV2981, 1);
    const takerAsset = await AssetERC20(ERC20Contract, 100000000000);
    const orderLeft = await OrderDefault(
      maker,
      makerAsset,
      ZeroAddress,
      takerAsset,
      1,
      0,
      0
    );
    const orderRight = await OrderDefault(
      taker,
      takerAsset,
      ZeroAddress,
      makerAsset,
      1,
      0,
      0
    );
    const makerSig = await signOrder(orderLeft, maker, OrderValidatorAsAdmin);
    const takerSig = await signOrder(orderRight, taker, OrderValidatorAsAdmin);

    expect(await ExchangeContractAsUser.fills(hashKey(orderLeft))).to.be.equal(
      0
    );
    expect(await ExchangeContractAsUser.fills(hashKey(orderRight))).to.be.equal(
      0
    );

    await ExchangeContractAsUser.matchOrders([
      {
        orderLeft,
        signatureLeft: makerSig,
        orderRight,
        signatureRight: takerSig,
      },
    ]);

    expect(await ExchangeContractAsUser.fills(hashKey(orderLeft))).to.be.equal(
      100000000000
    );
    expect(await ExchangeContractAsUser.fills(hashKey(orderRight))).to.be.equal(
      1
    );
    expect(await ERC721WithRoyaltyV2981.ownerOf(1)).to.be.equal(taker.address);
    expect(await ERC20Contract.balanceOf(maker.address)).to.be.equal(
      98770000000
    );

    // check primary market protocol fee
    expect(
      await ERC20Contract.balanceOf(defaultFeeReceiver.address)
    ).to.be.equal(1230000000); // 123 * 100000000000 / 10000 = 1230000000
  });

  it('should execute complete match when left order taker is right order maker', async function () {
    const {
      ExchangeContractAsUser,
      OrderValidatorAsAdmin,
      ERC20Contract,
      ERC20Contract2,
      user1: maker,
      user2: taker,
    } = await loadFixture(deployFixtures);

    await ERC20Contract.mint(maker.address, 123000000);
    await ERC20Contract.connect(maker).approve(
      await ExchangeContractAsUser.getAddress(),
      123000000
    );

    await ERC20Contract2.mint(taker.address, 456000000);
    await ERC20Contract2.connect(taker).approve(
      await ExchangeContractAsUser.getAddress(),
      456000000
    );

    expect(await ERC20Contract.balanceOf(maker)).to.be.equal(123000000);
    expect(await ERC20Contract.balanceOf(taker)).to.be.equal(0);
    expect(await ERC20Contract2.balanceOf(maker)).to.be.equal(0);
    expect(await ERC20Contract2.balanceOf(taker)).to.be.equal(456000000);

    const makerAsset = await AssetERC20(ERC20Contract, 123000000);
    const takerAsset = await AssetERC20(ERC20Contract2, 456000000);
    // left order taker is right order maker
    const orderLeft = await OrderDefault(
      maker,
      makerAsset,
      taker,
      takerAsset,
      1,
      0,
      0
    );
    const orderRight = await OrderDefault(
      taker,
      takerAsset,
      ZeroAddress,
      makerAsset,
      1,
      0,
      0
    );

    const makerSig = await signOrder(orderLeft, maker, OrderValidatorAsAdmin);
    const takerSig = await signOrder(orderRight, taker, OrderValidatorAsAdmin);
    await ExchangeContractAsUser.matchOrders([
      {
        orderLeft,
        signatureLeft: makerSig,
        orderRight,
        signatureRight: takerSig,
      },
    ]);

    expect(await ERC20Contract.balanceOf(maker)).to.be.equal(0);
    expect(await ERC20Contract.balanceOf(taker)).to.be.equal(123000000);
    expect(await ERC20Contract2.balanceOf(maker)).to.be.equal(456000000);
    expect(await ERC20Contract2.balanceOf(taker)).to.be.equal(0);
  });

  it('should execute match order when order start time is non zero and less than current timestamp', async function () {
    const {
      ExchangeContractAsUser,
      OrderValidatorAsAdmin,
      ERC20Contract,
      ERC20Contract2,
      user1: maker,
      user2: taker,
    } = await loadFixture(deployFixtures);

    await ERC20Contract.mint(maker.address, 123000000);
    await ERC20Contract.connect(maker).approve(
      await ExchangeContractAsUser.getAddress(),
      123000000
    );

    await ERC20Contract2.mint(taker.address, 456000000);
    await ERC20Contract2.connect(taker).approve(
      await ExchangeContractAsUser.getAddress(),
      456000000
    );

    expect(await ERC20Contract.balanceOf(maker)).to.be.equal(123000000);
    expect(await ERC20Contract.balanceOf(taker)).to.be.equal(0);
    expect(await ERC20Contract2.balanceOf(maker)).to.be.equal(0);
    expect(await ERC20Contract2.balanceOf(taker)).to.be.equal(456000000);

    const makerAsset = await AssetERC20(ERC20Contract, 123000000);
    const takerAsset = await AssetERC20(ERC20Contract2, 456000000);
    const orderLeft = await OrderDefault(
      maker,
      makerAsset,
      ZeroAddress,
      takerAsset,
      1,
      (await ethers.provider.getBlock('latest')).timestamp + 100,
      0
    );
    const orderRight = await OrderDefault(
      taker,
      takerAsset,
      ZeroAddress,
      makerAsset,
      1,
      0,
      0
    );

    const makerSig = await signOrder(orderLeft, maker, OrderValidatorAsAdmin);
    const takerSig = await signOrder(orderRight, taker, OrderValidatorAsAdmin);
    // advance timestamp 100 second ahead of left order start time
    await mine(200);
    await ExchangeContractAsUser.matchOrders([
      {
        orderLeft,
        signatureLeft: makerSig,
        orderRight,
        signatureRight: takerSig,
      },
    ]);

    expect(await ERC20Contract.balanceOf(maker)).to.be.equal(0);
    expect(await ERC20Contract.balanceOf(taker)).to.be.equal(123000000);
    expect(await ERC20Contract2.balanceOf(maker)).to.be.equal(456000000);
    expect(await ERC20Contract2.balanceOf(taker)).to.be.equal(0);
  });

  it('should execute match order when order end time is non zero and more than current timestamp', async function () {
    const {
      ExchangeContractAsUser,
      OrderValidatorAsAdmin,
      ERC20Contract,
      ERC20Contract2,
      user1: maker,
      user2: taker,
    } = await loadFixture(deployFixtures);

    await ERC20Contract.mint(maker.address, 123000000);
    await ERC20Contract.connect(maker).approve(
      await ExchangeContractAsUser.getAddress(),
      123000000
    );

    await ERC20Contract2.mint(taker.address, 456000000);
    await ERC20Contract2.connect(taker).approve(
      await ExchangeContractAsUser.getAddress(),
      456000000
    );

    expect(await ERC20Contract.balanceOf(maker)).to.be.equal(123000000);
    expect(await ERC20Contract.balanceOf(taker)).to.be.equal(0);
    expect(await ERC20Contract2.balanceOf(maker)).to.be.equal(0);
    expect(await ERC20Contract2.balanceOf(taker)).to.be.equal(456000000);

    const makerAsset = await AssetERC20(ERC20Contract, 123000000);
    const takerAsset = await AssetERC20(ERC20Contract2, 456000000);
    const orderLeft = await OrderDefault(
      maker,
      makerAsset,
      ZeroAddress,
      takerAsset,
      1,
      0,
      (await ethers.provider.getBlock('latest')).timestamp + 100
    );
    const orderRight = await OrderDefault(
      taker,
      takerAsset,
      ZeroAddress,
      makerAsset,
      1,
      0,
      0
    );

    const makerSig = await signOrder(orderLeft, maker, OrderValidatorAsAdmin);
    const takerSig = await signOrder(orderRight, taker, OrderValidatorAsAdmin);
    await ExchangeContractAsUser.matchOrders([
      {
        orderLeft,
        signatureLeft: makerSig,
        orderRight,
        signatureRight: takerSig,
      },
    ]);

    expect(await ERC20Contract.balanceOf(maker)).to.be.equal(0);
    expect(await ERC20Contract.balanceOf(taker)).to.be.equal(123000000);
    expect(await ERC20Contract2.balanceOf(maker)).to.be.equal(456000000);
    expect(await ERC20Contract2.balanceOf(taker)).to.be.equal(0);
  });

  it('should execute a complete match order with external royalties provider(type 1)', async function () {
    const {
      ExchangeContractAsUser,
      OrderValidatorAsAdmin,
      ERC20Contract,
      ERC721Contract,
      RoyaltiesRegistryAsDeployer,
      defaultFeeReceiver,
      deployer: royaltyReceiver,
      user1: maker,
      user2: taker,
    } = await loadFixture(deployFixtures);

    await ERC721Contract.mint(maker.address, 1);

    await ERC721Contract.connect(maker).approve(
      await ExchangeContractAsUser.getAddress(),
      1
    );

    // set up royalties by token
    await RoyaltiesRegistryAsDeployer.setRoyaltiesByToken(
      await ERC721Contract.getAddress(),
      [await LibPartData(royaltyReceiver, 2000)]
    );

    await ERC20Contract.mint(taker.address, 100000000000);
    await ERC20Contract.connect(taker).approve(
      await ExchangeContractAsUser.getAddress(),
      100000000000
    );

    expect(await ERC721Contract.ownerOf(1)).to.be.equal(maker.address);
    expect(await ERC20Contract.balanceOf(taker.address)).to.be.equal(
      100000000000
    );
    const makerAsset = await AssetERC721(ERC721Contract, 1);
    const takerAsset = await AssetERC20(ERC20Contract, 100000000000);
    const orderLeft = await OrderDefault(
      maker,
      makerAsset,
      ZeroAddress,
      takerAsset,
      1,
      0,
      0
    );
    const orderRight = await OrderDefault(
      taker,
      takerAsset,
      ZeroAddress,
      makerAsset,
      1,
      0,
      0
    );
    const makerSig = await signOrder(orderLeft, maker, OrderValidatorAsAdmin);
    const takerSig = await signOrder(orderRight, taker, OrderValidatorAsAdmin);

    expect(await ExchangeContractAsUser.fills(hashKey(orderLeft))).to.be.equal(
      0
    );
    expect(await ExchangeContractAsUser.fills(hashKey(orderRight))).to.be.equal(
      0
    );

    await ExchangeContractAsUser.matchOrders([
      {
        orderLeft,
        signatureLeft: makerSig,
        orderRight,
        signatureRight: takerSig,
      },
    ]);

    expect(await ExchangeContractAsUser.fills(hashKey(orderLeft))).to.be.equal(
      100000000000
    );
    expect(await ExchangeContractAsUser.fills(hashKey(orderRight))).to.be.equal(
      1
    );
    expect(await ERC721Contract.ownerOf(1)).to.be.equal(taker.address);

    // check protocol fee
    expect(
      await ERC20Contract.balanceOf(defaultFeeReceiver.address)
    ).to.be.equal(2500000000); // 250 * 10000000000 / 10000 = 2500000000

    // check paid royalty
    expect(await ERC20Contract.balanceOf(royaltyReceiver.address)).to.be.equal(
      20000000000
    ); // 20% of the amount

    expect(await ERC20Contract.balanceOf(maker.address)).to.be.equal(
      77500000000 // 100000000000 - royalty - protocolFee
    );
  });

  it('should execute a complete match order with external royalties provider(type 2)', async function () {
    const {
      ExchangeContractAsUser,
      OrderValidatorAsAdmin,
      ERC20Contract,
      ERC721Contract,
      RoyaltiesRegistryAsDeployer,
      RoyaltiesProvider,
      defaultFeeReceiver,
      deployer: royaltyReceiver,
      user1: maker,
      user2: taker,
    } = await loadFixture(deployFixtures);

    await ERC721Contract.mint(maker.address, 1);

    await ERC721Contract.connect(maker).approve(
      await ExchangeContractAsUser.getAddress(),
      1
    );

    // configuring royalties
    await RoyaltiesProvider.initializeProvider(
      await ERC721Contract.getAddress(),
      1,
      [await LibPartData(royaltyReceiver, 1000)]
    );
    await RoyaltiesRegistryAsDeployer.setProviderByToken(
      await ERC721Contract.getAddress(),
      RoyaltiesProvider.getAddress()
    );

    await ERC20Contract.mint(taker.address, 100000000000);
    await ERC20Contract.connect(taker).approve(
      await ExchangeContractAsUser.getAddress(),
      100000000000
    );

    expect(await ERC721Contract.ownerOf(1)).to.be.equal(maker.address);
    expect(await ERC20Contract.balanceOf(taker.address)).to.be.equal(
      100000000000
    );
    const makerAsset = await AssetERC721(ERC721Contract, 1);
    const takerAsset = await AssetERC20(ERC20Contract, 100000000000);
    const orderLeft = await OrderDefault(
      maker,
      makerAsset,
      ZeroAddress,
      takerAsset,
      1,
      0,
      0
    );
    const orderRight = await OrderDefault(
      taker,
      takerAsset,
      ZeroAddress,
      makerAsset,
      1,
      0,
      0
    );
    const makerSig = await signOrder(orderLeft, maker, OrderValidatorAsAdmin);
    const takerSig = await signOrder(orderRight, taker, OrderValidatorAsAdmin);

    expect(await ExchangeContractAsUser.fills(hashKey(orderLeft))).to.be.equal(
      0
    );
    expect(await ExchangeContractAsUser.fills(hashKey(orderRight))).to.be.equal(
      0
    );

    await ExchangeContractAsUser.matchOrders([
      {
        orderLeft,
        signatureLeft: makerSig,
        orderRight,
        signatureRight: takerSig,
      },
    ]);

    expect(await ExchangeContractAsUser.fills(hashKey(orderLeft))).to.be.equal(
      100000000000
    );
    expect(await ExchangeContractAsUser.fills(hashKey(orderRight))).to.be.equal(
      1
    );
    expect(await ERC721Contract.ownerOf(1)).to.be.equal(taker.address);

    // check protocol fee
    expect(
      await ERC20Contract.balanceOf(defaultFeeReceiver.address)
    ).to.be.equal(2500000000); // 250 * 10000000000 / 10000 = 2500000000

    // check paid royalty
    expect(await ERC20Contract.balanceOf(royaltyReceiver.address)).to.be.equal(
      10000000000
    ); // 10% of the amount

    expect(await ERC20Contract.balanceOf(maker.address)).to.be.equal(
      87500000000 // 100000000000 - royalty - protocolFee
    );
  });

  it('should execute a complete match order with royalties 2981(type 3) transferred to royaltyReceiver', async function () {
    const {
      ExchangeContractAsUser,
      OrderValidatorAsAdmin,
      ERC20Contract,
      ERC721WithRoyalty,
      defaultFeeReceiver,
      deployer: royaltyReceiver,
      user1: maker,
      user2: taker,
      admin: receiver1,
      user: receiver2,
    } = await loadFixture(deployFixtures);

    // set royalty
    await ERC721WithRoyalty.setRoyalties(5000);

    const fees = [
      {account: receiver1.address, value: 4000},
      {account: receiver2.address, value: 5000},
    ];
    await ERC721WithRoyalty.mint(maker.address, 1, fees);

    await ERC721WithRoyalty.connect(maker).approve(
      await ExchangeContractAsUser.getAddress(),
      1
    );

    // set up receiver
    await ERC721WithRoyalty.setRoyaltiesReceiver(1, royaltyReceiver.address);

    await ERC20Contract.mint(taker.address, 100000000000);
    await ERC20Contract.connect(taker).approve(
      await ExchangeContractAsUser.getAddress(),
      100000000000
    );

    expect(await ERC721WithRoyalty.ownerOf(1)).to.be.equal(maker.address);
    expect(await ERC20Contract.balanceOf(taker.address)).to.be.equal(
      100000000000
    );
    const makerAsset = await AssetERC721(ERC721WithRoyalty, 1);
    const takerAsset = await AssetERC20(ERC20Contract, 100000000000);
    const orderLeft = await OrderDefault(
      maker,
      makerAsset,
      ZeroAddress,
      takerAsset,
      1,
      0,
      0
    );
    const orderRight = await OrderDefault(
      taker,
      takerAsset,
      ZeroAddress,
      makerAsset,
      1,
      0,
      0
    );
    const makerSig = await signOrder(orderLeft, maker, OrderValidatorAsAdmin);
    const takerSig = await signOrder(orderRight, taker, OrderValidatorAsAdmin);

    expect(await ExchangeContractAsUser.fills(hashKey(orderLeft))).to.be.equal(
      0
    );
    expect(await ExchangeContractAsUser.fills(hashKey(orderRight))).to.be.equal(
      0
    );

    await ExchangeContractAsUser.matchOrders([
      {
        orderLeft,
        signatureLeft: makerSig,
        orderRight,
        signatureRight: takerSig,
      },
    ]);

    expect(await ExchangeContractAsUser.fills(hashKey(orderLeft))).to.be.equal(
      100000000000
    );
    expect(await ExchangeContractAsUser.fills(hashKey(orderRight))).to.be.equal(
      1
    );
    expect(await ERC721WithRoyalty.ownerOf(1)).to.be.equal(taker.address);

    // check primary market protocol fee
    expect(
      await ERC20Contract.balanceOf(defaultFeeReceiver.address)
    ).to.be.equal(2500000000); // 250 * 100000000000 / 10000 = 2500000000

    expect(await ERC20Contract.balanceOf(receiver1.address)).to.be.equal(0);

    expect(await ERC20Contract.balanceOf(receiver2.address)).to.be.equal(0);

    expect(await ERC20Contract.balanceOf(royaltyReceiver.address)).to.be.equal(
      50000000000 // 5000 * 100000000000 / 10000 = 50000000000
    );

    expect(await ERC20Contract.balanceOf(maker.address)).to.be.equal(
      47500000000 // 100000000000 - royalty - protocolFee
    );
  });

  it('should execute a complete match order with royalties 2981(type 3) transferred to fee recipients', async function () {
    const {
      ExchangeContractAsUser,
      OrderValidatorAsAdmin,
      ERC20Contract,
      ERC721WithRoyaltyV2981,
      defaultFeeReceiver,
      deployer: royaltyReceiver,
      user1: maker,
      user2: taker,
      admin: receiver1,
      user: receiver2,
    } = await loadFixture(deployFixtures);

    await ERC721WithRoyaltyV2981.mint(maker.address, 1, [
      await FeeRecipientsData(receiver1.address, 3000),
      await FeeRecipientsData(receiver2.address, 7000),
    ]);

    await ERC721WithRoyaltyV2981.connect(maker).approve(
      await ExchangeContractAsUser.getAddress(),
      1
    );

    // set up receiver
    await ERC721WithRoyaltyV2981.setRoyaltiesReceiver(
      1,
      royaltyReceiver.address
    );

    await ERC20Contract.mint(taker.address, 100000000000);
    await ERC20Contract.connect(taker).approve(
      await ExchangeContractAsUser.getAddress(),
      100000000000
    );

    expect(await ERC721WithRoyaltyV2981.ownerOf(1)).to.be.equal(maker.address);
    expect(await ERC20Contract.balanceOf(taker.address)).to.be.equal(
      100000000000
    );
    const makerAsset = await AssetERC721(ERC721WithRoyaltyV2981, 1);
    const takerAsset = await AssetERC20(ERC20Contract, 100000000000);
    const orderLeft = await OrderDefault(
      maker,
      makerAsset,
      ZeroAddress,
      takerAsset,
      1,
      0,
      0
    );
    const orderRight = await OrderDefault(
      taker,
      takerAsset,
      ZeroAddress,
      makerAsset,
      1,
      0,
      0
    );
    const makerSig = await signOrder(orderLeft, maker, OrderValidatorAsAdmin);
    const takerSig = await signOrder(orderRight, taker, OrderValidatorAsAdmin);

    expect(await ExchangeContractAsUser.fills(hashKey(orderLeft))).to.be.equal(
      0
    );
    expect(await ExchangeContractAsUser.fills(hashKey(orderRight))).to.be.equal(
      0
    );

    await ExchangeContractAsUser.matchOrders([
      {
        orderLeft,
        signatureLeft: makerSig,
        orderRight,
        signatureRight: takerSig,
      },
    ]);

    expect(await ExchangeContractAsUser.fills(hashKey(orderLeft))).to.be.equal(
      100000000000
    );
    expect(await ExchangeContractAsUser.fills(hashKey(orderRight))).to.be.equal(
      1
    );
    expect(await ERC721WithRoyaltyV2981.ownerOf(1)).to.be.equal(taker.address);

    // check protocol fee
    expect(
      await ERC20Contract.balanceOf(defaultFeeReceiver.address)
    ).to.be.equal(2500000000); // 250 * 100000000000 / 10000 = 2500000000

    expect(await ERC20Contract.balanceOf(receiver1.address)).to.be.equal(
      15000000000 // 1500 * 100000000000 / 10000 = 15000000000
    );

    expect(await ERC20Contract.balanceOf(receiver2.address)).to.be.equal(
      35000000000 // 3500 * 100000000000 / 10000 = 35000000000
    );

    expect(await ERC20Contract.balanceOf(maker.address)).to.be.equal(
      47500000000 // 100000000000 - royalty - protocolFee
    );
  });

  it('should execute a complete match order without fee and royalties for privileged seller', async function () {
    const {
      ExchangeContractAsUser,
      ExchangeContractAsDeployer,
      OrderValidatorAsAdmin,
      ERC20Contract,
      ERC721WithRoyaltyV2981,
      defaultFeeReceiver,
      EXCHANGE_ADMIN_ROLE,
      deployer,
      admin,
      user1: maker,
      user2: taker,
    } = await loadFixture(deployFixtures);

    await ERC721WithRoyaltyV2981.mint(maker.address, 1, [
      await FeeRecipientsData(maker.address, 10000),
    ]);

    await ERC721WithRoyaltyV2981.connect(maker).approve(
      await ExchangeContractAsUser.getAddress(),
      1
    );

    // set up receiver
    await ERC721WithRoyaltyV2981.setRoyaltiesReceiver(1, deployer.address);

    // grant exchange admin role to seller
    await ExchangeContractAsDeployer.connect(admin).grantRole(
      EXCHANGE_ADMIN_ROLE,
      taker.address
    );

    await ERC20Contract.mint(taker.address, 100000000000);
    await ERC20Contract.connect(taker).approve(
      await ExchangeContractAsUser.getAddress(),
      100000000000
    );

    expect(await ERC721WithRoyaltyV2981.ownerOf(1)).to.be.equal(maker.address);
    expect(await ERC20Contract.balanceOf(taker.address)).to.be.equal(
      100000000000
    );
    const makerAsset = await AssetERC721(ERC721WithRoyaltyV2981, 1);
    const takerAsset = await AssetERC20(ERC20Contract, 100000000000);
    const orderLeft = await OrderDefault(
      maker,
      makerAsset,
      ZeroAddress,
      takerAsset,
      1,
      0,
      0
    );
    const orderRight = await OrderDefault(
      taker,
      takerAsset,
      ZeroAddress,
      makerAsset,
      1,
      0,
      0
    );
    const makerSig = await signOrder(orderLeft, maker, OrderValidatorAsAdmin);
    const takerSig = await signOrder(orderRight, taker, OrderValidatorAsAdmin);

    expect(await ExchangeContractAsUser.fills(hashKey(orderLeft))).to.be.equal(
      0
    );
    expect(await ExchangeContractAsUser.fills(hashKey(orderRight))).to.be.equal(
      0
    );

    await ExchangeContractAsUser.matchOrders([
      {
        orderLeft,
        signatureLeft: makerSig,
        orderRight,
        signatureRight: takerSig,
      },
    ]);
    expect(await ExchangeContractAsUser.fills(hashKey(orderLeft))).to.be.equal(
      100000000000
    );
    expect(await ExchangeContractAsUser.fills(hashKey(orderRight))).to.be.equal(
      1
    );
    expect(await ERC721WithRoyaltyV2981.ownerOf(1)).to.be.equal(taker.address);

    // no protocol fee paid
    expect(
      await ERC20Contract.balanceOf(defaultFeeReceiver.address)
    ).to.be.equal(0);

    // no royalties paid
    expect(await ERC20Contract.balanceOf(deployer.address)).to.be.equal(0);

    expect(await ERC20Contract.balanceOf(maker.address)).to.be.equal(
      100000000000
    );
  });

  it('should execute a complete match order between ERC721 and ERC20 tokens', async function () {
    const {
      ExchangeContractAsUser,
      OrderValidatorAsAdmin,
      ERC20Contract,
      ERC721Contract,
      user1: maker,
      user2: taker,
    } = await loadFixture(deployFixtures);
    await ERC721Contract.mint(maker.address, 1);
    await ERC721Contract.connect(maker).approve(
      await ExchangeContractAsUser.getAddress(),
      1
    );
    await ERC20Contract.mint(taker.address, 100);
    await ERC20Contract.connect(taker).approve(
      await ExchangeContractAsUser.getAddress(),
      100
    );

    expect(await ERC721Contract.ownerOf(1)).to.be.equal(maker.address);
    expect(await ERC20Contract.balanceOf(taker.address)).to.be.equal(100);
    const makerAsset = await AssetERC721(ERC721Contract, 1);
    const takerAsset = await AssetERC20(ERC20Contract, 100);
    const orderLeft = await OrderDefault(
      maker,
      makerAsset,
      ZeroAddress,
      takerAsset,
      1,
      0,
      0
    );
    const orderRight = await OrderDefault(
      taker,
      takerAsset,
      ZeroAddress,
      makerAsset,
      1,
      0,
      0
    );
    const makerSig = await signOrder(orderLeft, maker, OrderValidatorAsAdmin);
    const takerSig = await signOrder(orderRight, taker, OrderValidatorAsAdmin);

    expect(await ExchangeContractAsUser.fills(hashKey(orderLeft))).to.be.equal(
      0
    );
    expect(await ExchangeContractAsUser.fills(hashKey(orderRight))).to.be.equal(
      0
    );

    await ExchangeContractAsUser.matchOrders([
      {
        orderLeft,
        signatureLeft: makerSig,
        orderRight,
        signatureRight: takerSig,
      },
    ]);
    expect(await ExchangeContractAsUser.fills(hashKey(orderLeft))).to.be.equal(
      100
    );
    expect(await ExchangeContractAsUser.fills(hashKey(orderRight))).to.be.equal(
      1
    );
    expect(await ERC721Contract.ownerOf(1)).to.be.equal(taker.address);
    expect(await ERC20Contract.balanceOf(maker.address)).to.be.equal(98);
  });

  it('should execute a complete match order between ERC1155 and ERC20 tokens', async function () {
    const {
      ExchangeContractAsUser,
      OrderValidatorAsAdmin,
      ERC20Contract,
      ERC1155Contract,
      user1: maker,
      user2: taker,
    } = await loadFixture(deployFixtures);

    await ERC1155Contract.mint(maker.address, 1, 10);
    await ERC1155Contract.connect(maker).setApprovalForAll(
      await ExchangeContractAsUser.getAddress(),
      true
    );

    await ERC20Contract.mint(taker.address, 100);
    await ERC20Contract.connect(taker).approve(
      await ExchangeContractAsUser.getAddress(),
      100
    );

    expect(await ERC1155Contract.balanceOf(maker.address, 1)).to.be.equal(10);
    expect(await ERC20Contract.balanceOf(taker.address)).to.be.equal(100);

    const makerAsset = await AssetERC1155(ERC1155Contract, 1, 10);
    const takerAsset = await AssetERC20(ERC20Contract, 100);

    const orderLeft = await OrderDefault(
      maker,
      makerAsset,
      ZeroAddress,
      takerAsset,
      1,
      0,
      0
    );
    const orderRight = await OrderDefault(
      taker,
      takerAsset,
      ZeroAddress,
      makerAsset,
      1,
      0,
      0
    );
    const makerSig = await signOrder(orderLeft, maker, OrderValidatorAsAdmin);
    const takerSig = await signOrder(orderRight, taker, OrderValidatorAsAdmin);
    expect(await ExchangeContractAsUser.fills(hashKey(orderLeft))).to.be.equal(
      0
    );
    expect(await ExchangeContractAsUser.fills(hashKey(orderRight))).to.be.equal(
      0
    );
    await ExchangeContractAsUser.matchOrders([
      {
        orderLeft,
        signatureLeft: makerSig,
        orderRight,
        signatureRight: takerSig,
      },
    ]);
    expect(await ExchangeContractAsUser.fills(hashKey(orderLeft))).to.be.equal(
      100
    );
    expect(await ExchangeContractAsUser.fills(hashKey(orderRight))).to.be.equal(
      10
    );
    expect(await ERC1155Contract.balanceOf(maker.address, 1)).to.be.equal(0);
    expect(await ERC1155Contract.balanceOf(taker.address, 1)).to.be.equal(10);
    expect(await ERC20Contract.balanceOf(taker.address)).to.be.equal(0);
    expect(await ERC20Contract.balanceOf(maker.address)).to.be.equal(98);
  });

  it('should partially fill orders using matchOrders between ERC20 tokens', async function () {
    const {
      ExchangeContractAsUser,
      OrderValidatorAsAdmin,
      ERC20Contract,
      ERC20Contract2,
      user1: maker,
      user2: taker,
    } = await loadFixture(deployFixtures);

    await ERC20Contract.mint(maker.address, 100);
    await ERC20Contract.connect(maker).approve(
      await ExchangeContractAsUser.getAddress(),
      100
    );

    await ERC20Contract2.mint(taker.address, 200);
    await ERC20Contract2.connect(taker).approve(
      await ExchangeContractAsUser.getAddress(),
      200
    );

    expect(await ERC20Contract.balanceOf(maker)).to.be.equal(100);
    expect(await ERC20Contract.balanceOf(taker)).to.be.equal(0);
    expect(await ERC20Contract2.balanceOf(maker)).to.be.equal(0);
    expect(await ERC20Contract2.balanceOf(taker)).to.be.equal(200);

    const makerAssetForLeftOrder = await AssetERC20(ERC20Contract, 100);
    const takerAssetForLeftOrder = await AssetERC20(ERC20Contract2, 200);
    const takerAssetForRightOrder = await AssetERC20(ERC20Contract2, 100);
    const makerAssetForRightOrder = await AssetERC20(ERC20Contract, 50);

    const orderLeft = await OrderDefault(
      maker,
      makerAssetForLeftOrder,
      ZeroAddress,
      takerAssetForLeftOrder,
      1,
      0,
      0
    );
    const orderRight = await OrderDefault(
      taker,
      takerAssetForRightOrder,
      ZeroAddress,
      makerAssetForRightOrder,
      1,
      0,
      0
    );

    const makerSig = await signOrder(orderLeft, maker, OrderValidatorAsAdmin);
    const takerSig = await signOrder(orderRight, taker, OrderValidatorAsAdmin);
    expect(await ExchangeContractAsUser.fills(hashKey(orderLeft))).to.be.equal(
      0
    );
    expect(await ExchangeContractAsUser.fills(hashKey(orderRight))).to.be.equal(
      0
    );
    await ExchangeContractAsUser.matchOrders([
      {
        orderLeft,
        signatureLeft: makerSig,
        orderRight,
        signatureRight: takerSig,
      },
    ]);
    expect(await ExchangeContractAsUser.fills(hashKey(orderLeft))).to.be.equal(
      100
    );
    expect(await ExchangeContractAsUser.fills(hashKey(orderRight))).to.be.equal(
      50
    );
    expect(await ERC20Contract.balanceOf(maker)).to.be.equal(50);
    expect(await ERC20Contract.balanceOf(taker)).to.be.equal(50);
    expect(await ERC20Contract2.balanceOf(maker)).to.be.equal(100);
    expect(await ERC20Contract2.balanceOf(taker)).to.be.equal(100);
  });

  it('should partially fill orders using matchOrders between ERC1155 and ERC20 tokens', async function () {
    const {
      ExchangeContractAsUser,
      OrderValidatorAsAdmin,
      ERC20Contract,
      ERC1155Contract,
      user1: maker,
      user2: taker,
    } = await loadFixture(deployFixtures);

    await ERC1155Contract.mint(maker.address, 1, 10);
    await ERC1155Contract.connect(maker).setApprovalForAll(
      await ExchangeContractAsUser.getAddress(),
      true
    );

    await ERC20Contract.mint(taker.address, 100);
    await ERC20Contract.connect(taker).approve(
      await ExchangeContractAsUser.getAddress(),
      100
    );

    expect(await ERC1155Contract.balanceOf(maker.address, 1)).to.be.equal(10);
    expect(await ERC20Contract.balanceOf(taker.address)).to.be.equal(100);

    const makerAssetForLeftOrder = await AssetERC1155(ERC1155Contract, 1, 10);
    const takerAssetForLeftOrder = await AssetERC20(ERC20Contract, 100);
    const takerAssetForRightOrder = await AssetERC20(ERC20Contract, 50);
    const makerAssetForRightOrder = await AssetERC1155(ERC1155Contract, 1, 5);
    const orderLeft = await OrderDefault(
      maker,
      makerAssetForLeftOrder,
      ZeroAddress,
      takerAssetForLeftOrder,
      1,
      0,
      0
    );
    const orderRight = await OrderDefault(
      taker,
      takerAssetForRightOrder,
      ZeroAddress,
      makerAssetForRightOrder,
      1,
      0,
      0
    );
    const makerSig = await signOrder(orderLeft, maker, OrderValidatorAsAdmin);
    const takerSig = await signOrder(orderRight, taker, OrderValidatorAsAdmin);
    expect(await ExchangeContractAsUser.fills(hashKey(orderLeft))).to.be.equal(
      0
    );
    expect(await ExchangeContractAsUser.fills(hashKey(orderRight))).to.be.equal(
      0
    );
    await ExchangeContractAsUser.matchOrders([
      {
        orderLeft,
        signatureLeft: makerSig,
        orderRight,
        signatureRight: takerSig,
      },
    ]);
    expect(await ExchangeContractAsUser.fills(hashKey(orderLeft))).to.be.equal(
      50
    );
    expect(await ExchangeContractAsUser.fills(hashKey(orderRight))).to.be.equal(
      5
    );
    expect(await ERC1155Contract.balanceOf(maker.address, 1)).to.be.equal(5);
    expect(await ERC1155Contract.balanceOf(taker.address, 1)).to.be.equal(5);
    expect(await ERC20Contract.balanceOf(taker.address)).to.be.equal(50);
    expect(await ERC20Contract.balanceOf(maker.address)).to.be.equal(49);
  });

  it('should fully fill a order using partial matches between ERC20 tokens', async function () {
    const {
      ExchangeContractAsUser,
      OrderValidatorAsAdmin,
      ERC20Contract,
      ERC20Contract2,
      user1: maker,
      user2: taker,
    } = await loadFixture(deployFixtures);

    await ERC20Contract.mint(maker.address, 100);
    await ERC20Contract.connect(maker).approve(
      await ExchangeContractAsUser.getAddress(),
      100
    );

    await ERC20Contract2.mint(taker.address, 200);
    await ERC20Contract2.connect(taker).approve(
      await ExchangeContractAsUser.getAddress(),
      200
    );

    expect(await ERC20Contract.balanceOf(maker)).to.be.equal(100);
    expect(await ERC20Contract.balanceOf(taker)).to.be.equal(0);
    expect(await ERC20Contract2.balanceOf(maker)).to.be.equal(0);
    expect(await ERC20Contract2.balanceOf(taker)).to.be.equal(200);

    const makerAssetForLeftOrder = await AssetERC20(ERC20Contract, 100);
    const takerAssetForLeftOrder = await AssetERC20(ERC20Contract2, 200);
    const takerAssetForRightOrder = await AssetERC20(ERC20Contract2, 100);
    const makerAssetForRightOrder = await AssetERC20(ERC20Contract, 50);

    const orderLeft = await OrderDefault(
      maker,
      makerAssetForLeftOrder,
      ZeroAddress,
      takerAssetForLeftOrder,
      1,
      0,
      0
    );
    const rightOrderForFirstMatch = await OrderDefault(
      taker,
      takerAssetForRightOrder,
      ZeroAddress,
      makerAssetForRightOrder,
      1,
      0,
      0
    );

    const makerSig = await signOrder(orderLeft, maker, OrderValidatorAsAdmin);
    const takerSigForFirstMatch = await signOrder(
      rightOrderForFirstMatch,
      taker,
      OrderValidatorAsAdmin
    );
    expect(await ExchangeContractAsUser.fills(hashKey(orderLeft))).to.be.equal(
      0
    );
    expect(
      await ExchangeContractAsUser.fills(hashKey(rightOrderForFirstMatch))
    ).to.be.equal(0);
    await ExchangeContractAsUser.matchOrders([
      {
        orderLeft,
        signatureLeft: makerSig,
        orderRight: rightOrderForFirstMatch,
        signatureRight: takerSigForFirstMatch,
      },
    ]);
    expect(await ExchangeContractAsUser.fills(hashKey(orderLeft))).to.be.equal(
      100
    );
    expect(
      await ExchangeContractAsUser.fills(hashKey(rightOrderForFirstMatch))
    ).to.be.equal(50);
    expect(await ERC20Contract.balanceOf(maker)).to.be.equal(50);
    expect(await ERC20Contract.balanceOf(taker)).to.be.equal(50);
    expect(await ERC20Contract2.balanceOf(maker)).to.be.equal(100);
    expect(await ERC20Contract2.balanceOf(taker)).to.be.equal(100);

    const rightOrderForSecondMatch = await OrderDefault(
      taker,
      takerAssetForRightOrder,
      ZeroAddress,
      makerAssetForRightOrder,
      2,
      0,
      0
    );
    const takerSigForSecondMatch = await signOrder(
      rightOrderForSecondMatch,
      taker,
      OrderValidatorAsAdmin
    );
    await ExchangeContractAsUser.matchOrders([
      {
        orderLeft,
        signatureLeft: makerSig,
        orderRight: rightOrderForSecondMatch,
        signatureRight: takerSigForSecondMatch,
      },
    ]);
    expect(await ExchangeContractAsUser.fills(hashKey(orderLeft))).to.be.equal(
      200
    );
    expect(
      await ExchangeContractAsUser.fills(hashKey(rightOrderForSecondMatch))
    ).to.be.equal(50);
    expect(await ERC20Contract.balanceOf(maker)).to.be.equal(0);
    expect(await ERC20Contract.balanceOf(taker)).to.be.equal(100);
    expect(await ERC20Contract2.balanceOf(maker)).to.be.equal(200);
    expect(await ERC20Contract2.balanceOf(taker)).to.be.equal(0);
  });

  it('should fully fill a order using partial matches between ERC20 and ERC1155 tokens', async function () {
    const {
      ExchangeContractAsUser,
      OrderValidatorAsAdmin,
      ERC20Contract,
      ERC1155Contract,
      user1: maker,
      user2: taker,
    } = await loadFixture(deployFixtures);

    await ERC20Contract.mint(maker.address, 100);
    await ERC20Contract.connect(maker).approve(
      await ExchangeContractAsUser.getAddress(),
      100
    );

    await ERC1155Contract.mint(taker.address, 1, 10);
    await ERC1155Contract.connect(taker).setApprovalForAll(
      await ExchangeContractAsUser.getAddress(),
      true
    );

    expect(await ERC20Contract.balanceOf(maker.address)).to.be.equal(100);
    expect(await ERC1155Contract.balanceOf(taker.address, 1)).to.be.equal(10);

    const makerAssetForLeftOrder = await AssetERC20(ERC20Contract, 100);
    const takerAssetForLeftOrder = await AssetERC1155(ERC1155Contract, 1, 10);
    const takerAssetForRightOrder = await AssetERC1155(ERC1155Contract, 1, 5);
    const makerAssetForRightOrder = await AssetERC20(ERC20Contract, 50);

    const orderLeft = await OrderDefault(
      maker,
      makerAssetForLeftOrder,
      ZeroAddress,
      takerAssetForLeftOrder,
      1,
      0,
      0
    );
    const rightOrderForFirstMatch = await OrderDefault(
      taker,
      takerAssetForRightOrder,
      ZeroAddress,
      makerAssetForRightOrder,
      1,
      0,
      0
    );
    const makerSig = await signOrder(orderLeft, maker, OrderValidatorAsAdmin);
    const takerSigForFirstMatch = await signOrder(
      rightOrderForFirstMatch,
      taker,
      OrderValidatorAsAdmin
    );
    expect(await ExchangeContractAsUser.fills(hashKey(orderLeft))).to.be.equal(
      0
    );
    expect(
      await ExchangeContractAsUser.fills(hashKey(rightOrderForFirstMatch))
    ).to.be.equal(0);
    await ExchangeContractAsUser.matchOrders([
      {
        orderLeft,
        signatureLeft: makerSig,
        orderRight: rightOrderForFirstMatch,
        signatureRight: takerSigForFirstMatch,
      },
    ]);
    expect(await ExchangeContractAsUser.fills(hashKey(orderLeft))).to.be.equal(
      5
    );
    expect(
      await ExchangeContractAsUser.fills(hashKey(rightOrderForFirstMatch))
    ).to.be.equal(50);
    expect(await ERC1155Contract.balanceOf(maker.address, 1)).to.be.equal(5);
    expect(await ERC1155Contract.balanceOf(taker.address, 1)).to.be.equal(5);
    expect(await ERC20Contract.balanceOf(maker.address)).to.be.equal(50);
    expect(await ERC20Contract.balanceOf(taker.address)).to.be.equal(49);
    const rightOrderForSecondMatch = await OrderDefault(
      taker,
      takerAssetForRightOrder,
      ZeroAddress,
      makerAssetForRightOrder,
      2,
      0,
      0
    );
    const takerSigForSecondMatch = await signOrder(
      rightOrderForSecondMatch,
      taker,
      OrderValidatorAsAdmin
    );
    await ExchangeContractAsUser.matchOrders([
      {
        orderLeft,
        signatureLeft: makerSig,
        orderRight: rightOrderForSecondMatch,
        signatureRight: takerSigForSecondMatch,
      },
    ]);
    expect(await ExchangeContractAsUser.fills(hashKey(orderLeft))).to.be.equal(
      10
    );
    expect(
      await ExchangeContractAsUser.fills(hashKey(rightOrderForSecondMatch))
    ).to.be.equal(50);
    expect(await ERC1155Contract.balanceOf(maker.address, 1)).to.be.equal(10);
    expect(await ERC1155Contract.balanceOf(taker.address, 1)).to.be.equal(0);
    expect(await ERC20Contract.balanceOf(maker.address)).to.be.equal(0);
    expect(await ERC20Contract.balanceOf(taker.address)).to.be.equal(98);
  });

  it('should not execute match order with makerValue greater than rightMakeValue', async function () {
    const {
      ExchangeContractAsUser,
      OrderValidatorAsAdmin,
      ERC20Contract,
      ERC20Contract2,
      user1: maker,
      user2: taker,
    } = await loadFixture(deployFixtures);

    await ERC20Contract.mint(maker.address, 100);
    await ERC20Contract.connect(maker).approve(
      await ExchangeContractAsUser.getAddress(),
      100
    );

    await ERC20Contract2.mint(taker.address, 200);
    await ERC20Contract2.connect(taker).approve(
      await ExchangeContractAsUser.getAddress(),
      200
    );

    expect(await ERC20Contract.balanceOf(maker)).to.be.equal(100);
    expect(await ERC20Contract.balanceOf(taker)).to.be.equal(0);
    expect(await ERC20Contract2.balanceOf(maker)).to.be.equal(0);
    expect(await ERC20Contract2.balanceOf(taker)).to.be.equal(200);

    const makerAssetForLeftOrder = await AssetERC20(ERC20Contract, 200);
    const takerAssetForLeftOrder = await AssetERC20(ERC20Contract2, 400);
    const takerAssetForRightOrder = await AssetERC20(ERC20Contract2, 100);
    const makerAssetForRightOrder = await AssetERC20(ERC20Contract, 100);

    const orderLeft = await OrderDefault(
      maker,
      makerAssetForLeftOrder,
      ZeroAddress,
      takerAssetForLeftOrder,
      1,
      0,
      0
    );
    const orderRight = await OrderDefault(
      taker,
      takerAssetForRightOrder,
      ZeroAddress,
      makerAssetForRightOrder,
      1,
      0,
      0
    );

    const makerSig = await signOrder(orderLeft, maker, OrderValidatorAsAdmin);
    const takerSig = await signOrder(orderRight, taker, OrderValidatorAsAdmin);
    expect(await ExchangeContractAsUser.fills(hashKey(orderLeft))).to.be.equal(
      0
    );
    expect(await ExchangeContractAsUser.fills(hashKey(orderRight))).to.be.equal(
      0
    );
    await expect(
      ExchangeContractAsUser.matchOrders([
        {
          orderLeft,
          signatureLeft: makerSig,
          orderRight,
          signatureRight: takerSig,
        },
      ])
    ).to.be.revertedWith('fillRight: unable to fill');
  });

  it('should not execute match order with rightTake greater than leftMakerValue', async function () {
    const {
      ExchangeContractAsUser,
      OrderValidatorAsAdmin,
      ERC20Contract,
      ERC20Contract2,
      user1: maker,
      user2: taker,
    } = await loadFixture(deployFixtures);

    await ERC20Contract.mint(maker.address, 100);
    await ERC20Contract.connect(maker).approve(
      await ExchangeContractAsUser.getAddress(),
      100
    );

    await ERC20Contract2.mint(taker.address, 200);
    await ERC20Contract2.connect(taker).approve(
      await ExchangeContractAsUser.getAddress(),
      200
    );

    expect(await ERC20Contract.balanceOf(maker)).to.be.equal(100);
    expect(await ERC20Contract.balanceOf(taker)).to.be.equal(0);
    expect(await ERC20Contract2.balanceOf(maker)).to.be.equal(0);
    expect(await ERC20Contract2.balanceOf(taker)).to.be.equal(200);

    const makerAssetForLeftOrder = await AssetERC20(ERC20Contract, 100);
    const takerAssetForLeftOrder = await AssetERC20(ERC20Contract2, 300);
    const takerAssetForRightOrder = await AssetERC20(ERC20Contract2, 400);
    const makerAssetForRightOrder = await AssetERC20(ERC20Contract, 200);

    const orderLeft = await OrderDefault(
      maker,
      makerAssetForLeftOrder,
      ZeroAddress,
      takerAssetForLeftOrder,
      1,
      0,
      0
    );
    const orderRight = await OrderDefault(
      taker,
      takerAssetForRightOrder,
      ZeroAddress,
      makerAssetForRightOrder,
      1,
      0,
      0
    );

    const makerSig = await signOrder(orderLeft, maker, OrderValidatorAsAdmin);
    const takerSig = await signOrder(orderRight, taker, OrderValidatorAsAdmin);
    expect(await ExchangeContractAsUser.fills(hashKey(orderLeft))).to.be.equal(
      0
    );
    expect(await ExchangeContractAsUser.fills(hashKey(orderRight))).to.be.equal(
      0
    );
    await expect(
      ExchangeContractAsUser.matchOrders([
        {
          orderLeft,
          signatureLeft: makerSig,
          orderRight,
          signatureRight: takerSig,
        },
      ])
    ).to.be.revertedWith('fillLeft: unable to fill');
  });

  it('should not execute match order with zero make value', async function () {
    const {
      ExchangeContractAsUser,
      OrderValidatorAsAdmin,
      ERC20Contract,
      ERC20Contract2,
      user1: maker,
      user2: taker,
    } = await loadFixture(deployFixtures);

    await ERC20Contract.mint(maker.address, 100);
    await ERC20Contract.connect(maker).approve(
      await ExchangeContractAsUser.getAddress(),
      100
    );

    await ERC20Contract2.mint(taker.address, 200);
    await ERC20Contract2.connect(taker).approve(
      await ExchangeContractAsUser.getAddress(),
      200
    );

    expect(await ERC20Contract.balanceOf(maker)).to.be.equal(100);
    expect(await ERC20Contract.balanceOf(taker)).to.be.equal(0);
    expect(await ERC20Contract2.balanceOf(maker)).to.be.equal(0);
    expect(await ERC20Contract2.balanceOf(taker)).to.be.equal(200);

    const makerAssetForLeftOrder = await AssetERC20(ERC20Contract, 100);
    const takerAssetForLeftOrder = await AssetERC20(ERC20Contract2, 300);
    const takerAssetForRightOrder = await AssetERC20(ERC20Contract2, 400);
    const makerAssetForRightOrder = await AssetERC20(ERC20Contract, 0);

    const orderLeft = await OrderDefault(
      maker,
      makerAssetForLeftOrder,
      ZeroAddress,
      takerAssetForLeftOrder,
      1,
      0,
      0
    );
    const orderRight = await OrderDefault(
      taker,
      takerAssetForRightOrder,
      ZeroAddress,
      makerAssetForRightOrder,
      1,
      0,
      0
    );

    const makerSig = await signOrder(orderLeft, maker, OrderValidatorAsAdmin);
    const takerSig = await signOrder(orderRight, taker, OrderValidatorAsAdmin);
    expect(await ExchangeContractAsUser.fills(hashKey(orderLeft))).to.be.equal(
      0
    );
    expect(await ExchangeContractAsUser.fills(hashKey(orderRight))).to.be.equal(
      0
    );
    await expect(
      ExchangeContractAsUser.matchOrders([
        {
          orderLeft,
          signatureLeft: makerSig,
          orderRight,
          signatureRight: takerSig,
        },
      ])
    ).to.be.revertedWith('division by zero');
  });

  it('should not execute match order with significant rounding error', async function () {
    const {
      ExchangeContractAsUser,
      OrderValidatorAsAdmin,
      ERC20Contract,
      ERC20Contract2,
      user1: maker,
      user2: taker,
    } = await loadFixture(deployFixtures);

    await ERC20Contract.mint(maker.address, 100);
    await ERC20Contract.connect(maker).approve(
      await ExchangeContractAsUser.getAddress(),
      100
    );

    await ERC20Contract2.mint(taker.address, 200);
    await ERC20Contract2.connect(taker).approve(
      await ExchangeContractAsUser.getAddress(),
      200
    );

    expect(await ERC20Contract.balanceOf(maker)).to.be.equal(100);
    expect(await ERC20Contract.balanceOf(taker)).to.be.equal(0);
    expect(await ERC20Contract2.balanceOf(maker)).to.be.equal(0);
    expect(await ERC20Contract2.balanceOf(taker)).to.be.equal(200);

    const makerAssetForLeftOrder = await AssetERC20(ERC20Contract, 100);
    const takerAssetForLeftOrder = await AssetERC20(ERC20Contract2, 100);
    const takerAssetForRightOrder = await AssetERC20(ERC20Contract2, 1000);
    const makerAssetForRightOrder = await AssetERC20(ERC20Contract, 999);

    const orderLeft = await OrderDefault(
      maker,
      makerAssetForLeftOrder,
      ZeroAddress,
      takerAssetForLeftOrder,
      1,
      0,
      0
    );
    const orderRight = await OrderDefault(
      taker,
      takerAssetForRightOrder,
      ZeroAddress,
      makerAssetForRightOrder,
      1,
      0,
      0
    );

    const makerSig = await signOrder(orderLeft, maker, OrderValidatorAsAdmin);
    const takerSig = await signOrder(orderRight, taker, OrderValidatorAsAdmin);
    expect(await ExchangeContractAsUser.fills(hashKey(orderLeft))).to.be.equal(
      0
    );
    expect(await ExchangeContractAsUser.fills(hashKey(orderRight))).to.be.equal(
      0
    );
    await expect(
      ExchangeContractAsUser.matchOrders([
        {
          orderLeft,
          signatureLeft: makerSig,
          orderRight,
          signatureRight: takerSig,
        },
      ])
    ).to.be.revertedWith('rounding error');
  });

  it('should execute match order with rightTake less than leftMakerValue', async function () {
    const {
      ExchangeContractAsUser,
      OrderValidatorAsAdmin,
      ERC20Contract,
      ERC20Contract2,
      user1: maker,
      user2: taker,
    } = await loadFixture(deployFixtures);

    await ERC20Contract.mint(maker.address, 100);
    await ERC20Contract.connect(maker).approve(
      await ExchangeContractAsUser.getAddress(),
      100
    );

    await ERC20Contract2.mint(taker.address, 200);
    await ERC20Contract2.connect(taker).approve(
      await ExchangeContractAsUser.getAddress(),
      200
    );

    expect(await ERC20Contract.balanceOf(maker)).to.be.equal(100);
    expect(await ERC20Contract.balanceOf(taker)).to.be.equal(0);
    expect(await ERC20Contract2.balanceOf(maker)).to.be.equal(0);
    expect(await ERC20Contract2.balanceOf(taker)).to.be.equal(200);

    const makerAssetForLeftOrder = await AssetERC20(ERC20Contract, 100);
    const takerAssetForLeftOrder = await AssetERC20(ERC20Contract2, 200);
    const takerAssetForRightOrder = await AssetERC20(ERC20Contract2, 400);
    const makerAssetForRightOrder = await AssetERC20(ERC20Contract, 200);

    const orderLeft = await OrderDefault(
      maker,
      makerAssetForLeftOrder,
      ZeroAddress,
      takerAssetForLeftOrder,
      1,
      0,
      0
    );
    const orderRight = await OrderDefault(
      taker,
      takerAssetForRightOrder,
      ZeroAddress,
      makerAssetForRightOrder,
      1,
      0,
      0
    );

    const makerSig = await signOrder(orderLeft, maker, OrderValidatorAsAdmin);
    const takerSig = await signOrder(orderRight, taker, OrderValidatorAsAdmin);
    expect(await ExchangeContractAsUser.fills(hashKey(orderLeft))).to.be.equal(
      0
    );
    expect(await ExchangeContractAsUser.fills(hashKey(orderRight))).to.be.equal(
      0
    );
    await ExchangeContractAsUser.matchOrders([
      {
        orderLeft,
        signatureLeft: makerSig,
        orderRight,
        signatureRight: takerSig,
      },
    ]);
    expect(await ExchangeContractAsUser.fills(hashKey(orderLeft))).to.be.equal(
      200
    );
    expect(await ExchangeContractAsUser.fills(hashKey(orderRight))).to.be.equal(
      100
    );
    expect(await ERC20Contract.balanceOf(maker)).to.be.equal(0);
    expect(await ERC20Contract.balanceOf(taker)).to.be.equal(100);
    expect(await ERC20Contract2.balanceOf(maker)).to.be.equal(200);
    expect(await ERC20Contract2.balanceOf(taker)).to.be.equal(0);
  });

  it('should require the message sender to be the maker for a zero-salt left order', async function () {
    const {
      ExchangeContractAsUser,
      OrderValidatorAsAdmin,
      ERC20Contract,
      ERC20Contract2,
      user1: maker,
      user2: taker,
    } = await loadFixture(deployFixtures);

    await ERC20Contract.mint(maker.address, 200);
    await ERC20Contract.connect(maker).approve(
      await ExchangeContractAsUser.getAddress(),
      200
    );

    await ERC20Contract2.mint(taker.address, 100);
    await ERC20Contract2.connect(taker).approve(
      await ExchangeContractAsUser.getAddress(),
      100
    );

    expect(await ERC20Contract.balanceOf(maker)).to.be.equal(200);
    expect(await ERC20Contract.balanceOf(taker)).to.be.equal(0);
    expect(await ERC20Contract2.balanceOf(maker)).to.be.equal(0);
    expect(await ERC20Contract2.balanceOf(taker)).to.be.equal(100);

    const makerAsset = await AssetERC20(ERC20Contract, 200);
    const takerAsset = await AssetERC20(ERC20Contract2, 100);
    const orderLeft = await OrderDefault(
      maker,
      makerAsset,
      ZeroAddress,
      takerAsset,
      0,
      0,
      0
    );
    const orderRight = await OrderDefault(
      taker,
      takerAsset,
      ZeroAddress,
      makerAsset,
      1,
      0,
      0
    );

    const makerSig = await signOrder(orderLeft, maker, OrderValidatorAsAdmin);
    const takerSig = await signOrder(orderRight, taker, OrderValidatorAsAdmin);
    await ExchangeContractAsUser.connect(maker).matchOrders([
      {
        orderLeft,
        signatureLeft: makerSig,
        orderRight,
        signatureRight: takerSig,
      },
    ]);

    expect(await ERC20Contract.balanceOf(maker)).to.be.equal(0);
    expect(await ERC20Contract.balanceOf(taker)).to.be.equal(200);
    expect(await ERC20Contract2.balanceOf(maker)).to.be.equal(100);
    expect(await ERC20Contract2.balanceOf(taker)).to.be.equal(0);
  });

  it('should require the message sender to be the maker for a zero-salt right order', async function () {
    const {
      ExchangeContractAsUser,
      OrderValidatorAsAdmin,
      ERC20Contract,
      ERC20Contract2,
      user1: maker,
      user2: taker,
    } = await loadFixture(deployFixtures);

    await ERC20Contract.mint(maker.address, 200);
    await ERC20Contract.connect(maker).approve(
      await ExchangeContractAsUser.getAddress(),
      200
    );

    await ERC20Contract2.mint(taker.address, 100);
    await ERC20Contract2.connect(taker).approve(
      await ExchangeContractAsUser.getAddress(),
      100
    );

    expect(await ERC20Contract.balanceOf(maker)).to.be.equal(200);
    expect(await ERC20Contract.balanceOf(taker)).to.be.equal(0);
    expect(await ERC20Contract2.balanceOf(maker)).to.be.equal(0);
    expect(await ERC20Contract2.balanceOf(taker)).to.be.equal(100);

    const makerAsset = await AssetERC20(ERC20Contract, 200);
    const takerAsset = await AssetERC20(ERC20Contract2, 100);
    const orderLeft = await OrderDefault(
      maker,
      makerAsset,
      ZeroAddress,
      takerAsset,
      1,
      0,
      0
    );
    const orderRight = await OrderDefault(
      taker,
      takerAsset,
      ZeroAddress,
      makerAsset,
      0,
      0,
      0
    );

    const makerSig = await signOrder(orderLeft, maker, OrderValidatorAsAdmin);
    const takerSig = await signOrder(orderRight, taker, OrderValidatorAsAdmin);
    await ExchangeContractAsUser.connect(taker).matchOrders([
      {
        orderLeft,
        signatureLeft: makerSig,
        orderRight,
        signatureRight: takerSig,
      },
    ]);

    expect(await ERC20Contract.balanceOf(maker)).to.be.equal(0);
    expect(await ERC20Contract.balanceOf(taker)).to.be.equal(200);
    expect(await ERC20Contract2.balanceOf(maker)).to.be.equal(100);
    expect(await ERC20Contract2.balanceOf(taker)).to.be.equal(0);
  });

  it('should revert matchOrders on mismatched make asset types', async function () {
    const {
      ExchangeContractAsUser,
      OrderValidatorAsAdmin,
      ERC20Contract,
      ERC721Contract,
      ERC1155Contract,
      user1: maker,
      user2: taker,
    } = await loadFixture(deployFixtures);
    await ERC721Contract.mint(maker.address, 1);
    await ERC721Contract.connect(maker).approve(
      await ExchangeContractAsUser.getAddress(),
      1
    );
    await ERC20Contract.mint(taker.address, 100);
    await ERC20Contract.connect(taker).approve(
      await ExchangeContractAsUser.getAddress(),
      100
    );

    expect(await ERC721Contract.ownerOf(1)).to.be.equal(maker.address);
    expect(await ERC20Contract.balanceOf(taker.address)).to.be.equal(100);

    const makerAssetForLeftOrder = await AssetERC721(ERC721Contract, 1);
    const takerAssetForLeftOrder = await AssetERC20(ERC20Contract, 100);
    const takerAssetForRightOrder = await AssetERC20(ERC20Contract, 50);
    const makerAssetForRightOrder = await AssetERC1155(ERC1155Contract, 1, 5);
    const orderLeft = await OrderDefault(
      maker,
      makerAssetForLeftOrder,
      ZeroAddress,
      takerAssetForLeftOrder,
      1,
      0,
      0
    );
    const orderRight = await OrderDefault(
      taker,
      takerAssetForRightOrder,
      ZeroAddress,
      makerAssetForRightOrder,
      1,
      0,
      0
    );
    const makerSig = await signOrder(orderLeft, maker, OrderValidatorAsAdmin);
    const takerSig = await signOrder(orderRight, taker, OrderValidatorAsAdmin);

    await expect(
      ExchangeContractAsUser.matchOrders([
        {
          orderLeft,
          signatureLeft: makerSig,
          orderRight,
          signatureRight: takerSig,
        },
      ])
    ).to.be.revertedWith("assets don't match");
  });

  it('should revert matchOrders on mismatched take asset types', async function () {
    const {
      ExchangeContractAsUser,
      OrderValidatorAsAdmin,
      ERC20Contract,
      ERC721Contract,
      ERC1155Contract,
      user1: maker,
      user2: taker,
    } = await loadFixture(deployFixtures);
    await ERC721Contract.mint(maker.address, 1);
    await ERC721Contract.connect(maker).approve(
      await ExchangeContractAsUser.getAddress(),
      1
    );
    await ERC20Contract.mint(taker.address, 100);
    await ERC20Contract.connect(taker).approve(
      await ExchangeContractAsUser.getAddress(),
      100
    );

    expect(await ERC721Contract.ownerOf(1)).to.be.equal(maker.address);
    expect(await ERC20Contract.balanceOf(taker.address)).to.be.equal(100);

    const makerAssetForLeftOrder = await AssetERC721(ERC721Contract, 1);
    const takerAssetForLeftOrder = await AssetERC20(ERC20Contract, 100);
    const takerAssetForRightOrder = await AssetERC1155(ERC1155Contract, 1, 50);
    const makerAssetForRightOrder = await AssetERC721(ERC721Contract, 1);
    const orderLeft = await OrderDefault(
      maker,
      makerAssetForLeftOrder,
      ZeroAddress,
      takerAssetForLeftOrder,
      1,
      0,
      0
    );
    const orderRight = await OrderDefault(
      taker,
      takerAssetForRightOrder,
      ZeroAddress,
      makerAssetForRightOrder,
      1,
      0,
      0
    );
    const makerSig = await signOrder(orderLeft, maker, OrderValidatorAsAdmin);
    const takerSig = await signOrder(orderRight, taker, OrderValidatorAsAdmin);

    await expect(
      ExchangeContractAsUser.matchOrders([
        {
          orderLeft,
          signatureLeft: makerSig,
          orderRight,
          signatureRight: takerSig,
        },
      ])
    ).to.be.revertedWith("assets don't match");
  });

  it('should revert for matching a cancelled order', async function () {
    const {
      ExchangeContractAsUser,
      OrderValidatorAsAdmin,
      ERC20Contract,
      ERC721Contract,
      user1: maker,
      user2: taker,
    } = await loadFixture(deployFixtures);
    await ERC721Contract.mint(maker.address, 1);
    await ERC721Contract.connect(maker).approve(
      await ExchangeContractAsUser.getAddress(),
      1
    );
    await ERC20Contract.mint(taker.address, 100);
    await ERC20Contract.connect(taker).approve(
      await ExchangeContractAsUser.getAddress(),
      100
    );

    expect(await ERC721Contract.ownerOf(1)).to.be.equal(maker.address);
    expect(await ERC20Contract.balanceOf(taker.address)).to.be.equal(100);
    const makerAsset = await AssetERC721(ERC721Contract, 1);
    const takerAsset = await AssetERC20(ERC20Contract, 100);
    const orderLeft = await OrderDefault(
      maker,
      makerAsset,
      ZeroAddress,
      takerAsset,
      1,
      0,
      0
    );
    const orderRight = await OrderDefault(
      taker,
      takerAsset,
      ZeroAddress,
      makerAsset,
      1,
      0,
      0
    );
    const makerSig = await signOrder(orderLeft, maker, OrderValidatorAsAdmin);
    const takerSig = await signOrder(orderRight, taker, OrderValidatorAsAdmin);
    await ExchangeContractAsUser.connect(maker).cancel(
      orderLeft,
      hashKey(orderLeft)
    );
    await expect(
      ExchangeContractAsUser.matchOrders([
        {
          orderLeft,
          signatureLeft: makerSig,
          orderRight,
          signatureRight: takerSig,
        },
      ])
    ).to.be.reverted;
  });
});
