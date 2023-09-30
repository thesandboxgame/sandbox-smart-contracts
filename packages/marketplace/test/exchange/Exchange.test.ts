import {expect} from 'chai';
import {deployFixtures} from '../fixtures';
import {loadFixture} from '@nomicfoundation/hardhat-network-helpers';
import {
  AssetERC1155,
  AssetERC20,
  AssetERC721,
  AssetETH,
} from '../utils/assets.ts';

import {
  hashKey,
  hashOrder,
  OrderDefault,
  UINT256_MAX_VALUE,
} from '../utils/order.ts';
import {ZeroAddress} from 'ethers';
import {signOrder} from '../utils/signature';

describe('Exchange.sol', function () {
  it('should return the correct value of protocol fee', async function () {
    const {
      ExchangeContractAsDeployer,
      protocolFeePrimary,
      protocolFeeSecondary,
    } = await loadFixture(deployFixtures);

    expect(await ExchangeContractAsDeployer.protocolFeePrimary()).to.be.equal(
      protocolFeePrimary
    );
    expect(await ExchangeContractAsDeployer.protocolFeeSecondary()).to.be.equal(
      protocolFeeSecondary
    );
  });

  it('should return the correct fee receiver address', async function () {
    const {ExchangeContractAsDeployer, defaultFeeReceiver} = await loadFixture(
      deployFixtures
    );

    expect(await ExchangeContractAsDeployer.defaultFeeReceiver()).to.be.equal(
      defaultFeeReceiver.address
    );
  });

  it('should return the correct royalty registry address', async function () {
    const {ExchangeContractAsDeployer, RoyaltyRegistry} = await loadFixture(
      deployFixtures
    );

    expect(await ExchangeContractAsDeployer.royaltiesRegistry()).to.be.equal(
      await RoyaltyRegistry.getAddress()
    );
  });

  it('should not cancel the order if caller is not maker', async function () {
    const {ExchangeContractAsDeployer, user1, user2, ERC20Contract} =
      await loadFixture(deployFixtures);

    const makerAsset = await AssetERC20(ERC20Contract, 100);
    const takerAsset = await AssetETH(100);

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
    ).to.be.revertedWith('ExchangeCore: not maker');
  });

  it('should not cancel order with zero salt', async function () {
    const {ExchangeContractAsUser, user, ERC20Contract} = await loadFixture(
      deployFixtures
    );

    const makerAsset = await AssetERC20(ERC20Contract, 100);
    const takerAsset = await AssetETH(100);

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
    ).to.be.revertedWith("ExchangeCore: 0 salt can't be used");
  });

  it('should not cancel the order with invalid order hash', async function () {
    const {ExchangeContractAsUser, user1, ERC20Contract} = await loadFixture(
      deployFixtures
    );

    const makerAsset = await AssetERC20(ERC20Contract, 100);
    const takerAsset = await AssetETH(100);

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
    ).to.be.revertedWith('ExchangeCore: Invalid orderHash');
  });

  it('should cancel an order and update fills mapping', async function () {
    const {ExchangeContractAsUser, user, ERC20Contract} = await loadFixture(
      deployFixtures
    );

    const makerAsset = await AssetERC20(ERC20Contract, 100);
    const takerAsset = await AssetETH(100);

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

  it('should execute a complete match order between ERC20 tokens', async function () {
    const {
      ExchangeContractAsUser,
      OrderValidatorAsDeployer,
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

    const leftOrder = await OrderDefault(
      maker,
      makerAsset,
      ZeroAddress,
      takerAsset,
      1,
      0,
      0
    );
    const rightOrder = await OrderDefault(
      taker,
      takerAsset,
      ZeroAddress,
      makerAsset,
      1,
      0,
      0
    );

    const makerSig = await signOrder(
      leftOrder,
      maker,
      OrderValidatorAsDeployer
    );
    const takerSig = await signOrder(
      rightOrder,
      taker,
      OrderValidatorAsDeployer
    );
    await ExchangeContractAsUser.matchOrders(
      leftOrder,
      makerSig,
      rightOrder,
      takerSig
    );

    expect(await ERC20Contract.balanceOf(maker)).to.be.equal(0);
    expect(await ERC20Contract.balanceOf(taker)).to.be.equal(195);
    expect(await ERC20Contract2.balanceOf(maker)).to.be.equal(100);
    expect(await ERC20Contract2.balanceOf(taker)).to.be.equal(0);
  });

  it('should execute a complete match order between ERC20 and ERC721 tokens', async function () {
    const {
      ExchangeContractAsUser,
      OrderValidatorAsDeployer,
      ERC20Contract,
      ERC721Contract,
      user1: maker,
      user2: taker,
    } = await loadFixture(deployFixtures);

    await ERC20Contract.mint(maker.address, 100);
    await ERC20Contract.connect(maker).approve(
      await ExchangeContractAsUser.getAddress(),
      100
    );
    await ERC721Contract.mint(taker.address, 1);
    await ERC721Contract.connect(taker).approve(
      await ExchangeContractAsUser.getAddress(),
      1
    );

    expect(await ERC20Contract.balanceOf(maker.address)).to.be.equal(100);
    expect(await ERC721Contract.ownerOf(1)).to.be.equal(taker.address);
    const makerAsset = await AssetERC20(ERC20Contract, 100);
    const takerAsset = await AssetERC721(ERC721Contract, 1);
    const leftOrder = await OrderDefault(
      maker,
      makerAsset,
      ZeroAddress,
      takerAsset,
      1,
      0,
      0
    );
    const rightOrder = await OrderDefault(
      taker,
      takerAsset,
      ZeroAddress,
      makerAsset,
      1,
      0,
      0
    );
    const makerSig = await signOrder(
      leftOrder,
      maker,
      OrderValidatorAsDeployer
    );
    const takerSig = await signOrder(
      rightOrder,
      taker,
      OrderValidatorAsDeployer
    );

    expect(await ExchangeContractAsUser.fills(hashKey(leftOrder))).to.be.equal(
      0
    );
    expect(await ExchangeContractAsUser.fills(hashKey(rightOrder))).to.be.equal(
      0
    );

    await ExchangeContractAsUser.matchOrders(
      leftOrder,
      makerSig,
      rightOrder,
      takerSig
    );
    expect(await ExchangeContractAsUser.fills(hashKey(leftOrder))).to.be.equal(
      1
    );
    expect(await ExchangeContractAsUser.fills(hashKey(rightOrder))).to.be.equal(
      100
    );
    expect(await ERC721Contract.ownerOf(1)).to.be.equal(maker.address);
    expect(await ERC20Contract.balanceOf(taker.address)).to.be.equal(98);
  });

  it('should execute a complete match order between ERC20 and ERC1155 tokens', async function () {
    const {
      ExchangeContractAsUser,
      OrderValidatorAsDeployer,
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

    const makerAsset = await AssetERC20(ERC20Contract, 100);
    const takerAsset = await AssetERC1155(ERC1155Contract, 1, 10);

    const leftOrder = await OrderDefault(
      maker,
      makerAsset,
      ZeroAddress,
      takerAsset,
      1,
      0,
      0
    );
    const rightOrder = await OrderDefault(
      taker,
      takerAsset,
      ZeroAddress,
      makerAsset,
      1,
      0,
      0
    );
    const makerSig = await signOrder(
      leftOrder,
      maker,
      OrderValidatorAsDeployer
    );
    const takerSig = await signOrder(
      rightOrder,
      taker,
      OrderValidatorAsDeployer
    );
    expect(await ExchangeContractAsUser.fills(hashKey(leftOrder))).to.be.equal(
      0
    );
    expect(await ExchangeContractAsUser.fills(hashKey(rightOrder))).to.be.equal(
      0
    );
    await ExchangeContractAsUser.matchOrders(
      leftOrder,
      makerSig,
      rightOrder,
      takerSig
    );
    expect(await ExchangeContractAsUser.fills(hashKey(leftOrder))).to.be.equal(
      10
    );
    expect(await ExchangeContractAsUser.fills(hashKey(rightOrder))).to.be.equal(
      100
    );
    expect(await ERC1155Contract.balanceOf(maker.address, 1)).to.be.equal(10);
    expect(await ERC1155Contract.balanceOf(taker.address, 1)).to.be.equal(0);
    expect(await ERC20Contract.balanceOf(maker.address)).to.be.equal(0);
    expect(await ERC20Contract.balanceOf(taker.address)).to.be.equal(98);
  });

  it('should execute a complete match order between ERC721 and ERC20 tokens', async function () {
    const {
      ExchangeContractAsUser,
      OrderValidatorAsDeployer,
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
    const leftOrder = await OrderDefault(
      maker,
      makerAsset,
      ZeroAddress,
      takerAsset,
      1,
      0,
      0
    );
    const rightOrder = await OrderDefault(
      taker,
      takerAsset,
      ZeroAddress,
      makerAsset,
      1,
      0,
      0
    );
    const makerSig = await signOrder(
      leftOrder,
      maker,
      OrderValidatorAsDeployer
    );
    const takerSig = await signOrder(
      rightOrder,
      taker,
      OrderValidatorAsDeployer
    );

    expect(await ExchangeContractAsUser.fills(hashKey(leftOrder))).to.be.equal(
      0
    );
    expect(await ExchangeContractAsUser.fills(hashKey(rightOrder))).to.be.equal(
      0
    );

    await ExchangeContractAsUser.matchOrders(
      leftOrder,
      makerSig,
      rightOrder,
      takerSig
    );
    expect(await ExchangeContractAsUser.fills(hashKey(leftOrder))).to.be.equal(
      100
    );
    expect(await ExchangeContractAsUser.fills(hashKey(rightOrder))).to.be.equal(
      1
    );
    expect(await ERC721Contract.ownerOf(1)).to.be.equal(taker.address);
    expect(await ERC20Contract.balanceOf(maker.address)).to.be.equal(98);
  });

  it('should execute a complete match order between ERC1155 and ERC20 tokens', async function () {
    const {
      ExchangeContractAsUser,
      OrderValidatorAsDeployer,
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

    const leftOrder = await OrderDefault(
      maker,
      makerAsset,
      ZeroAddress,
      takerAsset,
      1,
      0,
      0
    );
    const rightOrder = await OrderDefault(
      taker,
      takerAsset,
      ZeroAddress,
      makerAsset,
      1,
      0,
      0
    );
    const makerSig = await signOrder(
      leftOrder,
      maker,
      OrderValidatorAsDeployer
    );
    const takerSig = await signOrder(
      rightOrder,
      taker,
      OrderValidatorAsDeployer
    );
    expect(await ExchangeContractAsUser.fills(hashKey(leftOrder))).to.be.equal(
      0
    );
    expect(await ExchangeContractAsUser.fills(hashKey(rightOrder))).to.be.equal(
      0
    );
    await ExchangeContractAsUser.matchOrders(
      leftOrder,
      makerSig,
      rightOrder,
      takerSig
    );
    expect(await ExchangeContractAsUser.fills(hashKey(leftOrder))).to.be.equal(
      100
    );
    expect(await ExchangeContractAsUser.fills(hashKey(rightOrder))).to.be.equal(
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
      OrderValidatorAsDeployer,
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
    const takerAssetForRighttOrder = await AssetERC20(ERC20Contract2, 100);
    const makerAssetForRightOrder = await AssetERC20(ERC20Contract, 50);

    const leftOrder = await OrderDefault(
      maker,
      makerAssetForLeftOrder,
      ZeroAddress,
      takerAssetForLeftOrder,
      1,
      0,
      0
    );
    const rightOrder = await OrderDefault(
      taker,
      takerAssetForRighttOrder,
      ZeroAddress,
      makerAssetForRightOrder,
      1,
      0,
      0
    );

    const makerSig = await signOrder(
      leftOrder,
      maker,
      OrderValidatorAsDeployer
    );
    const takerSig = await signOrder(
      rightOrder,
      taker,
      OrderValidatorAsDeployer
    );
    expect(await ExchangeContractAsUser.fills(hashKey(leftOrder))).to.be.equal(
      0
    );
    expect(await ExchangeContractAsUser.fills(hashKey(rightOrder))).to.be.equal(
      0
    );
    await ExchangeContractAsUser.matchOrders(
      leftOrder,
      makerSig,
      rightOrder,
      takerSig
    );
    expect(await ExchangeContractAsUser.fills(hashKey(leftOrder))).to.be.equal(
      100
    );
    expect(await ExchangeContractAsUser.fills(hashKey(rightOrder))).to.be.equal(
      50
    );
    expect(await ERC20Contract.balanceOf(maker)).to.be.equal(50);
    expect(await ERC20Contract.balanceOf(taker)).to.be.equal(49);
    expect(await ERC20Contract2.balanceOf(maker)).to.be.equal(100);
    expect(await ERC20Contract2.balanceOf(taker)).to.be.equal(100);
  });

  it('should partially fill orders using matchOrders between ERC1155 and ERC20 tokens', async function () {
    const {
      ExchangeContractAsUser,
      OrderValidatorAsDeployer,
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
    const leftOrder = await OrderDefault(
      maker,
      makerAssetForLeftOrder,
      ZeroAddress,
      takerAssetForLeftOrder,
      1,
      0,
      0
    );
    const rightOrder = await OrderDefault(
      taker,
      takerAssetForRightOrder,
      ZeroAddress,
      makerAssetForRightOrder,
      1,
      0,
      0
    );
    const makerSig = await signOrder(
      leftOrder,
      maker,
      OrderValidatorAsDeployer
    );
    const takerSig = await signOrder(
      rightOrder,
      taker,
      OrderValidatorAsDeployer
    );
    expect(await ExchangeContractAsUser.fills(hashKey(leftOrder))).to.be.equal(
      0
    );
    expect(await ExchangeContractAsUser.fills(hashKey(rightOrder))).to.be.equal(
      0
    );
    await ExchangeContractAsUser.matchOrders(
      leftOrder,
      makerSig,
      rightOrder,
      takerSig
    );
    expect(await ExchangeContractAsUser.fills(hashKey(leftOrder))).to.be.equal(
      50
    );
    expect(await ExchangeContractAsUser.fills(hashKey(rightOrder))).to.be.equal(
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
      OrderValidatorAsDeployer,
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
    const takerAssetForRighttOrder = await AssetERC20(ERC20Contract2, 100);
    const makerAssetForRightOrder = await AssetERC20(ERC20Contract, 50);

    const leftOrder = await OrderDefault(
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
      takerAssetForRighttOrder,
      ZeroAddress,
      makerAssetForRightOrder,
      1,
      0,
      0
    );

    const makerSig = await signOrder(
      leftOrder,
      maker,
      OrderValidatorAsDeployer
    );
    const takerSigForFirstMatch = await signOrder(
      rightOrderForFirstMatch,
      taker,
      OrderValidatorAsDeployer
    );
    expect(await ExchangeContractAsUser.fills(hashKey(leftOrder))).to.be.equal(
      0
    );
    expect(
      await ExchangeContractAsUser.fills(hashKey(rightOrderForFirstMatch))
    ).to.be.equal(0);
    await ExchangeContractAsUser.matchOrders(
      leftOrder,
      makerSig,
      rightOrderForFirstMatch,
      takerSigForFirstMatch
    );
    expect(await ExchangeContractAsUser.fills(hashKey(leftOrder))).to.be.equal(
      100
    );
    expect(
      await ExchangeContractAsUser.fills(hashKey(rightOrderForFirstMatch))
    ).to.be.equal(50);
    expect(await ERC20Contract.balanceOf(maker)).to.be.equal(50);
    expect(await ERC20Contract.balanceOf(taker)).to.be.equal(49);
    expect(await ERC20Contract2.balanceOf(maker)).to.be.equal(100);
    expect(await ERC20Contract2.balanceOf(taker)).to.be.equal(100);

    const rightOrderForSecondMatch = await OrderDefault(
      taker,
      takerAssetForRighttOrder,
      ZeroAddress,
      makerAssetForRightOrder,
      2,
      0,
      0
    );
    const takerSigForSecondMatch = await signOrder(
      rightOrderForSecondMatch,
      taker,
      OrderValidatorAsDeployer
    );
    await ExchangeContractAsUser.matchOrders(
      leftOrder,
      makerSig,
      rightOrderForSecondMatch,
      takerSigForSecondMatch
    );
    expect(await ExchangeContractAsUser.fills(hashKey(leftOrder))).to.be.equal(
      200
    );
    expect(
      await ExchangeContractAsUser.fills(hashKey(rightOrderForSecondMatch))
    ).to.be.equal(50);
    expect(await ERC20Contract.balanceOf(maker)).to.be.equal(0);
    expect(await ERC20Contract.balanceOf(taker)).to.be.equal(98);
    expect(await ERC20Contract2.balanceOf(maker)).to.be.equal(200);
    expect(await ERC20Contract2.balanceOf(taker)).to.be.equal(0);
  });

  it('should fully fill a order using partial matches between ERC20 and ERC1155 tokens', async function () {
    const {
      ExchangeContractAsUser,
      OrderValidatorAsDeployer,
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

    const leftOrder = await OrderDefault(
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
    const makerSig = await signOrder(
      leftOrder,
      maker,
      OrderValidatorAsDeployer
    );
    const takerSigForFirstMatch = await signOrder(
      rightOrderForFirstMatch,
      taker,
      OrderValidatorAsDeployer
    );
    expect(await ExchangeContractAsUser.fills(hashKey(leftOrder))).to.be.equal(
      0
    );
    expect(
      await ExchangeContractAsUser.fills(hashKey(rightOrderForFirstMatch))
    ).to.be.equal(0);
    await ExchangeContractAsUser.matchOrders(
      leftOrder,
      makerSig,
      rightOrderForFirstMatch,
      takerSigForFirstMatch
    );
    expect(await ExchangeContractAsUser.fills(hashKey(leftOrder))).to.be.equal(
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
      OrderValidatorAsDeployer
    );
    await ExchangeContractAsUser.matchOrders(
      leftOrder,
      makerSig,
      rightOrderForSecondMatch,
      takerSigForSecondMatch
    );
    expect(await ExchangeContractAsUser.fills(hashKey(leftOrder))).to.be.equal(
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

  it('should revert matchOrders on mismatched asset types', async function () {
    const {
      ExchangeContractAsUser,
      OrderValidatorAsDeployer,
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
    const leftOrder = await OrderDefault(
      maker,
      makerAssetForLeftOrder,
      ZeroAddress,
      takerAssetForLeftOrder,
      1,
      0,
      0
    );
    const rightOrder = await OrderDefault(
      taker,
      takerAssetForRightOrder,
      ZeroAddress,
      makerAssetForRightOrder,
      1,
      0,
      0
    );
    const makerSig = await signOrder(
      leftOrder,
      maker,
      OrderValidatorAsDeployer
    );
    const takerSig = await signOrder(
      rightOrder,
      taker,
      OrderValidatorAsDeployer
    );

    await expect(
      ExchangeContractAsUser.matchOrders(
        leftOrder,
        makerSig,
        rightOrder,
        takerSig
      )
    ).to.be.revertedWith("assets don't match");
  });

  it('should revert for matching a cancelled order', async function () {
    const {
      ExchangeContractAsUser,
      OrderValidatorAsDeployer,
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
    const leftOrder = await OrderDefault(
      maker,
      makerAsset,
      ZeroAddress,
      takerAsset,
      1,
      0,
      0
    );
    const rightOrder = await OrderDefault(
      taker,
      takerAsset,
      ZeroAddress,
      makerAsset,
      1,
      0,
      0
    );
    const makerSig = await signOrder(
      leftOrder,
      maker,
      OrderValidatorAsDeployer
    );
    const takerSig = await signOrder(
      rightOrder,
      taker,
      OrderValidatorAsDeployer
    );
    await ExchangeContractAsUser.connect(maker).cancel(
      leftOrder,
      hashKey(leftOrder)
    );
    await expect(
      ExchangeContractAsUser.matchOrders(
        leftOrder,
        makerSig,
        rightOrder,
        takerSig
      )
    ).to.be.reverted;
  });
});
