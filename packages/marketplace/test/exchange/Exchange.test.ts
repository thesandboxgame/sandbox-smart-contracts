import {expect} from 'chai';
import {deployFixtures} from '../fixtures';
import {loadFixture} from '@nomicfoundation/hardhat-network-helpers';
import {AssetERC20, AssetERC721, FeeRecipientsData} from '../utils/assets.ts';

import {
  getSymmetricOrder,
  hashKey,
  hashOrder,
  OrderDefault,
  signOrder,
  UINT256_MAX_VALUE,
  isOrderEqual,
} from '../utils/order.ts';
import {ZeroAddress} from 'ethers';

describe('Exchange.sol', function () {
  it('should not cancel the order if caller is not maker', async function () {
    const {
      ExchangeContractAsDeployer,
      user1,
      user2,
      ERC20Contract,
      ERC721Contract,
    } = await loadFixture(deployFixtures);

    const makerAsset = await AssetERC20(ERC20Contract, 123000000);
    const takerAsset = await AssetERC721(ERC721Contract, 456000000);

    const leftOrder = await OrderDefault(
      user1,
      makerAsset,
      ZeroAddress,
      takerAsset,
      1,
      0,
      0
    );
    await expect(
      ExchangeContractAsDeployer.connect(user2).cancel(
        leftOrder,
        hashOrder(leftOrder)
      )
    ).to.be.revertedWith('not maker');
  });

  it('should not cancel an order if Exchange Contract is paused', async function () {
    const {
      ExchangeContractAsUser,
      ExchangeContractAsAdmin,
      user,
      ERC20Contract,
      ERC721Contract,
      PAUSER_ROLE,
    } = await loadFixture(deployFixtures);

    await ExchangeContractAsAdmin.grantRole(PAUSER_ROLE, user.address);
    await ExchangeContractAsAdmin.connect(user).pause();
    expect(await ExchangeContractAsAdmin.paused()).to.be.true;

    const makerAsset = await AssetERC20(ERC20Contract, 100);
    const takerAsset = await AssetERC721(ERC721Contract, 100);

    const leftOrder = await OrderDefault(
      user,
      makerAsset,
      ZeroAddress,
      takerAsset,
      1,
      0,
      0
    );

    await expect(
      ExchangeContractAsUser.cancel(leftOrder, hashKey(leftOrder))
    ).to.be.revertedWith('Pausable: paused');
  });

  it('should cancel an order and update fills mapping', async function () {
    const {ExchangeContractAsUser, user, ERC20Contract, ERC721Contract} =
      await loadFixture(deployFixtures);

    const makerAsset = await AssetERC20(ERC20Contract, 100);
    const takerAsset = await AssetERC721(ERC721Contract, 100);

    const leftOrder = await OrderDefault(
      user,
      makerAsset,
      ZeroAddress,
      takerAsset,
      1,
      0,
      0
    );

    await ExchangeContractAsUser.cancel(leftOrder, hashKey(leftOrder));

    expect(await ExchangeContractAsUser.fills(hashKey(leftOrder))).to.be.equal(
      UINT256_MAX_VALUE
    );
  });

  it('should not execute match order if Exchange Contract is paused', async function () {
    const {
      ExchangeContractAsUser,
      ExchangeContractAsAdmin,
      OrderValidatorAsAdmin,
      ERC20Contract,
      ERC20Contract2,
      PAUSER_ROLE,
      user,
      user1: maker,
      user2: taker,
    } = await loadFixture(deployFixtures);

    await ExchangeContractAsAdmin.grantRole(PAUSER_ROLE, user.address);
    await ExchangeContractAsAdmin.connect(user).pause();
    expect(await ExchangeContractAsAdmin.paused()).to.be.true;

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
    ).to.be.revertedWith('Pausable: paused');
  });

  it('should not execute match order with an empty order array', async function () {
    const {ExchangeContractAsUser} = await loadFixture(deployFixtures);

    await expect(ExchangeContractAsUser.matchOrders([])).to.be.revertedWith(
      'ExchangeMatch cant be empty'
    );
  });

  it('should not execute match order when left order taker is not equal to right order maker', async function () {
    const {
      ExchangeContractAsUser,
      OrderValidatorAsAdmin,
      ERC20Contract,
      ERC20Contract2,
      user,
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
      user,
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
    await expect(
      ExchangeContractAsUser.matchOrders([
        {
          orderLeft,
          signatureLeft: makerSig,
          orderRight,
          signatureRight: takerSig,
        },
      ])
    ).to.be.revertedWith('leftOrder.taker failed');
  });

  it('should not execute match order when right order taker is not equal to left order maker', async function () {
    const {
      ExchangeContractAsUser,
      OrderValidatorAsAdmin,
      ERC20Contract,
      ERC20Contract2,
      user,
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
      user,
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
    ).to.be.revertedWith('rightOrder.taker failed');
  });

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

  it('should emit a Match event', async function () {
    const {
      ExchangeContractAsUser,
      OrderValidatorAsAdmin,
      ERC20Contract,
      ERC20Contract2,
      user,
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

    const tx = await ExchangeContractAsUser.matchOrders([
      {
        orderLeft,
        signatureLeft: makerSig,
        orderRight,
        signatureRight: takerSig,
      },
    ]);

    function verifyOrderLeft(eventOrder: Order): boolean {
      return isOrderEqual(eventOrder, orderLeft);
    }

    function verifyOrderRight(eventOrder: Order): boolean {
      return isOrderEqual(eventOrder, orderRight);
    }

    await expect(tx)
      .to.emit(ExchangeContractAsUser, 'Match')
      .withArgs(
        user.address,
        verifyOrderLeft,
        verifyOrderRight,
        [123000000, 456000000],
        456000000,
        123000000
      );

    expect(await ERC20Contract.balanceOf(maker)).to.be.equal(0);
    expect(await ERC20Contract.balanceOf(taker)).to.be.equal(123000000);
    expect(await ERC20Contract2.balanceOf(maker)).to.be.equal(456000000);
    expect(await ERC20Contract2.balanceOf(taker)).to.be.equal(0);
  });

  it('should execute a complete match order between ERC20 tokens', async function () {
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

  it('should execute match orders for token without IROYALTYUGC support', async function () {
    const {
      ExchangeContractAsUser,
      OrderValidatorAsAdmin,
      ERC20Contract,
      ERC721WithRoyaltyWithoutIROYALTYUGC,
      defaultFeeReceiver,
      user1: maker,
      user2: taker,
    } = await loadFixture(deployFixtures);

    await ERC721WithRoyaltyWithoutIROYALTYUGC.mint(maker.address, 1, [
      await FeeRecipientsData(maker.address, 10000),
    ]);

    await ERC721WithRoyaltyWithoutIROYALTYUGC.connect(maker).approve(
      await ExchangeContractAsUser.getAddress(),
      1
    );
    await ERC20Contract.mint(taker.address, 100000000000);
    await ERC20Contract.connect(taker).approve(
      await ExchangeContractAsUser.getAddress(),
      100000000000
    );

    expect(await ERC721WithRoyaltyWithoutIROYALTYUGC.ownerOf(1)).to.be.equal(
      maker.address
    );
    expect(await ERC20Contract.balanceOf(taker.address)).to.be.equal(
      100000000000
    );
    const makerAsset = await AssetERC721(
      ERC721WithRoyaltyWithoutIROYALTYUGC,
      1
    );
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
    expect(await ERC721WithRoyaltyWithoutIROYALTYUGC.ownerOf(1)).to.be.equal(
      taker.address
    );
    expect(await ERC20Contract.balanceOf(maker.address)).to.be.equal(
      97500000000
    );

    // check protocol fee
    expect(
      await ERC20Contract.balanceOf(defaultFeeReceiver.address)
    ).to.be.equal(2500000000); // 250 * 10000000000 / 10000 = 2500000000
  });

  it('should not execute matchOrdersFrom if caller do not have ERC1776 operator role', async function () {
    const {
      ExchangeContractAsUser,
      OrderValidatorAsAdmin,
      ERC20Contract,
      ERC20Contract2,
      ERC1776_OPERATOR_ROLE,
      user,
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
      1,
      0,
      0
    );

    const makerSig = await signOrder(orderLeft, maker, OrderValidatorAsAdmin);
    const takerSig = await signOrder(orderRight, taker, OrderValidatorAsAdmin);
    await expect(
      ExchangeContractAsUser.matchOrdersFrom(maker.address, [
        {
          orderLeft,
          signatureLeft: makerSig,
          orderRight,
          signatureRight: takerSig,
        },
      ])
    ).to.be.revertedWith(
      `AccessControl: account ${user.address.toLowerCase()} is missing role ${ERC1776_OPERATOR_ROLE}`
    );
  });

  it('should not execute matchOrdersFrom if sender is zero address', async function () {
    const {
      ExchangeContractAsUser,
      ExchangeContractAsAdmin,
      OrderValidatorAsAdmin,
      ERC20Contract,
      ERC20Contract2,
      ERC1776_OPERATOR_ROLE,
      user1: maker,
      user2: taker,
    } = await loadFixture(deployFixtures);

    await ExchangeContractAsAdmin.grantRole(
      ERC1776_OPERATOR_ROLE,
      maker.address
    );

    expect(
      await ExchangeContractAsUser.hasRole(ERC1776_OPERATOR_ROLE, maker.address)
    ).to.be.equal(true);

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
      1,
      0,
      0
    );

    const makerSig = await signOrder(orderLeft, maker, OrderValidatorAsAdmin);
    const takerSig = await signOrder(orderRight, taker, OrderValidatorAsAdmin);
    await expect(
      ExchangeContractAsUser.connect(maker).matchOrdersFrom(ZeroAddress, [
        {
          orderLeft,
          signatureLeft: makerSig,
          orderRight,
          signatureRight: takerSig,
        },
      ])
    ).to.be.revertedWith('invalid sender');
  });

  it('should not execute matchOrdersFrom if Exchange Contract is paused', async function () {
    const {
      ExchangeContractAsUser,
      ExchangeContractAsAdmin,
      OrderValidatorAsAdmin,
      ERC20Contract,
      ERC20Contract2,
      PAUSER_ROLE,
      ERC1776_OPERATOR_ROLE,
      user,
      user1: maker,
      user2: taker,
    } = await loadFixture(deployFixtures);

    await ExchangeContractAsAdmin.grantRole(PAUSER_ROLE, user.address);
    await ExchangeContractAsAdmin.connect(user).pause();
    expect(await ExchangeContractAsAdmin.paused()).to.be.true;

    await ExchangeContractAsAdmin.grantRole(
      ERC1776_OPERATOR_ROLE,
      maker.address
    );

    expect(
      await ExchangeContractAsUser.hasRole(ERC1776_OPERATOR_ROLE, maker.address)
    ).to.be.equal(true);

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
      1,
      0,
      0
    );

    const makerSig = await signOrder(orderLeft, maker, OrderValidatorAsAdmin);
    const takerSig = await signOrder(orderRight, taker, OrderValidatorAsAdmin);
    await expect(
      ExchangeContractAsUser.connect(maker).matchOrdersFrom(maker.address, [
        {
          orderLeft,
          signatureLeft: makerSig,
          orderRight,
          signatureRight: takerSig,
        },
      ])
    ).to.be.revertedWith('Pausable: paused');
  });

  it('should execute matchOrdersFrom', async function () {
    const {
      ExchangeContractAsUser,
      ExchangeContractAsAdmin,
      OrderValidatorAsAdmin,
      ERC20Contract,
      ERC20Contract2,
      ERC1776_OPERATOR_ROLE,
      user1: maker,
      user2: taker,
    } = await loadFixture(deployFixtures);

    await ExchangeContractAsAdmin.grantRole(
      ERC1776_OPERATOR_ROLE,
      maker.address
    );

    expect(
      await ExchangeContractAsUser.hasRole(ERC1776_OPERATOR_ROLE, maker.address)
    ).to.be.equal(true);

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
      1,
      0,
      0
    );

    const makerSig = await signOrder(orderLeft, maker, OrderValidatorAsAdmin);
    const takerSig = await signOrder(orderRight, taker, OrderValidatorAsAdmin);
    await ExchangeContractAsUser.connect(maker).matchOrdersFrom(maker.address, [
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

  describe('batching', function () {
    it('should be able to buy 2 tokens from different orders in one txs', async function () {
      const {
        ExchangeContractAsUser,
        OrderValidatorAsAdmin,
        ERC20Contract,
        ERC721Contract,
        user: taker,
        user2: maker,
      } = await loadFixture(deployFixtures);
      const totalPayment = 200;
      await ERC20Contract.mint(taker.address, totalPayment);
      await ERC20Contract.connect(taker).approve(
        await ExchangeContractAsUser.getAddress(),
        totalPayment
      );
      await ERC721Contract.mint(maker.address, 123);
      await ERC721Contract.connect(maker).approve(
        await ExchangeContractAsUser.getAddress(),
        123
      );
      await ERC721Contract.mint(maker.address, 345);
      await ERC721Contract.connect(maker).approve(
        await ExchangeContractAsUser.getAddress(),
        345
      );

      expect(await ERC20Contract.balanceOf(taker)).to.be.equal(totalPayment);
      expect(await ERC20Contract.balanceOf(maker)).to.be.equal(0);

      expect(await ERC721Contract.ownerOf(123)).to.be.equal(maker.address);
      expect(await ERC721Contract.ownerOf(345)).to.be.equal(maker.address);

      const takerAsset = await AssetERC20(ERC20Contract, totalPayment / 2);
      const left1 = await OrderDefault(
        maker,
        await AssetERC721(ERC721Contract, 123),
        ZeroAddress,
        takerAsset,
        1,
        0,
        0
      );
      const left2 = await OrderDefault(
        maker,
        await AssetERC721(ERC721Contract, 345),
        ZeroAddress,
        takerAsset,
        1,
        0,
        0
      );
      await ExchangeContractAsUser.matchOrders([
        {
          orderLeft: left1,
          signatureLeft: await signOrder(left1, maker, OrderValidatorAsAdmin),
          orderRight: await getSymmetricOrder(left1, taker),
          signatureRight: '0x',
        },
        {
          orderLeft: left2,
          signatureLeft: await signOrder(left2, maker, OrderValidatorAsAdmin),
          orderRight: await getSymmetricOrder(left2, taker),
          signatureRight: '0x',
        },
      ]);

      expect(await ERC20Contract.balanceOf(taker)).to.be.equal(0);
      // 4 == fees?
      expect(await ERC20Contract.balanceOf(maker)).to.be.equal(
        totalPayment - 4
      );

      expect(await ERC721Contract.ownerOf(123)).to.be.equal(taker.address);
      expect(await ERC721Contract.ownerOf(345)).to.be.equal(taker.address);
    });

    it('should be able to buy 3 tokens from different orders in one txs', async function () {
      const {
        ExchangeContractAsUser,
        OrderValidatorAsAdmin,
        ERC20Contract,
        ERC721Contract,
        user: taker,
        user2: maker,
      } = await loadFixture(deployFixtures);
      const totalPayment = 300;
      await ERC20Contract.mint(taker.address, totalPayment);
      await ERC20Contract.connect(taker).approve(
        await ExchangeContractAsUser.getAddress(),
        totalPayment
      );

      for (let i = 0; i < 3; i++) {
        await ERC721Contract.mint(maker.address, i);
        await ERC721Contract.connect(maker).approve(
          await ExchangeContractAsUser.getAddress(),
          i
        );
      }

      expect(await ERC20Contract.balanceOf(taker)).to.be.equal(totalPayment);
      expect(await ERC20Contract.balanceOf(maker)).to.be.equal(0);

      for (let i = 0; i < 3; i++) {
        expect(await ERC721Contract.ownerOf(i)).to.be.equal(maker.address);
      }

      const takerAsset = await AssetERC20(ERC20Contract, totalPayment / 3);

      const leftOrders = [];
      for (let i = 0; i < 3; i++) {
        const leftorder = await OrderDefault(
          maker,
          await AssetERC721(ERC721Contract, i),
          ZeroAddress,
          takerAsset,
          1,
          0,
          0
        );
        leftOrders.push(leftorder);
      }

      const rightOrders = [];
      for (let i = 0; i < 3; i++) {
        const rightorder = {
          orderLeft: leftOrders[i],
          signatureLeft: await signOrder(
            leftOrders[i],
            maker,
            OrderValidatorAsAdmin
          ),
          orderRight: await getSymmetricOrder(leftOrders[i], taker),
          signatureRight: '0x',
        };
        rightOrders.push(rightorder);
      }

      await ExchangeContractAsUser.matchOrders(rightOrders);

      expect(await ERC20Contract.balanceOf(taker)).to.be.equal(0);

      expect(await ERC20Contract.balanceOf(maker)).to.be.equal(
        totalPayment - 2 * 3
      );
      for (let i = 0; i < 3; i++) {
        expect(await ERC721Contract.ownerOf(i)).to.be.equal(taker.address);
      }
    });

    // eslint-disable-next-line mocha/no-skipped-tests
    it.skip('@slow should be able to buy 20 tokens from different orders in one txs', async function () {
      const {
        ExchangeContractAsUser,
        OrderValidatorAsAdmin,
        ERC20Contract,
        ERC721Contract,
        user: taker,
        user2: maker,
      } = await loadFixture(deployFixtures);
      const totalPayment = 2000;
      await ERC20Contract.mint(taker.address, totalPayment);
      await ERC20Contract.connect(taker).approve(
        await ExchangeContractAsUser.getAddress(),
        totalPayment
      );

      for (let i = 0; i < 20; i++) {
        await ERC721Contract.mint(maker.address, i);
        await ERC721Contract.connect(maker).approve(
          await ExchangeContractAsUser.getAddress(),
          i
        );
      }

      expect(await ERC20Contract.balanceOf(taker)).to.be.equal(totalPayment);
      expect(await ERC20Contract.balanceOf(maker)).to.be.equal(0);

      for (let i = 0; i < 20; i++) {
        expect(await ERC721Contract.ownerOf(i)).to.be.equal(maker.address);
      }

      const takerAsset = await AssetERC20(ERC20Contract, totalPayment / 20);

      const leftOrders = [];
      for (let i = 0; i < 20; i++) {
        const leftorder = await OrderDefault(
          maker,
          await AssetERC721(ERC721Contract, i),
          ZeroAddress,
          takerAsset,
          1,
          0,
          0
        );
        leftOrders.push(leftorder);
      }

      const rightOrders = [];
      for (let i = 0; i < 20; i++) {
        const rightorder = {
          orderLeft: leftOrders[i],
          signatureLeft: await signOrder(
            leftOrders[i],
            maker,
            OrderValidatorAsAdmin
          ),
          orderRight: await getSymmetricOrder(leftOrders[i], taker),
          signatureRight: '0x',
        };
        rightOrders.push(rightorder);
      }

      const tx = await ExchangeContractAsUser.matchOrders(rightOrders);

      const receipt = await tx.wait();
      console.log('Gas used for 20 tokens: ' + receipt.gasUsed);

      expect(await ERC20Contract.balanceOf(taker)).to.be.equal(0);

      expect(await ERC20Contract.balanceOf(maker)).to.be.equal(
        totalPayment - 40
      );

      for (let i = 0; i < 20; i++) {
        expect(await ERC721Contract.ownerOf(i)).to.be.equal(taker.address);
      }
    });

    // eslint-disable-next-line mocha/no-skipped-tests
    it.skip('@slow should be able to buy 50 tokens from different orders in one txs', async function () {
      const {
        ExchangeContractAsUser,
        OrderValidatorAsAdmin,
        ERC20Contract,
        ERC721Contract,
        user: taker,
        user2: maker,
      } = await loadFixture(deployFixtures);
      const totalPayment = 5000;
      await ERC20Contract.mint(taker.address, totalPayment);
      await ERC20Contract.connect(taker).approve(
        await ExchangeContractAsUser.getAddress(),
        totalPayment
      );

      for (let i = 0; i < 50; i++) {
        await ERC721Contract.mint(maker.address, i);
        await ERC721Contract.connect(maker).approve(
          await ExchangeContractAsUser.getAddress(),
          i
        );
      }

      expect(await ERC20Contract.balanceOf(taker)).to.be.equal(totalPayment);
      expect(await ERC20Contract.balanceOf(maker)).to.be.equal(0);

      for (let i = 0; i < 50; i++) {
        expect(await ERC721Contract.ownerOf(i)).to.be.equal(maker.address);
      }

      const takerAsset = await AssetERC20(ERC20Contract, totalPayment / 50);

      const leftOrders = [];
      for (let i = 0; i < 50; i++) {
        const leftorder = await OrderDefault(
          maker,
          await AssetERC721(ERC721Contract, i),
          ZeroAddress,
          takerAsset,
          1,
          0,
          0
        );
        leftOrders.push(leftorder);
      }

      const rightOrders = [];
      for (let i = 0; i < 50; i++) {
        const rightorder = {
          orderLeft: leftOrders[i],
          signatureLeft: await signOrder(
            leftOrders[i],
            maker,
            OrderValidatorAsAdmin
          ),
          orderRight: await getSymmetricOrder(leftOrders[i], taker),
          signatureRight: '0x',
        };
        rightOrders.push(rightorder);
      }

      const tx = await ExchangeContractAsUser.matchOrders(rightOrders);

      const receipt = await tx.wait();
      console.log('Gas used for 50 tokens: ' + receipt.gasUsed);

      expect(await ERC20Contract.balanceOf(taker)).to.be.equal(0);

      expect(await ERC20Contract.balanceOf(maker)).to.be.equal(
        totalPayment - 2 * 50
      );
      for (let i = 0; i < 50; i++) {
        expect(await ERC721Contract.ownerOf(i)).to.be.equal(taker.address);
      }
    });

    it('should not be able to buy 51 tokens from different orders in one txs, match orders limit = 50', async function () {
      const {
        ExchangeContractAsUser,
        OrderValidatorAsAdmin,
        ERC20Contract,
        ERC721Contract,
        user: taker,
        user2: maker,
      } = await loadFixture(deployFixtures);
      const totalPayment = 5100;
      await ERC20Contract.mint(taker.address, totalPayment);
      await ERC20Contract.connect(taker).approve(
        await ExchangeContractAsUser.getAddress(),
        totalPayment
      );

      for (let i = 0; i < 51; i++) {
        await ERC721Contract.mint(maker.address, i);
        await ERC721Contract.connect(maker).approve(
          await ExchangeContractAsUser.getAddress(),
          i
        );
      }

      expect(await ERC20Contract.balanceOf(taker)).to.be.equal(totalPayment);
      expect(await ERC20Contract.balanceOf(maker)).to.be.equal(0);

      for (let i = 0; i < 51; i++) {
        expect(await ERC721Contract.ownerOf(i)).to.be.equal(maker.address);
      }

      const takerAsset = await AssetERC20(ERC20Contract, totalPayment / 51);

      const leftOrders = [];
      for (let i = 0; i < 51; i++) {
        const leftorder = await OrderDefault(
          maker,
          await AssetERC721(ERC721Contract, i),
          ZeroAddress,
          takerAsset,
          1,
          0,
          0
        );
        leftOrders.push(leftorder);
      }

      const rightOrders = [];
      for (let i = 0; i < 51; i++) {
        const rightorder = {
          orderLeft: leftOrders[i],
          signatureLeft: await signOrder(
            leftOrders[i],
            maker,
            OrderValidatorAsAdmin
          ),
          orderRight: await getSymmetricOrder(leftOrders[i], taker),
          signatureRight: '0x',
        };
        rightOrders.push(rightorder);
      }

      await expect(
        ExchangeContractAsUser.matchOrders(rightOrders)
      ).to.be.revertedWith('too many ExchangeMatch');
    });
  });

  describe('Whitelisting tokens', function () {
    it('should NOT execute a complete match order between ERC20 tokens if whitelisting for ERC20 is ON', async function () {
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
        1,
        0,
        0
      );

      await OrderValidatorAsAdmin.setPermissions(false, false, false, true);

      const makerSig = await signOrder(orderLeft, maker, OrderValidatorAsAdmin);
      const takerSig = await signOrder(
        orderRight,
        taker,
        OrderValidatorAsAdmin
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
      ).to.be.revertedWith('payment token not allowed');
    });

    it('should execute a complete match order between ERC20 tokens if added to whitelist and ERC20 is ON', async function () {
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
        1,
        0,
        0
      );

      await OrderValidatorAsAdmin.setPermissions(false, false, false, true);
      await OrderValidatorAsAdmin.addERC20(ERC20Contract);
      await OrderValidatorAsAdmin.addERC20(ERC20Contract2);

      const makerSig = await signOrder(orderLeft, maker, OrderValidatorAsAdmin);
      const takerSig = await signOrder(
        orderRight,
        taker,
        OrderValidatorAsAdmin
      );

      await ExchangeContractAsUser.matchOrders([
        {
          orderLeft,
          signatureLeft: makerSig,
          orderRight,
          signatureRight: takerSig,
        },
      ]);
    });

    it('should NOT allow ERC721 tokens exchange if tsbOnly is activated and token is not whitelisted', async function () {
      const {
        ExchangeContractAsUser,
        OrderValidatorAsAdmin,
        ERC20Contract,
        ERC721WithRoyaltyV2981,
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

      expect(await ERC721WithRoyaltyV2981.ownerOf(1)).to.be.equal(
        maker.address
      );
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
      const takerSig = await signOrder(
        orderRight,
        taker,
        OrderValidatorAsAdmin
      );

      expect(
        await ExchangeContractAsUser.fills(hashKey(orderLeft))
      ).to.be.equal(0);
      expect(
        await ExchangeContractAsUser.fills(hashKey(orderRight))
      ).to.be.equal(0);

      await OrderValidatorAsAdmin.setPermissions(true, false, false, false);

      await expect(
        ExchangeContractAsUser.matchOrders([
          {
            orderLeft,
            signatureLeft: makerSig,
            orderRight,
            signatureRight: takerSig,
          },
        ])
      ).to.be.revertedWith('not allowed');
    });

    it('should allow ERC721 tokens exchange if tsbOnly is activated and token is whitelisted', async function () {
      const {
        ExchangeContractAsUser,
        OrderValidatorAsAdmin,
        ERC20Contract,
        ERC721WithRoyaltyV2981,
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

      expect(await ERC721WithRoyaltyV2981.ownerOf(1)).to.be.equal(
        maker.address
      );
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
      const takerSig = await signOrder(
        orderRight,
        taker,
        OrderValidatorAsAdmin
      );

      expect(
        await ExchangeContractAsUser.fills(hashKey(orderLeft))
      ).to.be.equal(0);
      expect(
        await ExchangeContractAsUser.fills(hashKey(orderRight))
      ).to.be.equal(0);

      await OrderValidatorAsAdmin.setPermissions(true, false, false, false);
      await OrderValidatorAsAdmin.addTSB(ERC721WithRoyaltyV2981);

      await ExchangeContractAsUser.matchOrders([
        {
          orderLeft,
          signatureLeft: makerSig,
          orderRight,
          signatureRight: takerSig,
        },
      ]);
    });

    it('should NOT allow ERC721 tokens exchange if partners is activated and token is not whitelisted', async function () {
      const {
        ExchangeContractAsUser,
        OrderValidatorAsAdmin,
        ERC20Contract,
        ERC721WithRoyaltyV2981,
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

      expect(await ERC721WithRoyaltyV2981.ownerOf(1)).to.be.equal(
        maker.address
      );
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
      const takerSig = await signOrder(
        orderRight,
        taker,
        OrderValidatorAsAdmin
      );

      expect(
        await ExchangeContractAsUser.fills(hashKey(orderLeft))
      ).to.be.equal(0);
      expect(
        await ExchangeContractAsUser.fills(hashKey(orderRight))
      ).to.be.equal(0);

      await OrderValidatorAsAdmin.setPermissions(false, true, false, false);

      await expect(
        ExchangeContractAsUser.matchOrders([
          {
            orderLeft,
            signatureLeft: makerSig,
            orderRight,
            signatureRight: takerSig,
          },
        ])
      ).to.be.revertedWith('not allowed');
    });

    it('should allow ERC721 tokens exchange if partners is activated and token is whitelisted', async function () {
      const {
        ExchangeContractAsUser,
        OrderValidatorAsAdmin,
        ERC20Contract,
        ERC721WithRoyaltyV2981,
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

      expect(await ERC721WithRoyaltyV2981.ownerOf(1)).to.be.equal(
        maker.address
      );
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
      const takerSig = await signOrder(
        orderRight,
        taker,
        OrderValidatorAsAdmin
      );

      expect(
        await ExchangeContractAsUser.fills(hashKey(orderLeft))
      ).to.be.equal(0);
      expect(
        await ExchangeContractAsUser.fills(hashKey(orderRight))
      ).to.be.equal(0);

      await OrderValidatorAsAdmin.setPermissions(false, true, false, false);
      await OrderValidatorAsAdmin.addPartner(ERC721WithRoyaltyV2981);

      await ExchangeContractAsUser.matchOrders([
        {
          orderLeft,
          signatureLeft: makerSig,
          orderRight,
          signatureRight: takerSig,
        },
      ]);
    });

    it('should allow ERC721 tokens exchange if tsbOnly and partners are activated but so is open', async function () {
      const {
        ExchangeContractAsUser,
        OrderValidatorAsAdmin,
        ERC20Contract,
        ERC721WithRoyaltyV2981,
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

      expect(await ERC721WithRoyaltyV2981.ownerOf(1)).to.be.equal(
        maker.address
      );
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
      const takerSig = await signOrder(
        orderRight,
        taker,
        OrderValidatorAsAdmin
      );

      expect(
        await ExchangeContractAsUser.fills(hashKey(orderLeft))
      ).to.be.equal(0);
      expect(
        await ExchangeContractAsUser.fills(hashKey(orderRight))
      ).to.be.equal(0);

      await OrderValidatorAsAdmin.setPermissions(true, true, true, false);

      await ExchangeContractAsUser.matchOrders([
        {
          orderLeft,
          signatureLeft: makerSig,
          orderRight,
          signatureRight: takerSig,
        },
      ]);
    });
  });
});
