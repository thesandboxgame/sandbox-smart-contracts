import {expect} from 'chai';
import {deployFixtures} from '../fixtures/index.ts';
import {loadFixture} from '@nomicfoundation/hardhat-network-helpers';
import {AssetERC20, AssetERC721, AssetERC1155, Asset} from '../utils/assets.ts';

import {
  hashKey,
  OrderDefault,
  OrderType,
  signOrder,
  Order,
  isOrderEqual,
} from '../utils/order.ts';
import {ZeroAddress, AbiCoder, Contract, Signer} from 'ethers';

// eslint-disable-next-line mocha/no-exports
export function shouldMatchOrders() {
  describe('Exchange MatchOrders', function () {
    let ExchangeContractAsUser: Contract,
      ExchangeContractAsAdmin: Contract,
      OrderValidatorAsAdmin: Contract,
      ERC20Contract: Contract,
      ERC20Contract2: Contract,
      ERC721Contract: Contract,
      ERC1155Contract: Contract,
      protocolFeeSecondary: number,
      defaultFeeReceiver: Signer,
      maker: Signer,
      taker: Signer,
      makeRecipient: Signer,
      user: Signer,
      makerAsset: Asset,
      takerAsset: Asset,
      ERC20Asset: Asset,
      ERC721Asset: Asset,
      ERC1155Asset: Asset,
      orderLeft: Order,
      orderRight: Order,
      makerSig: string,
      takerSig: string,
      PAUSER_ROLE: string,
      ERC1776_OPERATOR_ROLE: string;

    beforeEach(async function () {
      ({
        ExchangeContractAsUser,
        ExchangeContractAsAdmin,
        OrderValidatorAsAdmin,
        ERC20Contract,
        ERC20Contract2,
        ERC721Contract,
        ERC1155Contract,
        protocolFeeSecondary,
        defaultFeeReceiver,
        user1: maker,
        user2: taker,
        user3: makeRecipient,
        user,
        PAUSER_ROLE,
        ERC1776_OPERATOR_ROLE,
      } = await loadFixture(deployFixtures));

      await ERC20Contract.mint(maker.getAddress(), 10000000000);
      await ERC20Contract.connect(maker).approve(
        await ExchangeContractAsUser.getAddress(),
        10000000000
      );

      ERC20Asset = await AssetERC20(ERC20Contract, 10000000000);

      await ERC20Contract2.mint(taker.getAddress(), 20000000000);
      await ERC20Contract2.connect(taker).approve(
        await ExchangeContractAsUser.getAddress(),
        20000000000
      );

      makerAsset = await AssetERC20(ERC20Contract, 10000000000);
      takerAsset = await AssetERC20(ERC20Contract2, 20000000000);

      orderLeft = await OrderDefault(
        maker,
        [makerAsset],
        ZeroAddress,
        [takerAsset],
        1,
        0,
        0
      );
      orderRight = await OrderDefault(
        taker,
        [takerAsset],
        ZeroAddress,
        [makerAsset],
        1,
        0,
        0
      );

      makerSig = await signOrder(orderLeft, maker, OrderValidatorAsAdmin);
      takerSig = await signOrder(orderRight, taker, OrderValidatorAsAdmin);
    });

    describe('ERC20 x ERC20 token', function () {
      it('should execute a complete match order between ERC20 tokens', async function () {
        expect(await ERC20Contract.balanceOf(maker)).to.be.equal(10000000000);
        expect(await ERC20Contract.balanceOf(taker)).to.be.equal(0);
        expect(await ERC20Contract2.balanceOf(maker)).to.be.equal(0);
        expect(await ERC20Contract2.balanceOf(taker)).to.be.equal(20000000000);

        await ExchangeContractAsUser.matchOrders([
          {
            orderType: OrderType.V2,
            orderLeft,
            signatureLeft: makerSig,
            orderRight,
            signatureRight: takerSig,
          },
        ]);

        expect(await ERC20Contract.balanceOf(maker)).to.be.equal(0);
        expect(await ERC20Contract.balanceOf(taker)).to.be.equal(10000000000);
        expect(await ERC20Contract2.balanceOf(maker)).to.be.equal(20000000000);
        expect(await ERC20Contract2.balanceOf(taker)).to.be.equal(0);
      });

      it('should partially fill orders using matchOrders between ERC20 tokens', async function () {
        const makerAssetForLeftOrder = await AssetERC20(
          ERC20Contract,
          10000000000
        );
        const takerAssetForLeftOrder = await AssetERC20(
          ERC20Contract2,
          20000000000
        );
        // partially filled Asset
        const takerAssetForRightOrder = await AssetERC20(
          ERC20Contract2,
          10000000000
        );
        // partially filled Asset
        const makerAssetForRightOrder = await AssetERC20(
          ERC20Contract,
          5000000000
        );

        // left order for partial fill
        orderLeft = await OrderDefault(
          maker,
          [makerAssetForLeftOrder],
          ZeroAddress,
          [takerAssetForLeftOrder],
          1,
          0,
          0
        );
        // right order for partial fill
        orderRight = await OrderDefault(
          taker,
          [takerAssetForRightOrder],
          ZeroAddress,
          [makerAssetForRightOrder],
          1,
          0,
          0
        );

        makerSig = await signOrder(orderLeft, maker, OrderValidatorAsAdmin);
        takerSig = await signOrder(orderRight, taker, OrderValidatorAsAdmin);

        expect(
          await ExchangeContractAsUser.fills(hashKey(orderLeft))
        ).to.be.equal(0);
        expect(
          await ExchangeContractAsUser.fills(hashKey(orderRight))
        ).to.be.equal(0);
        expect(await ERC20Contract.balanceOf(maker)).to.be.equal(10000000000);
        expect(await ERC20Contract.balanceOf(taker)).to.be.equal(0);
        expect(await ERC20Contract2.balanceOf(maker)).to.be.equal(0);
        expect(await ERC20Contract2.balanceOf(taker)).to.be.equal(20000000000);

        await ExchangeContractAsUser.matchOrders([
          {
            orderType: OrderType.V2,
            orderLeft,
            signatureLeft: makerSig,
            orderRight,
            signatureRight: takerSig,
          },
        ]);

        expect(
          await ExchangeContractAsUser.fills(hashKey(orderLeft))
        ).to.be.equal(10000000000);
        expect(
          await ExchangeContractAsUser.fills(hashKey(orderRight))
        ).to.be.equal(5000000000);
        expect(await ERC20Contract.balanceOf(maker)).to.be.equal(5000000000);
        expect(await ERC20Contract.balanceOf(taker)).to.be.equal(5000000000);
        expect(await ERC20Contract2.balanceOf(maker)).to.be.equal(10000000000);
        expect(await ERC20Contract2.balanceOf(taker)).to.be.equal(10000000000);
      });

      it('should fully fill a order using partial matches between ERC20 tokens', async function () {
        const makerAssetForLeftOrder = await AssetERC20(
          ERC20Contract,
          10000000000
        );
        const takerAssetForLeftOrder = await AssetERC20(
          ERC20Contract2,
          20000000000
        );
        // partially filled Asset
        const takerAssetForRightOrder = await AssetERC20(
          ERC20Contract2,
          10000000000
        );
        // partially filled Asset
        const makerAssetForRightOrder = await AssetERC20(
          ERC20Contract,
          5000000000
        );
        // left order for partial fill
        orderLeft = await OrderDefault(
          maker,
          [makerAssetForLeftOrder],
          ZeroAddress,
          [takerAssetForLeftOrder],
          1,
          0,
          0
        );
        // right order for first partial fill
        const rightOrderForFirstMatch = await OrderDefault(
          taker,
          [takerAssetForRightOrder],
          ZeroAddress,
          [makerAssetForRightOrder],
          1,
          0,
          0
        );

        makerSig = await signOrder(orderLeft, maker, OrderValidatorAsAdmin);
        const takerSigForFirstMatch = await signOrder(
          rightOrderForFirstMatch,
          taker,
          OrderValidatorAsAdmin
        );

        expect(
          await ExchangeContractAsUser.fills(hashKey(orderLeft))
        ).to.be.equal(0);
        expect(
          await ExchangeContractAsUser.fills(hashKey(rightOrderForFirstMatch))
        ).to.be.equal(0);
        expect(await ERC20Contract.balanceOf(maker)).to.be.equal(10000000000);
        expect(await ERC20Contract.balanceOf(taker)).to.be.equal(0);
        expect(await ERC20Contract2.balanceOf(maker)).to.be.equal(0);
        expect(await ERC20Contract2.balanceOf(taker)).to.be.equal(20000000000);

        await ExchangeContractAsUser.matchOrders([
          {
            orderType: OrderType.V2,
            orderLeft,
            signatureLeft: makerSig,
            orderRight: rightOrderForFirstMatch,
            signatureRight: takerSigForFirstMatch,
          },
        ]);

        expect(
          await ExchangeContractAsUser.fills(hashKey(orderLeft))
        ).to.be.equal(10000000000);
        expect(
          await ExchangeContractAsUser.fills(hashKey(rightOrderForFirstMatch))
        ).to.be.equal(5000000000);
        expect(await ERC20Contract.balanceOf(maker)).to.be.equal(5000000000);
        expect(await ERC20Contract.balanceOf(taker)).to.be.equal(5000000000);
        expect(await ERC20Contract2.balanceOf(maker)).to.be.equal(10000000000);
        expect(await ERC20Contract2.balanceOf(taker)).to.be.equal(10000000000);

        // right order for second partial fill
        const rightOrderForSecondMatch = await OrderDefault(
          taker,
          [takerAssetForRightOrder],
          ZeroAddress,
          [makerAssetForRightOrder],
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
            orderType: OrderType.V2,
            orderLeft,
            signatureLeft: makerSig,
            orderRight: rightOrderForSecondMatch,
            signatureRight: takerSigForSecondMatch,
          },
        ]);

        expect(
          await ExchangeContractAsUser.fills(hashKey(orderLeft))
        ).to.be.equal(20000000000);
        expect(
          await ExchangeContractAsUser.fills(hashKey(rightOrderForSecondMatch))
        ).to.be.equal(5000000000);
        expect(await ERC20Contract.balanceOf(maker)).to.be.equal(0);
        expect(await ERC20Contract.balanceOf(taker)).to.be.equal(10000000000);
        expect(await ERC20Contract2.balanceOf(maker)).to.be.equal(20000000000);
        expect(await ERC20Contract2.balanceOf(taker)).to.be.equal(0);
      });
    });

    describe('ERC20 x ERC721 token', function () {
      beforeEach(async function () {
        await ERC721Contract.mint(taker.getAddress(), 1);
        await ERC721Contract.connect(taker).approve(
          await ExchangeContractAsUser.getAddress(),
          1
        );
        ERC721Asset = await AssetERC721(ERC721Contract, 1);

        orderLeft = await OrderDefault(
          maker,
          [ERC20Asset],
          ZeroAddress,
          [ERC721Asset],
          1,
          0,
          0
        );
        orderRight = await OrderDefault(
          taker,
          [ERC721Asset],
          ZeroAddress,
          [ERC20Asset],
          1,
          0,
          0
        );
        makerSig = await signOrder(orderLeft, maker, OrderValidatorAsAdmin);
        takerSig = await signOrder(orderRight, taker, OrderValidatorAsAdmin);
      });

      it('should execute a complete match order between ERC20 and ERC721 tokens', async function () {
        expect(
          await ExchangeContractAsUser.fills(hashKey(orderLeft))
        ).to.be.equal(0);
        expect(
          await ExchangeContractAsUser.fills(hashKey(orderRight))
        ).to.be.equal(0);
        expect(await ERC20Contract.balanceOf(maker.getAddress())).to.be.equal(
          10000000000
        );
        expect(await ERC721Contract.ownerOf(1)).to.be.equal(
          await taker.getAddress()
        );

        await ExchangeContractAsUser.matchOrders([
          {
            orderType: OrderType.V2,
            orderLeft, // passing ERC20 as left order
            signatureLeft: makerSig,
            orderRight, // passing ERC721 as right order
            signatureRight: takerSig,
          },
        ]);

        expect(
          await ExchangeContractAsUser.fills(hashKey(orderLeft))
        ).to.be.equal(1);
        expect(
          await ExchangeContractAsUser.fills(hashKey(orderRight))
        ).to.be.equal(10000000000);
        expect(await ERC721Contract.ownerOf(1)).to.be.equal(
          await maker.getAddress()
        );
        expect(await ERC20Contract.balanceOf(taker.getAddress())).to.be.equal(
          9750000000 // 10000000000 - protocolFee
        );

        // check protocol fee -> 250 * 10000000000 / 10000 = 250000000
        expect(
          await ERC20Contract.balanceOf(defaultFeeReceiver.getAddress())
        ).to.be.equal(
          (Number(protocolFeeSecondary) * Number(ERC20Asset.value)) / 10000
        );
      });

      it('should execute a complete match order between ERC721 and ERC20 tokens', async function () {
        expect(
          await ExchangeContractAsUser.fills(hashKey(orderLeft))
        ).to.be.equal(0);
        expect(
          await ExchangeContractAsUser.fills(hashKey(orderRight))
        ).to.be.equal(0);
        expect(await ERC20Contract.balanceOf(maker.getAddress())).to.be.equal(
          10000000000
        );
        expect(await ERC721Contract.ownerOf(1)).to.be.equal(
          await taker.getAddress()
        );

        await ExchangeContractAsUser.matchOrders([
          {
            orderType: OrderType.V2,
            orderRight, // passing ERC721 as left order
            signatureRight: takerSig,
            orderLeft, // passing ERC20 as right order
            signatureLeft: makerSig,
          },
        ]);

        expect(
          await ExchangeContractAsUser.fills(hashKey(orderLeft))
        ).to.be.equal(1);
        expect(
          await ExchangeContractAsUser.fills(hashKey(orderRight))
        ).to.be.equal(10000000000);
        expect(await ERC721Contract.ownerOf(1)).to.be.equal(
          await maker.getAddress()
        );
        expect(await ERC20Contract.balanceOf(taker.getAddress())).to.be.equal(
          9750000000 // 10000000000 - protocolFee
        );
      });

      it('should not execute match order with non-one value for ERC721 asset class', async function () {
        // ERC721Asset with value=2
        ERC721Asset = {
          assetType: {
            assetClass: '0x2', // ERC721_ASSET_CLASS = '0x2',
            data: AbiCoder.defaultAbiCoder().encode(
              ['address', 'uint256'],
              [await ERC721Contract.getAddress(), 1]
            ),
          },
          value: 2,
        };
        orderLeft = await OrderDefault(
          maker,
          [ERC20Asset],
          ZeroAddress,
          [ERC721Asset],
          1,
          0,
          0
        );
        orderRight = await OrderDefault(
          taker,
          [ERC721Asset],
          ZeroAddress,
          [ERC20Asset],
          1,
          0,
          0
        );
        makerSig = await signOrder(orderLeft, maker, OrderValidatorAsAdmin);
        takerSig = await signOrder(orderRight, taker, OrderValidatorAsAdmin);

        expect(
          await ExchangeContractAsUser.fills(hashKey(orderLeft))
        ).to.be.equal(0);
        expect(
          await ExchangeContractAsUser.fills(hashKey(orderRight))
        ).to.be.equal(0);
        expect(await ERC20Contract.balanceOf(maker.getAddress())).to.be.equal(
          10000000000
        );
        expect(await ERC721Contract.ownerOf(1)).to.be.equal(
          await taker.getAddress()
        );

        await expect(
          ExchangeContractAsUser.matchOrders([
            {
              orderType: OrderType.V2,
              orderLeft,
              signatureLeft: makerSig,
              orderRight,
              signatureRight: takerSig,
            },
          ])
        ).to.be.revertedWith('erc721 value error');
      });
    });

    describe('ERC20 x ERC1155 token', function () {
      beforeEach(async function () {
        await ERC1155Contract.mint(taker.getAddress(), 1, 10);
        await ERC1155Contract.connect(taker).setApprovalForAll(
          await ExchangeContractAsUser.getAddress(),
          true
        );
        ERC1155Asset = await AssetERC1155(ERC1155Contract, 1, 10);

        orderLeft = await OrderDefault(
          maker,
          [ERC20Asset],
          ZeroAddress,
          [ERC1155Asset],
          1,
          0,
          0
        );
        orderRight = await OrderDefault(
          taker,
          [ERC1155Asset],
          ZeroAddress,
          [ERC20Asset],
          1,
          0,
          0
        );
        makerSig = await signOrder(orderLeft, maker, OrderValidatorAsAdmin);
        takerSig = await signOrder(orderRight, taker, OrderValidatorAsAdmin);
      });

      it('should execute a complete match order between ERC20 and ERC1155 tokens', async function () {
        expect(
          await ExchangeContractAsUser.fills(hashKey(orderLeft))
        ).to.be.equal(0);
        expect(
          await ExchangeContractAsUser.fills(hashKey(orderRight))
        ).to.be.equal(0);
        expect(
          await ERC1155Contract.balanceOf(maker.getAddress(), 1)
        ).to.be.equal(0);
        expect(
          await ERC1155Contract.balanceOf(taker.getAddress(), 1)
        ).to.be.equal(10);
        expect(await ERC20Contract.balanceOf(maker.getAddress())).to.be.equal(
          10000000000
        );
        expect(await ERC20Contract.balanceOf(taker.getAddress())).to.be.equal(
          0
        );

        await ExchangeContractAsUser.matchOrders([
          {
            orderType: OrderType.V2,
            orderLeft, // passing ERC20 as left order
            signatureLeft: makerSig,
            orderRight, // passing ERC1155 as right order
            signatureRight: takerSig,
          },
        ]);

        expect(
          await ExchangeContractAsUser.fills(hashKey(orderLeft))
        ).to.be.equal(10);
        expect(
          await ExchangeContractAsUser.fills(hashKey(orderRight))
        ).to.be.equal(10000000000);
        expect(
          await ERC1155Contract.balanceOf(maker.getAddress(), 1)
        ).to.be.equal(10);
        expect(
          await ERC1155Contract.balanceOf(taker.getAddress(), 1)
        ).to.be.equal(0);
        expect(await ERC20Contract.balanceOf(maker.getAddress())).to.be.equal(
          0
        );
        expect(await ERC20Contract.balanceOf(taker.getAddress())).to.be.equal(
          9750000000 // 10000000000 - protocolFee
        );

        // check protocol fee -> 250 * 10000000000 / 10000 = 250000000
        expect(
          await ERC20Contract.balanceOf(defaultFeeReceiver.getAddress())
        ).to.be.equal(
          (Number(protocolFeeSecondary) * Number(ERC20Asset.value)) / 10000
        );
      });

      it('should execute a complete match order between ERC1155 and ERC20 tokens', async function () {
        expect(
          await ExchangeContractAsUser.fills(hashKey(orderLeft))
        ).to.be.equal(0);
        expect(
          await ExchangeContractAsUser.fills(hashKey(orderRight))
        ).to.be.equal(0);
        expect(
          await ERC1155Contract.balanceOf(maker.getAddress(), 1)
        ).to.be.equal(0);
        expect(
          await ERC1155Contract.balanceOf(taker.getAddress(), 1)
        ).to.be.equal(10);
        expect(await ERC20Contract.balanceOf(maker.getAddress())).to.be.equal(
          10000000000
        );
        expect(await ERC20Contract.balanceOf(taker.getAddress())).to.be.equal(
          0
        );

        await ExchangeContractAsUser.matchOrders([
          {
            orderType: OrderType.V2,
            orderRight, // passing ERC1155 as left order
            signatureRight: takerSig,
            orderLeft, // passing ERC20 as right order
            signatureLeft: makerSig,
          },
        ]);

        expect(
          await ExchangeContractAsUser.fills(hashKey(orderLeft))
        ).to.be.equal(10);
        expect(
          await ExchangeContractAsUser.fills(hashKey(orderRight))
        ).to.be.equal(10000000000);
        expect(
          await ERC1155Contract.balanceOf(maker.getAddress(), 1)
        ).to.be.equal(10);
        expect(
          await ERC1155Contract.balanceOf(taker.getAddress(), 1)
        ).to.be.equal(0);
        expect(await ERC20Contract.balanceOf(maker.getAddress())).to.be.equal(
          0
        );
        expect(await ERC20Contract.balanceOf(taker.getAddress())).to.be.equal(
          9750000000 // 10000000000 - protocolFee
        );
      });

      it('should partially fill orders using matchOrders between ERC20 and ERC1155 tokens', async function () {
        const ERC20AssetForLeftOrder = await AssetERC20(
          ERC20Contract,
          10000000000
        );
        const ERC1155AssetForLeftOrder = await AssetERC1155(
          ERC1155Contract,
          1,
          10
        );
        // ERC1155Asset for partial fill
        const ERC1155AssetForRightOrder = await AssetERC1155(
          ERC1155Contract,
          1,
          5
        );
        // ERC20Asset for partial fill
        const ERC20AssetForRightOrder = await AssetERC20(
          ERC20Contract,
          5000000000
        );
        // left order for partial fill
        orderLeft = await OrderDefault(
          maker,
          [ERC20AssetForLeftOrder],
          ZeroAddress,
          [ERC1155AssetForLeftOrder],
          1,
          0,
          0
        );
        // right order for partial fill
        orderRight = await OrderDefault(
          taker,
          [ERC1155AssetForRightOrder],
          ZeroAddress,
          [ERC20AssetForRightOrder],
          1,
          0,
          0
        );
        makerSig = await signOrder(orderLeft, maker, OrderValidatorAsAdmin);
        takerSig = await signOrder(orderRight, taker, OrderValidatorAsAdmin);
        expect(
          await ExchangeContractAsUser.fills(hashKey(orderLeft))
        ).to.be.equal(0);
        expect(
          await ExchangeContractAsUser.fills(hashKey(orderRight))
        ).to.be.equal(0);
        expect(
          await ERC1155Contract.balanceOf(maker.getAddress(), 1)
        ).to.be.equal(0);
        expect(
          await ERC1155Contract.balanceOf(taker.getAddress(), 1)
        ).to.be.equal(10);
        expect(await ERC20Contract.balanceOf(maker.getAddress())).to.be.equal(
          10000000000
        );
        expect(await ERC20Contract.balanceOf(taker.getAddress())).to.be.equal(
          0
        );

        await ExchangeContractAsUser.matchOrders([
          {
            orderType: OrderType.V2,
            orderLeft,
            signatureLeft: makerSig,
            orderRight,
            signatureRight: takerSig,
          },
        ]);

        expect(
          await ExchangeContractAsUser.fills(hashKey(orderLeft))
        ).to.be.equal(5);
        expect(
          await ExchangeContractAsUser.fills(hashKey(orderRight))
        ).to.be.equal(5000000000);
        expect(await ERC20Contract.balanceOf(maker.getAddress())).to.be.equal(
          5000000000
        );
        expect(await ERC20Contract.balanceOf(taker.getAddress())).to.be.equal(
          4875000000 // 5000000000 - protocolFee
        );
        expect(
          await ERC1155Contract.balanceOf(maker.getAddress(), 1)
        ).to.be.equal(5);
        expect(
          await ERC1155Contract.balanceOf(taker.getAddress(), 1)
        ).to.be.equal(5);
      });

      it('should fully fill a order using partial matches between ERC20 and ERC1155 tokens', async function () {
        const ERC20AssetForLeftOrder = await AssetERC20(
          ERC20Contract,
          10000000000
        );
        const ERC1155AssetForLeftOrder = await AssetERC1155(
          ERC1155Contract,
          1,
          10
        );
        // ERC1155Asset for partial fill
        const ERC1155AssetForRightOrder = await AssetERC1155(
          ERC1155Contract,
          1,
          5
        );
        // ERC20Asset for partial fill
        const ERC20AssetForRightOrder = await AssetERC20(
          ERC20Contract,
          5000000000
        );

        // left order for partial fill
        orderLeft = await OrderDefault(
          maker,
          [ERC20AssetForLeftOrder],
          ZeroAddress,
          [ERC1155AssetForLeftOrder],
          1,
          0,
          0
        );
        // right order for first partial fill
        const rightOrderForFirstMatch = await OrderDefault(
          taker,
          [ERC1155AssetForRightOrder],
          ZeroAddress,
          [ERC20AssetForRightOrder],
          1,
          0,
          0
        );

        makerSig = await signOrder(orderLeft, maker, OrderValidatorAsAdmin);
        const takerSigForFirstMatch = await signOrder(
          rightOrderForFirstMatch,
          taker,
          OrderValidatorAsAdmin
        );

        expect(
          await ExchangeContractAsUser.fills(hashKey(orderLeft))
        ).to.be.equal(0);
        expect(
          await ExchangeContractAsUser.fills(hashKey(rightOrderForFirstMatch))
        ).to.be.equal(0);
        expect(
          await ERC1155Contract.balanceOf(maker.getAddress(), 1)
        ).to.be.equal(0);
        expect(
          await ERC1155Contract.balanceOf(taker.getAddress(), 1)
        ).to.be.equal(10);
        expect(await ERC20Contract.balanceOf(maker.getAddress())).to.be.equal(
          10000000000
        );
        expect(await ERC20Contract.balanceOf(taker.getAddress())).to.be.equal(
          0
        );

        await ExchangeContractAsUser.matchOrders([
          {
            orderType: OrderType.V2,
            orderLeft,
            signatureLeft: makerSig,
            orderRight: rightOrderForFirstMatch,
            signatureRight: takerSigForFirstMatch,
          },
        ]);

        expect(
          await ExchangeContractAsUser.fills(hashKey(orderLeft))
        ).to.be.equal(5);
        expect(
          await ExchangeContractAsUser.fills(hashKey(rightOrderForFirstMatch))
        ).to.be.equal(5000000000);
        expect(
          await ERC1155Contract.balanceOf(maker.getAddress(), 1)
        ).to.be.equal(5);
        expect(
          await ERC1155Contract.balanceOf(taker.getAddress(), 1)
        ).to.be.equal(5);
        expect(await ERC20Contract.balanceOf(maker.getAddress())).to.be.equal(
          5000000000
        );
        expect(await ERC20Contract.balanceOf(taker.getAddress())).to.be.equal(
          4875000000 // 5000000000 - protocolFee
        );
        // right order for second partial fill
        const rightOrderForSecondMatch = await OrderDefault(
          taker,
          [ERC1155AssetForRightOrder],
          ZeroAddress,
          [ERC20AssetForRightOrder],
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
            orderType: OrderType.V2,
            orderLeft,
            signatureLeft: makerSig,
            orderRight: rightOrderForSecondMatch,
            signatureRight: takerSigForSecondMatch,
          },
        ]);
        expect(
          await ExchangeContractAsUser.fills(hashKey(orderLeft))
        ).to.be.equal(10);
        expect(
          await ExchangeContractAsUser.fills(hashKey(rightOrderForSecondMatch))
        ).to.be.equal(5000000000);
        expect(
          await ERC1155Contract.balanceOf(maker.getAddress(), 1)
        ).to.be.equal(10);
        expect(
          await ERC1155Contract.balanceOf(taker.getAddress(), 1)
        ).to.be.equal(0);
        expect(await ERC20Contract.balanceOf(maker.getAddress())).to.be.equal(
          0
        );
        expect(await ERC20Contract.balanceOf(taker.getAddress())).to.be.equal(
          9750000000 // 10000000000 - protocolFee
        );
      });
    });

    describe('matchOrderFrom', function () {
      it('should not execute matchOrdersFrom if Exchange Contract is paused', async function () {
        await ExchangeContractAsAdmin.grantRole(PAUSER_ROLE, user.getAddress());
        await ExchangeContractAsAdmin.connect(user).pause();
        expect(await ExchangeContractAsAdmin.paused()).to.be.true;

        await ExchangeContractAsAdmin.grantRole(
          ERC1776_OPERATOR_ROLE,
          maker.getAddress()
        );

        expect(
          await ExchangeContractAsUser.hasRole(
            ERC1776_OPERATOR_ROLE,
            maker.getAddress()
          )
        ).to.be.equal(true);

        await expect(
          ExchangeContractAsUser.connect(maker).matchOrdersFrom(
            maker.getAddress(),
            [
              {
                orderType: OrderType.V2,
                orderLeft,
                signatureLeft: makerSig,
                orderRight,
                signatureRight: takerSig,
              },
            ]
          )
        ).to.be.revertedWith('Pausable: paused');
      });

      it('should not execute matchOrdersFrom if caller do not have ERC1776 operator role', async function () {
        await expect(
          ExchangeContractAsUser.matchOrdersFrom(maker.getAddress(), [
            {
              orderType: OrderType.V2,
              orderLeft,
              signatureLeft: makerSig,
              orderRight,
              signatureRight: takerSig,
            },
          ])
        ).to.be.revertedWith(
          `AccessControl: account ${(
            await user.getAddress()
          ).toLowerCase()} is missing role ${ERC1776_OPERATOR_ROLE}`
        );
      });

      it('should not execute matchOrdersFrom if sender is zero address', async function () {
        await ExchangeContractAsAdmin.grantRole(
          ERC1776_OPERATOR_ROLE,
          maker.getAddress()
        );

        expect(
          await ExchangeContractAsUser.hasRole(
            ERC1776_OPERATOR_ROLE,
            maker.getAddress()
          )
        ).to.be.equal(true);

        await expect(
          ExchangeContractAsUser.connect(maker).matchOrdersFrom(ZeroAddress, [
            {
              orderType: OrderType.V2,
              orderLeft,
              signatureLeft: makerSig,
              orderRight,
              signatureRight: takerSig,
            },
          ])
        ).to.be.revertedWith('invalid sender');
      });

      it('should execute matchOrdersFrom', async function () {
        await ExchangeContractAsAdmin.grantRole(
          ERC1776_OPERATOR_ROLE,
          maker.getAddress()
        );

        expect(
          await ExchangeContractAsUser.hasRole(
            ERC1776_OPERATOR_ROLE,
            maker.getAddress()
          )
        ).to.be.equal(true);

        expect(await ERC20Contract.balanceOf(maker)).to.be.equal(10000000000);
        expect(await ERC20Contract.balanceOf(taker)).to.be.equal(0);
        expect(await ERC20Contract2.balanceOf(maker)).to.be.equal(0);
        expect(await ERC20Contract2.balanceOf(taker)).to.be.equal(20000000000);

        await ExchangeContractAsUser.connect(maker).matchOrdersFrom(
          maker.getAddress(),
          [
            {
              orderType: OrderType.V2,
              orderLeft,
              signatureLeft: makerSig,
              orderRight,
              signatureRight: takerSig,
            },
          ]
        );

        expect(await ERC20Contract.balanceOf(maker)).to.be.equal(0);
        expect(await ERC20Contract.balanceOf(taker)).to.be.equal(10000000000);
        expect(await ERC20Contract2.balanceOf(maker)).to.be.equal(20000000000);
        expect(await ERC20Contract2.balanceOf(taker)).to.be.equal(0);
      });
    });

    it('different recipients test', async function () {
      const recipientAddress = await makeRecipient.getAddress();
      const makerAssetForLeftOrder = await AssetERC20(
        ERC20Contract,
        10000000000
      );
      const takerAssetForLeftOrder = await AssetERC20(
        ERC20Contract2,
        20000000000
      );

      const takerAssetForRightOrder = await AssetERC20(
        ERC20Contract2,
        10000000000
      );

      const makerAssetForRightOrder = await AssetERC20(
        ERC20Contract,
        5000000000
      );

      orderLeft = await OrderDefault(
        maker,
        makerAssetForLeftOrder,
        ZeroAddress,
        takerAssetForLeftOrder,
        1,
        0,
        0,
        recipientAddress
      );

      orderRight = await OrderDefault(
        taker,
        takerAssetForRightOrder,
        ZeroAddress,
        makerAssetForRightOrder,
        1,
        0,
        0,
        recipientAddress
      );

      makerSig = await signOrder(orderLeft, maker, OrderValidatorAsAdmin);
      takerSig = await signOrder(orderRight, taker, OrderValidatorAsAdmin);

      expect(
        await ExchangeContractAsUser.fills(hashKey(orderLeft))
      ).to.be.equal(0);
      expect(
        await ExchangeContractAsUser.fills(hashKey(orderRight))
      ).to.be.equal(0);
      expect(await ERC20Contract.balanceOf(maker)).to.be.equal(10000000000);
      expect(await ERC20Contract.balanceOf(taker)).to.be.equal(0);
      expect(await ERC20Contract2.balanceOf(maker)).to.be.equal(0);
      expect(await ERC20Contract2.balanceOf(taker)).to.be.equal(20000000000);

      await ExchangeContractAsUser.matchOrders([
        {
          orderLeft,
          signatureLeft: makerSig,
          orderRight,
          signatureRight: takerSig,
        },
      ]);

      expect(
        await ExchangeContractAsUser.fills(hashKey(orderLeft))
      ).to.be.equal(10000000000);
      expect(
        await ExchangeContractAsUser.fills(hashKey(orderRight))
      ).to.be.equal(5000000000);
      expect(await ERC20Contract.balanceOf(maker)).to.be.equal(5000000000);
      expect(await ERC20Contract.balanceOf(recipientAddress)).to.be.equal(
        5000000000
      );
      expect(await ERC20Contract2.balanceOf(recipientAddress)).to.be.equal(
        10000000000
      );
      expect(await ERC20Contract2.balanceOf(taker)).to.be.equal(10000000000);
    });

    it('should emit a Match event', async function () {
      expect(await ERC20Contract.balanceOf(maker)).to.be.equal(10000000000);
      expect(await ERC20Contract.balanceOf(taker)).to.be.equal(0);
      expect(await ERC20Contract2.balanceOf(maker)).to.be.equal(0);
      expect(await ERC20Contract2.balanceOf(taker)).to.be.equal(20000000000);

      const tx = await ExchangeContractAsUser.matchOrders([
        {
          orderType: OrderType.V2,
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
          await user.getAddress(),
          hashKey(orderLeft),
          hashKey(orderRight),
          verifyOrderLeft,
          verifyOrderRight,
          [10000000000, 20000000000],
          20000000000,
          10000000000
        );

      expect(await ERC20Contract.balanceOf(maker)).to.be.equal(0);
      expect(await ERC20Contract.balanceOf(taker)).to.be.equal(10000000000);
      expect(await ERC20Contract2.balanceOf(maker)).to.be.equal(20000000000);
      expect(await ERC20Contract2.balanceOf(taker)).to.be.equal(0);
    });

    it('should execute complete match when left order taker is right order maker', async function () {
      // left order taker is right order maker
      orderLeft = await OrderDefault(
        maker,
        [makerAsset],
        taker,
        [takerAsset],
        1,
        0,
        0
      );
      orderRight = await OrderDefault(
        taker,
        [takerAsset],
        ZeroAddress,
        [makerAsset],
        1,
        0,
        0
      );

      makerSig = await signOrder(orderLeft, maker, OrderValidatorAsAdmin);
      takerSig = await signOrder(orderRight, taker, OrderValidatorAsAdmin);

      expect(await ERC20Contract.balanceOf(maker)).to.be.equal(10000000000);
      expect(await ERC20Contract.balanceOf(taker)).to.be.equal(0);
      expect(await ERC20Contract2.balanceOf(maker)).to.be.equal(0);
      expect(await ERC20Contract2.balanceOf(taker)).to.be.equal(20000000000);

      await ExchangeContractAsUser.matchOrders([
        {
          orderType: OrderType.V2,
          orderLeft,
          signatureLeft: makerSig,
          orderRight,
          signatureRight: takerSig,
        },
      ]);

      expect(await ERC20Contract.balanceOf(maker)).to.be.equal(0);
      expect(await ERC20Contract.balanceOf(taker)).to.be.equal(10000000000);
      expect(await ERC20Contract2.balanceOf(maker)).to.be.equal(20000000000);
      expect(await ERC20Contract2.balanceOf(taker)).to.be.equal(0);
    });

    it('should execute match order with rightTake less than leftMakerValue', async function () {
      const makerAssetForLeftOrder = await AssetERC20(
        ERC20Contract,
        10000000000
      );
      const takerAssetForLeftOrder = await AssetERC20(
        ERC20Contract2,
        20000000000
      );
      const takerAssetForRightOrder = await AssetERC20(
        ERC20Contract2,
        40000000000
      );
      const makerAssetForRightOrder = await AssetERC20(
        ERC20Contract,
        20000000000
      );

      orderLeft = await OrderDefault(
        maker,
        [makerAssetForLeftOrder],
        ZeroAddress,
        [takerAssetForLeftOrder],
        1,
        0,
        0
      );
      orderRight = await OrderDefault(
        taker,
        [takerAssetForRightOrder],
        ZeroAddress,
        [makerAssetForRightOrder],
        1,
        0,
        0
      );

      makerSig = await signOrder(orderLeft, maker, OrderValidatorAsAdmin);
      takerSig = await signOrder(orderRight, taker, OrderValidatorAsAdmin);

      expect(
        await ExchangeContractAsUser.fills(hashKey(orderLeft))
      ).to.be.equal(0);
      expect(
        await ExchangeContractAsUser.fills(hashKey(orderRight))
      ).to.be.equal(0);
      expect(await ERC20Contract.balanceOf(maker)).to.be.equal(10000000000);
      expect(await ERC20Contract.balanceOf(taker)).to.be.equal(0);
      expect(await ERC20Contract2.balanceOf(maker)).to.be.equal(0);
      expect(await ERC20Contract2.balanceOf(taker)).to.be.equal(20000000000);

      await ExchangeContractAsUser.matchOrders([
        {
          orderType: OrderType.V2,
          orderLeft,
          signatureLeft: makerSig,
          orderRight,
          signatureRight: takerSig,
        },
      ]);

      expect(
        await ExchangeContractAsUser.fills(hashKey(orderLeft))
      ).to.be.equal(20000000000);
      expect(
        await ExchangeContractAsUser.fills(hashKey(orderRight))
      ).to.be.equal(10000000000);
      expect(await ERC20Contract.balanceOf(maker)).to.be.equal(0);
      expect(await ERC20Contract.balanceOf(taker)).to.be.equal(10000000000);
      expect(await ERC20Contract2.balanceOf(maker)).to.be.equal(20000000000);
      expect(await ERC20Contract2.balanceOf(taker)).to.be.equal(0);
    });

    it('should require the message sender to be the maker for a zero-salt right order', async function () {
      orderLeft = await OrderDefault(
        maker,
        [makerAsset],
        ZeroAddress,
        [takerAsset],
        1,
        0,
        0
      );
      orderRight = await OrderDefault(
        taker,
        [takerAsset],
        ZeroAddress,
        [makerAsset],
        0,
        0,
        0
      );

      makerSig = await signOrder(orderLeft, maker, OrderValidatorAsAdmin);
      takerSig = await signOrder(orderRight, taker, OrderValidatorAsAdmin);

      expect(await ERC20Contract.balanceOf(maker)).to.be.equal(10000000000);
      expect(await ERC20Contract.balanceOf(taker)).to.be.equal(0);
      expect(await ERC20Contract2.balanceOf(maker)).to.be.equal(0);
      expect(await ERC20Contract2.balanceOf(taker)).to.be.equal(20000000000);

      await ExchangeContractAsUser.connect(taker).matchOrders([
        {
          orderType: OrderType.V2,
          orderLeft,
          signatureLeft: makerSig,
          orderRight,
          signatureRight: takerSig,
        },
      ]);

      expect(await ERC20Contract.balanceOf(maker)).to.be.equal(0);
      expect(await ERC20Contract.balanceOf(taker)).to.be.equal(10000000000);
      expect(await ERC20Contract2.balanceOf(maker)).to.be.equal(20000000000);
      expect(await ERC20Contract2.balanceOf(taker)).to.be.equal(0);
    });

    it('should require the message sender to be the maker for a zero-salt left order', async function () {
      orderLeft = await OrderDefault(
        maker,
        [makerAsset],
        ZeroAddress,
        [takerAsset],
        0,
        0,
        0
      );
      orderRight = await OrderDefault(
        taker,
        [takerAsset],
        ZeroAddress,
        [makerAsset],
        1,
        0,
        0
      );

      makerSig = await signOrder(orderLeft, maker, OrderValidatorAsAdmin);
      takerSig = await signOrder(orderRight, taker, OrderValidatorAsAdmin);

      expect(await ERC20Contract.balanceOf(maker)).to.be.equal(10000000000);
      expect(await ERC20Contract.balanceOf(taker)).to.be.equal(0);
      expect(await ERC20Contract2.balanceOf(maker)).to.be.equal(0);
      expect(await ERC20Contract2.balanceOf(taker)).to.be.equal(20000000000);

      await ExchangeContractAsUser.connect(maker).matchOrders([
        {
          orderType: OrderType.V2,
          orderLeft,
          signatureLeft: makerSig,
          orderRight,
          signatureRight: takerSig,
        },
      ]);

      expect(await ERC20Contract.balanceOf(maker)).to.be.equal(0);
      expect(await ERC20Contract.balanceOf(taker)).to.be.equal(10000000000);
      expect(await ERC20Contract2.balanceOf(maker)).to.be.equal(20000000000);
      expect(await ERC20Contract2.balanceOf(taker)).to.be.equal(0);
    });

    it('should not execute match order for already matched orders', async function () {
      expect(await ERC20Contract.balanceOf(maker)).to.be.equal(10000000000);
      expect(await ERC20Contract.balanceOf(taker)).to.be.equal(0);
      expect(await ERC20Contract2.balanceOf(maker)).to.be.equal(0);
      expect(await ERC20Contract2.balanceOf(taker)).to.be.equal(20000000000);

      await ExchangeContractAsUser.matchOrders([
        {
          orderType: OrderType.V2,
          orderLeft,
          signatureLeft: makerSig,
          orderRight,
          signatureRight: takerSig,
        },
      ]);

      expect(await ERC20Contract.balanceOf(maker)).to.be.equal(0);
      expect(await ERC20Contract.balanceOf(taker)).to.be.equal(10000000000);
      expect(await ERC20Contract2.balanceOf(maker)).to.be.equal(20000000000);
      expect(await ERC20Contract2.balanceOf(taker)).to.be.equal(0);

      await expect(
        ExchangeContractAsUser.matchOrders([
          {
            orderType: OrderType.V2,
            orderLeft,
            signatureLeft: makerSig,
            orderRight,
            signatureRight: takerSig,
          },
        ])
      ).to.be.revertedWith('nothing to fill');
    });
  });
}
