import {expect} from 'chai';
import {deployFixtures} from '../fixtures';
import {loadFixture} from '@nomicfoundation/hardhat-network-helpers';
import {AssetERC20, AssetERC721} from '../utils/assets.ts';

import {hashKey, OrderDefault, signOrder} from '../utils/order.ts';
import {ZeroAddress} from 'ethers';

describe('ExchangeCore.sol', function () {
  it('should not cancel order with zero salt', async function () {
    const {ExchangeContractAsUser, user, ERC20Contract, ERC721Contract} =
      await loadFixture(deployFixtures);

    const makerAsset = await AssetERC20(ERC20Contract, 100);
    const takerAsset = await AssetERC721(ERC721Contract, 100);

    const leftOrder = await OrderDefault(
      user,
      makerAsset,
      ZeroAddress,
      takerAsset,
      0, // setting salt value to 0
      0,
      0
    );
    await expect(
      ExchangeContractAsUser.cancel(leftOrder, hashKey(leftOrder))
    ).to.be.revertedWith("0 salt can't be used");
  });

  it('should not cancel the order with invalid order hash', async function () {
    const {ExchangeContractAsUser, user1, ERC20Contract, ERC721Contract} =
      await loadFixture(deployFixtures);

    const makerAsset = await AssetERC20(ERC20Contract, 100);
    const takerAsset = await AssetERC721(ERC721Contract, 100);

    const leftOrder = await OrderDefault(
      user1,
      makerAsset,
      ZeroAddress,
      takerAsset,
      1,
      0,
      0
    );

    const invalidOrderHash =
      '0x1234567890123456789012345678901234567890123456789012345678901234';
    await expect(
      ExchangeContractAsUser.connect(user1).cancel(leftOrder, invalidOrderHash)
    ).to.be.revertedWith('Invalid orderHash');
  });

  it('should not execute match order with an empty order array', async function () {
    const {ExchangeContractAsUser} = await loadFixture(deployFixtures);

    await expect(ExchangeContractAsUser.matchOrders([])).to.be.revertedWith(
      'invalid exchange match quantities'
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

  it('should not execute match order for already matched orders', async function () {
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
    expect(await ERC20Contract.balanceOf(taker)).to.be.equal(200);
    expect(await ERC20Contract2.balanceOf(maker)).to.be.equal(100);
    expect(await ERC20Contract2.balanceOf(taker)).to.be.equal(0);

    await expect(
      ExchangeContractAsUser.matchOrders([
        {
          orderLeft,
          signatureLeft: makerSig,
          orderRight,
          signatureRight: takerSig,
        },
      ])
    ).to.be.revertedWith('nothing to fill');
  });
});
