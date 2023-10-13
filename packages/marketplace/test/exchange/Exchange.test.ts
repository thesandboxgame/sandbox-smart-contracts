import {expect} from 'chai';
import {deployFixtures} from '../fixtures';
import {loadFixture} from '@nomicfoundation/hardhat-network-helpers';
import {AssetERC20, AssetERC721, FeeRecipientsData} from '../utils/assets.ts';

import {
  hashKey,
  hashOrder,
  OrderDefault,
  signOrder,
  UINT256_MAX_VALUE,
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
});
