import {expect} from 'chai';
import {deployFixtures} from '../fixtures/index.ts';
import {loadFixture} from '@nomicfoundation/hardhat-network-helpers';
import {
  AssetERC20,
  Asset,
  AssetBundle,
  LibPartData,
  PriceDistribution,
} from '../utils/assets.ts';

import {hashKey, OrderDefault, signOrder, Order} from '../utils/order.ts';
import {ZeroAddress, Contract, Signer} from 'ethers';

// eslint-disable-next-line mocha/no-exports
export function shouldMatchOrdersForBundle() {
  describe('Exchange MatchOrders for Bundle', function () {
    let ExchangeContractAsUser: Contract,
      ExchangeContractAsAdmin: Contract,
      OrderValidatorAsAdmin: Contract,
      RoyaltiesRegistryAsDeployer: Contract,
      ERC20Contract: Contract,
      ERC20Contract2: Contract,
      ERC721Contract: Contract,
      ERC1155Contract: Contract,
      LandContract: Contract,
      RoyaltiesProvider: Contract,
      QuadHelper: Contract,
      protocolFeeSecondary: number,
      defaultFeeReceiver: Signer,
      maker: Signer,
      taker: Signer,
      royaltyReceiver: Signer,
      royaltyReceiver2: Signer,
      royaltyReceiver3: Signer,
      LandAsAdmin: Contract,
      makerAsset: Asset,
      takerAsset: Asset,
      bundleWithoutERC721Left: Asset,
      bundleWithoutERC721Right: Asset,
      priceDistribution: PriceDistribution,
      // TODO: types
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      bundledERC20: any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      bundledERC721: any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      bundledERC1155: any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      quads: any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      bundleData: any,
      orderLeft: Order,
      orderRight: Order,
      makerSig: string,
      takerSig: string,
      landAdmin: Signer;

    describe('ERC20 x Bundle', function () {
      beforeEach(async function () {
        ({
          ExchangeContractAsUser,
          OrderValidatorAsAdmin,
          RoyaltiesRegistryAsDeployer,
          ERC20Contract,
          ERC20Contract2,
          ERC721Contract,
          ERC1155Contract,
          protocolFeeSecondary,
          defaultFeeReceiver,
          user1: maker,
          user2: taker,
        } = await loadFixture(deployFixtures));

        priceDistribution = {
          erc20Prices: [2000000000],
          erc721Prices: [[3000000000]],
          erc1155Prices: [[500000000]],
          quadPrices: [],
        };

        // Set up ERC20 for maker
        await ERC20Contract.mint(await maker.getAddress(), 30000000000);
        await ERC20Contract.connect(maker).approve(
          await ExchangeContractAsUser.getAddress(),
          30000000000
        );

        // Construct makerAsset
        makerAsset = await AssetERC20(ERC20Contract, 10000000000);

        // Set up ERC20 for taker
        await ERC20Contract2.mint(await taker.getAddress(), 40000000000);
        await ERC20Contract2.connect(taker).approve(
          await ExchangeContractAsUser.getAddress(),
          40000000000
        );

        // Set up ERC721 for taker
        await ERC721Contract.mint(await taker.getAddress(), 1);
        await ERC721Contract.connect(taker).approve(
          await ExchangeContractAsUser.getAddress(),
          1
        );

        // Set up ERC1155 for taker
        await ERC1155Contract.mint(await taker.getAddress(), 1, 50);

        await ERC1155Contract.connect(taker).setApprovalForAll(
          await ExchangeContractAsUser.getAddress(),
          true
        );

        // Construct takerAsset bundle
        bundledERC20 = [
          {
            erc20Address: ERC20Contract2.target,
            value: 20000000000,
          },
        ];
        bundledERC721 = [
          {
            erc721Address: ERC721Contract.target,
            ids: [1],
          },
        ];

        bundledERC1155 = [
          {
            erc1155Address: ERC1155Contract.target,
            ids: [1],
            supplies: [10],
          },
        ];

        quads = {
          sizes: [],
          xs: [],
          ys: [],
          data: '0x',
        }; // empty quads

        // Create bundle for passing as right order
        bundleData = {
          bundledERC20,
          bundledERC721,
          bundledERC1155,
          quads,
          priceDistribution,
        };

        takerAsset = await AssetBundle(bundleData, 1); // there can only ever be 1 copy of a bundle that contains ERC721
      });

      it('should not execute match order between ERC20 tokens and Bundle if bundle price is not equal to collective bundle price', async function () {
        priceDistribution = {
          erc20Prices: [0],
          erc721Prices: [[0]],
          erc1155Prices: [[0]],
          quadPrices: [],
        };

        bundleData = {
          bundledERC20,
          bundledERC721,
          bundledERC1155,
          quads,
          priceDistribution,
        };

        takerAsset = await AssetBundle(bundleData, 1);

        orderLeft = await OrderDefault(
          maker, // ERC20
          makerAsset,
          ZeroAddress,
          takerAsset, // Bundle
          1,
          0,
          0
        );
        orderRight = await OrderDefault(
          taker,
          takerAsset, // Bundle
          ZeroAddress,
          makerAsset, // ERC20
          1,
          0,
          0
        );

        makerSig = await signOrder(orderLeft, maker, OrderValidatorAsAdmin);
        takerSig = await signOrder(orderRight, taker, OrderValidatorAsAdmin);

        const makerAddress = await maker.getAddress();
        const takerAddress = await taker.getAddress();

        expect(await ERC20Contract.balanceOf(makerAddress)).to.be.equal(
          30000000000
        );
        expect(await ERC20Contract.balanceOf(takerAddress)).to.be.equal(0);
        expect(await ERC20Contract2.balanceOf(makerAddress)).to.be.equal(0);
        expect(await ERC20Contract2.balanceOf(takerAddress)).to.be.equal(
          40000000000
        );
        expect(await ERC721Contract.ownerOf(1)).to.be.equal(takerAddress);
        expect(await ERC1155Contract.balanceOf(takerAddress, 1)).to.be.equal(
          50
        );
        expect(await ERC1155Contract.balanceOf(makerAddress, 1)).to.be.equal(0);

        await expect(
          ExchangeContractAsUser.matchOrders([
            {
              orderLeft, // passing ERC20 as left order
              signatureLeft: makerSig,
              orderRight, // passing Bundle as right order
              signatureRight: takerSig,
            },
          ])
        ).to.be.revertedWith('Bundle price mismatch');
      });

      it('should execute a complete match order between ERC20 tokens and Bundle containing ERC20, ERC721 and ERC1155', async function () {
        orderLeft = await OrderDefault(
          maker, // ERC20
          makerAsset,
          ZeroAddress,
          takerAsset, // Bundle
          1,
          0,
          0
        );
        orderRight = await OrderDefault(
          taker,
          takerAsset, // Bundle
          ZeroAddress,
          makerAsset, // ERC20
          1,
          0,
          0
        );

        makerSig = await signOrder(orderLeft, maker, OrderValidatorAsAdmin);
        takerSig = await signOrder(orderRight, taker, OrderValidatorAsAdmin);

        const makerAddress = await maker.getAddress();
        const takerAddress = await taker.getAddress();

        expect(await ERC20Contract.balanceOf(makerAddress)).to.be.equal(
          30000000000
        );
        expect(await ERC20Contract.balanceOf(takerAddress)).to.be.equal(0);
        expect(await ERC20Contract2.balanceOf(makerAddress)).to.be.equal(0);
        expect(await ERC20Contract2.balanceOf(takerAddress)).to.be.equal(
          40000000000
        );
        expect(await ERC721Contract.ownerOf(1)).to.be.equal(takerAddress);
        expect(await ERC1155Contract.balanceOf(takerAddress, 1)).to.be.equal(
          50
        );
        expect(await ERC1155Contract.balanceOf(makerAddress, 1)).to.be.equal(0);

        await ExchangeContractAsUser.matchOrders([
          {
            orderLeft, // passing ERC20 as left order
            signatureLeft: makerSig,
            orderRight, // passing Bundle as right order
            signatureRight: takerSig,
          },
        ]);
        expect(await ERC1155Contract.balanceOf(makerAddress, 1)).to.be.equal(
          10
        );
        expect(await ERC721Contract.ownerOf(1)).to.be.equal(makerAddress);
        expect(await ERC1155Contract.balanceOf(takerAddress, 1)).to.be.equal(
          40
        );

        expect(
          await ExchangeContractAsUser.fills(hashKey(orderLeft))
        ).to.be.equal(1);
        expect(
          await ExchangeContractAsUser.fills(hashKey(orderRight))
        ).to.be.equal(10000000000);

        expect(await ERC20Contract.balanceOf(takerAddress)).to.be.equal(
          9750000000 // 10000000000 - protocolFee
        );

        expect(await ERC20Contract.balanceOf(maker)).to.be.equal(20000000000);
        expect(await ERC20Contract2.balanceOf(maker)).to.be.equal(20000000000);
        expect(await ERC20Contract2.balanceOf(taker)).to.be.equal(20000000000);

        // check protocol fee -> 250 * 10000000000 / 10000 = 250000000
        expect(
          await ERC20Contract.balanceOf(defaultFeeReceiver.getAddress())
        ).to.be.equal(
          (Number(protocolFeeSecondary) * Number(makerAsset.value)) / 10000
        );

        // TODO: royalties checks for tokens
      });

      it('should not allow asset bundle value > 1 if there are ERC721 contained in the bundle, since ERC721 are unique', async function () {
        takerAsset = await AssetBundle(bundleData, 2);

        orderLeft = await OrderDefault(
          maker, // ERC20
          makerAsset,
          ZeroAddress,
          takerAsset, // Bundle
          1,
          0,
          0
        );
        orderRight = await OrderDefault(
          taker,
          takerAsset, // Bundle
          ZeroAddress,
          makerAsset, // ERC20
          1,
          0,
          0
        );

        makerSig = await signOrder(orderLeft, maker, OrderValidatorAsAdmin);
        takerSig = await signOrder(orderRight, taker, OrderValidatorAsAdmin);

        const makerAddress = await maker.getAddress();
        const takerAddress = await taker.getAddress();

        expect(await ERC20Contract.balanceOf(makerAddress)).to.be.equal(
          30000000000
        );
        expect(await ERC20Contract.balanceOf(takerAddress)).to.be.equal(0);
        expect(await ERC20Contract2.balanceOf(makerAddress)).to.be.equal(0);
        expect(await ERC20Contract2.balanceOf(takerAddress)).to.be.equal(
          40000000000
        );
        expect(await ERC721Contract.ownerOf(1)).to.be.equal(takerAddress);
        expect(await ERC1155Contract.balanceOf(takerAddress, 1)).to.be.equal(
          50
        );
        expect(await ERC1155Contract.balanceOf(makerAddress, 1)).to.be.equal(0);

        await expect(
          ExchangeContractAsUser.matchOrders([
            {
              orderLeft, // passing ERC20 as left order
              signatureLeft: makerSig,
              orderRight, // passing Bundle as right order
              signatureRight: takerSig,
            },
          ])
        ).to.be.revertedWith('bundle value error');
      });

      it('should partially fill orders using matchOrders between ERC20 and BUNDLE', async function () {
        // Seller (taker - left) has 5 copies of a Bundle type; buyer (maker - right) just wants to buy 1 of these
        const ERC20AssetForLeftOrder = await AssetERC20(
          ERC20Contract,
          50000000000
        );

        // ERC20Asset for partial fill
        const ERC20AssetForRightOrder = await AssetERC20(
          ERC20Contract,
          10000000000
        );

        bundledERC721 = [];

        priceDistribution = {
          erc20Prices: [5000000000],
          erc721Prices: [[]], // price distribution without ERC721
          erc1155Prices: [[500000000]],
          quadPrices: [],
        };

        const bundleAsset = {
          bundledERC20,
          bundledERC721,
          bundledERC1155,
          quads,
          priceDistribution,
        };

        bundleWithoutERC721Left = await AssetBundle(bundleAsset, 5);

        // bundle for partial fill
        bundleWithoutERC721Right = await AssetBundle(bundleAsset, 1);

        // left order for partial fill
        orderLeft = await OrderDefault(
          maker,
          ERC20AssetForLeftOrder, // makeAsset
          ZeroAddress,
          bundleWithoutERC721Left, // takeAsset
          1,
          0,
          0
        );
        // right order for partial fill
        orderRight = await OrderDefault(
          taker,
          bundleWithoutERC721Right, // makeAsset
          ZeroAddress,
          ERC20AssetForRightOrder, // takeAsset
          1,
          0,
          0
        );

        makerSig = await signOrder(orderLeft, maker, OrderValidatorAsAdmin);
        takerSig = await signOrder(orderRight, taker, OrderValidatorAsAdmin);

        const makerAddress = await maker.getAddress();
        const takerAddress = await taker.getAddress();

        expect(await ERC20Contract.balanceOf(makerAddress)).to.be.equal(
          30000000000
        );
        expect(await ERC20Contract.balanceOf(takerAddress)).to.be.equal(0);
        expect(await ERC20Contract2.balanceOf(makerAddress)).to.be.equal(0);
        expect(await ERC20Contract2.balanceOf(takerAddress)).to.be.equal(
          40000000000
        );
        expect(await ERC1155Contract.balanceOf(takerAddress, 1)).to.be.equal(
          50
        );
        expect(await ERC1155Contract.balanceOf(makerAddress, 1)).to.be.equal(0);
        expect(
          await ExchangeContractAsUser.fills(hashKey(orderLeft))
        ).to.be.equal(0);
        expect(
          await ExchangeContractAsUser.fills(hashKey(orderRight))
        ).to.be.equal(0);

        await ExchangeContractAsUser.matchOrders([
          {
            orderLeft,
            signatureLeft: makerSig,
            orderRight,
            signatureRight: takerSig,
          },
        ]);

        expect(
          await ExchangeContractAsUser.fills(hashKey(orderLeft)) // newFill.rightValue
        ).to.be.equal(1);
        expect(
          await ExchangeContractAsUser.fills(hashKey(orderRight)) // newFill.leftValue
        ).to.be.equal(10000000000);

        expect(await ERC20Contract.balanceOf(takerAddress)).to.be.equal(
          9750000000
        );

        expect(await ERC20Contract.balanceOf(maker)).to.be.equal(20000000000);
        expect(await ERC20Contract2.balanceOf(maker)).to.be.equal(20000000000);
        expect(await ERC20Contract2.balanceOf(taker)).to.be.equal(20000000000);

        expect(
          await ERC20Contract.balanceOf(defaultFeeReceiver.getAddress())
        ).to.be.equal(
          (Number(protocolFeeSecondary) *
            Number(ERC20AssetForRightOrder.value)) /
            10000
        );

        expect(await ERC1155Contract.balanceOf(makerAddress, 1)).to.be.equal(
          10
        );
        expect(await ERC1155Contract.balanceOf(takerAddress, 1)).to.be.equal(
          40
        );
        // TODO: royalties checks for tokens
      });

      it('should not allow signature reuse for partially filling orders using matchOrders between ERC20 and BUNDLE', async function () {
        // Seller (taker - left) has 5 copies of a Bundle type; buyer (maker - right) just wants to buy 1 of these
        const ERC20AssetForLeftOrder = await AssetERC20(
          ERC20Contract,
          50000000000
        );

        // ERC20Asset for partial fill
        const ERC20AssetForRightOrder = await AssetERC20(
          ERC20Contract,
          10000000000
        );

        bundledERC721 = [];

        priceDistribution = {
          erc20Prices: [5000000000],
          erc721Prices: [[]], // price distribution without ERC721
          erc1155Prices: [[500000000]],
          quadPrices: [],
        };

        const bundleAsset = {
          bundledERC20,
          bundledERC721,
          bundledERC1155,
          quads,
          priceDistribution,
        };

        bundleWithoutERC721Left = await AssetBundle(bundleAsset, 5);

        // bundle for partial fill
        bundleWithoutERC721Right = await AssetBundle(bundleAsset, 1);

        // left order for partial fill
        orderLeft = await OrderDefault(
          maker,
          ERC20AssetForLeftOrder, // makeAsset
          ZeroAddress,
          bundleWithoutERC721Left, // takeAsset
          1,
          0,
          0
        );
        // right order for partial fill
        orderRight = await OrderDefault(
          taker,
          bundleWithoutERC721Right, // makeAsset
          ZeroAddress,
          ERC20AssetForRightOrder, // takeAsset
          1,
          0,
          0
        );

        makerSig = await signOrder(orderLeft, maker, OrderValidatorAsAdmin);
        takerSig = await signOrder(orderRight, taker, OrderValidatorAsAdmin);

        await ExchangeContractAsUser.matchOrders([
          {
            orderLeft,
            signatureLeft: makerSig,
            orderRight,
            signatureRight: takerSig,
          },
        ]);

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

      it('should partially fill orders using matchOrders between ERC20 and BUNDLE - increase bundle right order value', async function () {
        // Seller (taker - left) has 5 copies of a Bundle type; buyer (maker - right) just wants to buy 1 of these
        const ERC20AssetForLeftOrder = await AssetERC20(
          ERC20Contract,
          50000000000
        );

        // ERC20Asset for partial fill
        const ERC20AssetForRightOrder = await AssetERC20(
          ERC20Contract,
          20000000000
        );

        bundledERC721 = [];

        priceDistribution = {
          erc20Prices: [10000000000],
          erc721Prices: [[]], // price distribution without ERC721
          erc1155Prices: [[1000000000]],
          quadPrices: [],
        };

        const bundleAsset = {
          bundledERC20,
          bundledERC721,
          bundledERC1155,
          quads,
          priceDistribution,
        };

        // ERC1155Asset for partial fill
        bundleWithoutERC721Left = await AssetBundle(bundleAsset, 5);

        bundleWithoutERC721Right = await AssetBundle(bundleAsset, 2);

        // left order for partial fill
        orderLeft = await OrderDefault(
          maker,
          ERC20AssetForLeftOrder, // makeAsset
          ZeroAddress,
          bundleWithoutERC721Left, // takeAsset
          1,
          0,
          0
        );
        // right order for partial fill
        orderRight = await OrderDefault(
          taker,
          bundleWithoutERC721Right, // makeAsset
          ZeroAddress,
          ERC20AssetForRightOrder, // takeAsset
          1,
          0,
          0
        );

        makerSig = await signOrder(orderLeft, maker, OrderValidatorAsAdmin);
        takerSig = await signOrder(orderRight, taker, OrderValidatorAsAdmin);

        const makerAddress = await maker.getAddress();
        const takerAddress = await taker.getAddress();

        expect(await ERC20Contract.balanceOf(makerAddress)).to.be.equal(
          30000000000
        );
        expect(await ERC20Contract.balanceOf(takerAddress)).to.be.equal(0);
        expect(await ERC20Contract2.balanceOf(makerAddress)).to.be.equal(0);
        expect(await ERC20Contract2.balanceOf(takerAddress)).to.be.equal(
          40000000000
        );
        expect(await ERC1155Contract.balanceOf(takerAddress, 1)).to.be.equal(
          50
        );
        expect(await ERC1155Contract.balanceOf(makerAddress, 1)).to.be.equal(0);
        expect(
          await ExchangeContractAsUser.fills(hashKey(orderLeft))
        ).to.be.equal(0);
        expect(
          await ExchangeContractAsUser.fills(hashKey(orderRight))
        ).to.be.equal(0);

        await ExchangeContractAsUser.matchOrders([
          {
            orderLeft,
            signatureLeft: makerSig,
            orderRight,
            signatureRight: takerSig,
          },
        ]);

        expect(
          await ExchangeContractAsUser.fills(hashKey(orderLeft)) // newFill.rightValue
        ).to.be.equal(2);
        expect(
          await ExchangeContractAsUser.fills(hashKey(orderRight)) // newFill.leftValue
        ).to.be.equal(20000000000);

        expect(await ERC20Contract.balanceOf(takerAddress)).to.be.equal(
          19500000000
        );
        expect(await ERC20Contract.balanceOf(maker)).to.be.equal(10000000000);
        expect(await ERC20Contract2.balanceOf(maker)).to.be.equal(20000000000);
        expect(await ERC20Contract2.balanceOf(taker)).to.be.equal(20000000000);

        expect(
          await ERC20Contract.balanceOf(defaultFeeReceiver.getAddress())
        ).to.be.equal(
          (Number(protocolFeeSecondary) *
            Number(ERC20AssetForRightOrder.value)) /
            10000
        );

        expect(await ERC1155Contract.balanceOf(makerAddress, 1)).to.be.equal(
          10
        );
        expect(await ERC1155Contract.balanceOf(takerAddress, 1)).to.be.equal(
          40
        );
        // TODO: royalties checks for tokens
      });

      it('should fully fill an order using partial matches between ERC20 and BUNDLE', async function () {
        // Seller (taker - left) has 5 copies of a Bundle type; buyer (maker - right) wants to buy 1 of these, then another in a second tx
        const ERC20AssetForLeftOrder = await AssetERC20(
          ERC20Contract,
          50000000000
        );

        // ERC20Asset for partial fill
        const ERC20AssetForRightOrder = await AssetERC20(
          ERC20Contract,
          10000000000
        );

        bundledERC721 = [];

        priceDistribution = {
          erc20Prices: [5000000000],
          erc721Prices: [[]], // price distribution without ERC721
          erc1155Prices: [[500000000]],
          quadPrices: [],
        };

        const bundleAsset = {
          bundledERC20,
          bundledERC721,
          bundledERC1155,
          quads,
          priceDistribution,
        };

        // ERC1155Asset for partial fill
        bundleWithoutERC721Left = await AssetBundle(bundleAsset, 5);

        bundleWithoutERC721Right = await AssetBundle(bundleAsset, 1);

        // left order for partial fill
        orderLeft = await OrderDefault(
          maker,
          ERC20AssetForLeftOrder, // makeAsset
          ZeroAddress,
          bundleWithoutERC721Left, // takeAsset
          1,
          0,
          0
        );
        // right order for first partial fill
        const rightOrderForFirstMatch = await OrderDefault(
          taker,
          bundleWithoutERC721Right, // makeAsset
          ZeroAddress,
          ERC20AssetForRightOrder, // takeAsset
          1,
          0,
          0
        );

        makerSig = await signOrder(orderLeft, maker, OrderValidatorAsAdmin);

        const makerAddress = await maker.getAddress();
        const takerAddress = await taker.getAddress();

        const takerSigForFirstMatch = await signOrder(
          rightOrderForFirstMatch,
          taker,
          OrderValidatorAsAdmin
        );

        await ExchangeContractAsUser.matchOrders([
          {
            orderLeft,
            signatureLeft: makerSig,
            orderRight: rightOrderForFirstMatch,
            signatureRight: takerSigForFirstMatch,
          },
        ]);

        expect(
          await ExchangeContractAsUser.fills(hashKey(orderLeft)) // newFill.rightValue
        ).to.be.equal(1);
        expect(
          await ExchangeContractAsUser.fills(hashKey(rightOrderForFirstMatch)) // newFill.leftValue
        ).to.be.equal(10000000000);

        expect(await ERC20Contract.balanceOf(takerAddress)).to.be.equal(
          9750000000
        );
        expect(await ERC20Contract.balanceOf(maker)).to.be.equal(20000000000);
        expect(await ERC20Contract2.balanceOf(maker)).to.be.equal(20000000000);
        expect(await ERC20Contract2.balanceOf(taker)).to.be.equal(20000000000);

        expect(
          await ERC20Contract.balanceOf(defaultFeeReceiver.getAddress())
        ).to.be.equal(
          (Number(protocolFeeSecondary) *
            Number(ERC20AssetForRightOrder.value)) /
            10000
        ); // 1 * partial fills => 1 * fee taken

        expect(await ERC1155Contract.balanceOf(makerAddress, 1)).to.be.equal(
          10
        );
        expect(await ERC1155Contract.balanceOf(takerAddress, 1)).to.be.equal(
          40
        );

        // right order for second partial fill
        const rightOrderForSecondMatch = await OrderDefault(
          taker,
          bundleWithoutERC721Right, // makeAsset
          ZeroAddress,
          ERC20AssetForRightOrder, // takeAsset
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

        expect(
          await ExchangeContractAsUser.fills(hashKey(orderLeft)) // newFill.rightValue
        ).to.be.equal(2);
        expect(
          await ExchangeContractAsUser.fills(hashKey(rightOrderForSecondMatch)) // newFill.leftValue
        ).to.be.equal(10000000000);

        expect(await ERC20Contract.balanceOf(takerAddress)).to.be.equal(
          19500000000
        );
        expect(await ERC20Contract.balanceOf(maker)).to.be.equal(10000000000);
        expect(await ERC20Contract2.balanceOf(maker)).to.be.equal(40000000000);
        expect(await ERC20Contract2.balanceOf(taker)).to.be.equal(0);

        expect(
          await ERC20Contract.balanceOf(defaultFeeReceiver.getAddress())
        ).to.be.equal(
          (Number(protocolFeeSecondary) *
            Number(ERC20AssetForRightOrder.value) *
            2) /
            10000
        ); // 2 * partial fills => 2 * fee taken

        expect(await ERC1155Contract.balanceOf(makerAddress, 1)).to.be.equal(
          20
        );
        expect(await ERC1155Contract.balanceOf(takerAddress, 1)).to.be.equal(
          30
        );
      });
    });

    describe('Bundle x ERC20 token', function () {
      beforeEach(async function () {
        ({
          ExchangeContractAsUser,
          OrderValidatorAsAdmin,
          ERC20Contract,
          ERC20Contract2,
          ERC721Contract,
          ERC1155Contract,
          protocolFeeSecondary,
          defaultFeeReceiver,
          user1: maker,
          user2: taker,
        } = await loadFixture(deployFixtures));

        priceDistribution = {
          erc20Prices: [2000000000],
          erc721Prices: [[3000000000]],
          erc1155Prices: [[500000000]],
          quadPrices: [],
        };

        // Set up ERC20 for taker
        await ERC20Contract.mint(await taker.getAddress(), 30000000000);
        await ERC20Contract.connect(taker).approve(
          await ExchangeContractAsUser.getAddress(),
          30000000000
        );

        // Construct takerAsset
        takerAsset = await AssetERC20(ERC20Contract, 10000000000);

        // Set up ERC20 for maker
        await ERC20Contract2.mint(await maker.getAddress(), 40000000000);
        await ERC20Contract2.connect(maker).approve(
          await ExchangeContractAsUser.getAddress(),
          40000000000
        );

        // Set up ERC721 for maker
        await ERC721Contract.mint(await maker.getAddress(), 1);
        await ERC721Contract.connect(maker).approve(
          await ExchangeContractAsUser.getAddress(),
          1
        );

        // Set up ERC1155 for maker
        await ERC1155Contract.mint(await maker.getAddress(), 1, 50);

        await ERC1155Contract.connect(maker).setApprovalForAll(
          await ExchangeContractAsUser.getAddress(),
          true
        );

        // Construct makerAsset bundle
        bundledERC20 = [
          {
            erc20Address: ERC20Contract2.target,
            value: 20000000000,
          },
        ];
        bundledERC721 = [
          {
            erc721Address: ERC721Contract.target,
            ids: [1],
          },
        ];

        bundledERC1155 = [
          {
            erc1155Address: ERC1155Contract.target,
            ids: [1],
            supplies: [10],
          },
        ];

        quads = {
          sizes: [],
          xs: [],
          ys: [],
          data: '0x',
        }; // empty quads

        // Create bundle for passing as right order
        bundleData = {
          bundledERC20,
          bundledERC721,
          bundledERC1155,
          quads,
          priceDistribution,
        };

        makerAsset = await AssetBundle(bundleData, 1); // there can only ever be 1 copy of a bundle that contains ERC721
      });

      it('should execute a complete match order between ERC20 tokens and Bundle containing ERC20, ERC721 and ERC1155', async function () {
        orderLeft = await OrderDefault(
          maker, // Bundle
          makerAsset,
          ZeroAddress,
          takerAsset, // ERC20
          1,
          0,
          0
        );
        orderRight = await OrderDefault(
          taker,
          takerAsset, // ERC20
          ZeroAddress,
          makerAsset, // Bundle
          1,
          0,
          0
        );

        makerSig = await signOrder(orderLeft, maker, OrderValidatorAsAdmin);
        takerSig = await signOrder(orderRight, taker, OrderValidatorAsAdmin);

        const makerAddress = await maker.getAddress();
        const takerAddress = await taker.getAddress();

        expect(await ERC20Contract.balanceOf(takerAddress)).to.be.equal(
          30000000000
        );
        expect(await ERC20Contract.balanceOf(makerAddress)).to.be.equal(0);
        expect(await ERC20Contract2.balanceOf(takerAddress)).to.be.equal(0);
        expect(await ERC20Contract2.balanceOf(makerAddress)).to.be.equal(
          40000000000
        );
        expect(await ERC721Contract.ownerOf(1)).to.be.equal(makerAddress);
        expect(await ERC1155Contract.balanceOf(makerAddress, 1)).to.be.equal(
          50
        );
        expect(await ERC1155Contract.balanceOf(takerAddress, 1)).to.be.equal(0);

        await ExchangeContractAsUser.matchOrders([
          {
            orderLeft, // passing Bundle as left order
            signatureLeft: makerSig,
            orderRight, // passing ERC20 as right order
            signatureRight: takerSig,
          },
        ]);
        expect(await ERC1155Contract.balanceOf(takerAddress, 1)).to.be.equal(
          10
        );
        expect(await ERC721Contract.ownerOf(1)).to.be.equal(takerAddress);
        expect(await ERC1155Contract.balanceOf(makerAddress, 1)).to.be.equal(
          40
        );

        expect(
          await ExchangeContractAsUser.fills(hashKey(orderLeft))
        ).to.be.equal(10000000000);
        expect(
          await ExchangeContractAsUser.fills(hashKey(orderRight))
        ).to.be.equal(1);

        expect(await ERC20Contract.balanceOf(makerAddress)).to.be.equal(
          9750000000 // 10000000000 - protocolFee
        );

        expect(await ERC20Contract.balanceOf(taker)).to.be.equal(20000000000);
        expect(await ERC20Contract2.balanceOf(taker)).to.be.equal(20000000000);
        expect(await ERC20Contract2.balanceOf(maker)).to.be.equal(20000000000);

        // check protocol fee -> 250 * 10000000000 / 10000 = 250000000
        expect(
          await ERC20Contract.balanceOf(defaultFeeReceiver.getAddress())
        ).to.be.equal(
          (Number(protocolFeeSecondary) * Number(takerAsset.value)) / 10000
        );
      });
    });

    describe('ERC20 x Bundle with Quads', function () {
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
          deployer: royaltyReceiver,
          LandContract,
          LandAsAdmin,
          landAdmin,
        } = await loadFixture(deployFixtures));

        priceDistribution = {
          erc20Prices: [3000000000],
          erc721Prices: [[1000000000]], // price distribution without ERC721
          erc1155Prices: [[500000000]],
          quadPrices: [500000000, 500000000],
        };

        // Set up ERC20 for maker
        await ERC20Contract.mint(await maker.getAddress(), 30000000000);
        await ERC20Contract.connect(maker).approve(
          await ExchangeContractAsUser.getAddress(),
          30000000000
        );

        // Construct makerAsset
        makerAsset = await AssetERC20(ERC20Contract, 10000000000);

        // Set up ERC20 for taker
        await ERC20Contract2.mint(await taker.getAddress(), 40000000000);
        await ERC20Contract2.connect(taker).approve(
          await ExchangeContractAsUser.getAddress(),
          40000000000
        );

        // Set up ERC721 for taker
        await ERC721Contract.mint(await taker.getAddress(), 1);
        await ERC721Contract.connect(taker).approve(
          await ExchangeContractAsUser.getAddress(),
          1
        );

        // Set up ERC1155 for taker
        await ERC1155Contract.mint(await taker.getAddress(), 1, 50);

        await ERC1155Contract.connect(taker).setApprovalForAll(
          await ExchangeContractAsUser.getAddress(),
          true
        );

        // Make sure the land contract address is set on the Exchange
        const landContractAddress = await LandContract.getAddress();
        await ExchangeContractAsAdmin.setLandContract(landContractAddress);

        // Land contract setup for taker -------------------------------------------------------------

        // Set a minter
        await LandAsAdmin.setMinter(await landAdmin.getAddress(), true);

        // Ensure that the marketplace contract is an approved operator for mock land contract
        await LandContract.connect(taker).setApprovalForAllWithOutFilter(
          await ExchangeContractAsUser.getAddress(),
          true
        );

        await LandAsAdmin.mintQuad(await taker.getAddress(), 3, 0, 0, '0x');
        await LandAsAdmin.mintQuad(await taker.getAddress(), 3, 0, 3, '0x');
        await LandAsAdmin.mintQuad(await taker.getAddress(), 3, 3, 0, '0x');
        await LandAsAdmin.mintQuad(await taker.getAddress(), 3, 3, 3, '0x');
        expect(
          await LandContract.balanceOf(await taker.getAddress())
        ).to.be.equal(36);

        // End land setup for taker ------------------------------------------------------------------

        // Construct takerAsset bundle
        bundledERC20 = [
          {
            erc20Address: ERC20Contract2.target,
            value: 20000000000,
          },
        ];
        bundledERC721 = [
          {
            erc721Address: ERC721Contract.target,
            ids: [1],
          },
        ];

        bundledERC1155 = [
          {
            erc1155Address: ERC1155Contract.target,
            ids: [1],
            supplies: [10],
          },
        ];

        quads = {
          sizes: [3, 3], // 3x3, 3x3 = 9+9 lands total
          xs: [3, 0],
          ys: [0, 3],
          data: '0x',
        };

        // Create bundle for passing as right order
        bundleData = {
          bundledERC20,
          bundledERC721,
          bundledERC1155,
          quads,
          priceDistribution,
        };

        takerAsset = await AssetBundle(bundleData, 1); // there can only ever be 1 copy of a bundle that contains ERC721
      });

      it('should execute a complete match order between ERC20 tokens and Bundle containing ERC20, ERC721, ERC1155 and Quads', async function () {
        orderLeft = await OrderDefault(
          maker, // ERC20
          makerAsset,
          ZeroAddress,
          takerAsset, // Bundle
          1,
          0,
          0
        );
        orderRight = await OrderDefault(
          taker,
          takerAsset, // Bundle
          ZeroAddress,
          makerAsset, // ERC20
          1,
          0,
          0
        );

        makerSig = await signOrder(orderLeft, maker, OrderValidatorAsAdmin);
        takerSig = await signOrder(orderRight, taker, OrderValidatorAsAdmin);

        const makerAddress = await maker.getAddress();
        const takerAddress = await taker.getAddress();

        expect(await ERC20Contract.balanceOf(makerAddress)).to.be.equal(
          30000000000
        );
        expect(await ERC20Contract.balanceOf(takerAddress)).to.be.equal(0);
        expect(await ERC20Contract2.balanceOf(makerAddress)).to.be.equal(0);
        expect(await ERC20Contract2.balanceOf(takerAddress)).to.be.equal(
          40000000000
        );
        expect(await ERC721Contract.ownerOf(1)).to.be.equal(takerAddress);
        expect(await ERC1155Contract.balanceOf(takerAddress, 1)).to.be.equal(
          50
        );
        expect(await ERC1155Contract.balanceOf(makerAddress, 1)).to.be.equal(0);

        await ExchangeContractAsUser.matchOrders([
          {
            orderLeft, // passing ERC20 as left order
            signatureLeft: makerSig,
            orderRight, // passing Bundle as right order
            signatureRight: takerSig,
          },
        ]);
        expect(await ERC1155Contract.balanceOf(makerAddress, 1)).to.be.equal(
          10
        );
        expect(await ERC721Contract.ownerOf(1)).to.be.equal(makerAddress);
        expect(await ERC1155Contract.balanceOf(takerAddress, 1)).to.be.equal(
          40
        );

        expect(
          await ExchangeContractAsUser.fills(hashKey(orderLeft))
        ).to.be.equal(1);
        expect(
          await ExchangeContractAsUser.fills(hashKey(orderRight))
        ).to.be.equal(10000000000);

        expect(await ERC20Contract.balanceOf(takerAddress)).to.be.equal(
          9750000000 // 10000000000 - protocolFee
        );

        expect(await ERC20Contract.balanceOf(makerAddress)).to.be.equal(
          20000000000
        );
        expect(await ERC20Contract2.balanceOf(makerAddress)).to.be.equal(
          20000000000
        );
        expect(await ERC20Contract2.balanceOf(takerAddress)).to.be.equal(
          20000000000
        );

        // check protocol fee -> 250 * 10000000000 / 10000 = 250000000
        expect(
          await ERC20Contract.balanceOf(await defaultFeeReceiver.getAddress())
        ).to.be.equal(
          (Number(protocolFeeSecondary) * Number(makerAsset.value)) / 10000
        );

        // check maker received quads
        expect(await LandContract.balanceOf(takerAddress)).to.be.equal(18);
        expect(await LandContract.balanceOf(makerAddress)).to.be.equal(18);
      });
    });

    describe('Royalty X Bundle', function () {
      beforeEach(async function () {
        ({
          ExchangeContractAsUser,
          ExchangeContractAsAdmin,
          OrderValidatorAsAdmin,
          RoyaltiesRegistryAsDeployer,
          ERC20Contract,
          ERC20Contract2,
          ERC721Contract,
          ERC1155Contract,
          RoyaltiesProvider,
          QuadHelper,
          protocolFeeSecondary,
          defaultFeeReceiver,
          user1: maker,
          user2: taker,
          deployer: royaltyReceiver,
          admin: royaltyReceiver2,
          user: royaltyReceiver3,
          LandContract,
          LandAsAdmin,
          landAdmin,
        } = await loadFixture(deployFixtures));

        priceDistribution = {
          erc20Prices: [4000000000],
          erc721Prices: [[1000000000]],
          erc1155Prices: [[500000000]],
          quadPrices: [],
        };

        // Set up ERC20 for maker
        await ERC20Contract.mint(await maker.getAddress(), 30000000000);
        await ERC20Contract.connect(maker).approve(
          await ExchangeContractAsUser.getAddress(),
          30000000000
        );

        // Construct makerAsset
        makerAsset = await AssetERC20(ERC20Contract, 10000000000);

        // Set up ERC20 for taker
        await ERC20Contract2.mint(await taker.getAddress(), 40000000000);
        await ERC20Contract2.connect(taker).approve(
          await ExchangeContractAsUser.getAddress(),
          40000000000
        );

        // Set up ERC721 for taker
        await ERC721Contract.mint(await taker.getAddress(), 1);
        await ERC721Contract.connect(taker).approve(
          await ExchangeContractAsUser.getAddress(),
          1
        );
        await ERC721Contract.mint(await taker.getAddress(), 2);
        await ERC721Contract.connect(taker).approve(
          await ExchangeContractAsUser.getAddress(),
          2
        );

        // Set up ERC1155 for taker
        await ERC1155Contract.mint(await taker.getAddress(), 1, 50);
        await ERC1155Contract.mint(await taker.getAddress(), 2, 50);

        await ERC1155Contract.connect(taker).setApprovalForAll(
          await ExchangeContractAsUser.getAddress(),
          true
        );

        // Make sure the land contract address is set on the Exchange
        const landContractAddress = await LandContract.getAddress();
        await ExchangeContractAsAdmin.setLandContract(landContractAddress);

        // Land contract setup for taker -------------------------------------------------------------

        // Set a minter
        await LandAsAdmin.setMinter(await landAdmin.getAddress(), true);

        // Ensure that the marketplace contract is an approved operator for mock land contract
        await LandContract.connect(taker).setApprovalForAllWithOutFilter(
          await ExchangeContractAsUser.getAddress(),
          true
        );

        await LandAsAdmin.mintQuad(await taker.getAddress(), 3, 0, 0, '0x');
        await LandAsAdmin.mintQuad(await taker.getAddress(), 3, 0, 3, '0x');
        await LandAsAdmin.mintQuad(await taker.getAddress(), 3, 3, 0, '0x');
        await LandAsAdmin.mintQuad(await taker.getAddress(), 3, 3, 3, '0x');
        expect(
          await LandContract.balanceOf(await taker.getAddress())
        ).to.be.equal(36);

        // End land setup for taker ------------------------------------------------------------------

        // Construct takerAsset bundle
        bundledERC20 = [
          {
            erc20Address: ERC20Contract2.target,
            value: 20000000000,
          },
        ];
        bundledERC721 = [
          {
            erc721Address: ERC721Contract.target,
            ids: [1],
          },
        ];

        bundledERC1155 = [
          {
            erc1155Address: ERC1155Contract.target,
            ids: [1],
            supplies: [10],
          },
        ];

        quads = {
          sizes: [],
          xs: [],
          ys: [],
          data: '0x',
        }; // empty quads

        // Create bundle for passing as right order
        bundleData = {
          bundledERC20,
          bundledERC721,
          bundledERC1155,
          quads,
          priceDistribution,
        };

        takerAsset = await AssetBundle(bundleData, 1); // there can only ever be 1 copy of a bundle that contains ERC721
      });

      it('should not execute match order for bundle if royalties are > 50% for ERC721 token', async function () {
        // set up royalties by token
        await RoyaltiesRegistryAsDeployer.setRoyaltiesByToken(
          await ERC721Contract.getAddress(),
          [await LibPartData(royaltyReceiver, 5100)] // royalty is set to 5100% of the amount
        );

        orderLeft = await OrderDefault(
          maker, // ERC20
          makerAsset,
          ZeroAddress,
          takerAsset, // Bundle
          1,
          0,
          0
        );
        orderRight = await OrderDefault(
          taker,
          takerAsset, // Bundle
          ZeroAddress,
          makerAsset, // ERC20
          1,
          0,
          0
        );

        makerSig = await signOrder(orderLeft, maker, OrderValidatorAsAdmin);
        takerSig = await signOrder(orderRight, taker, OrderValidatorAsAdmin);

        const makerAddress = await maker.getAddress();
        const takerAddress = await taker.getAddress();

        expect(await ERC20Contract.balanceOf(makerAddress)).to.be.equal(
          30000000000
        );
        expect(await ERC20Contract.balanceOf(takerAddress)).to.be.equal(0);
        expect(await ERC20Contract2.balanceOf(makerAddress)).to.be.equal(0);
        expect(await ERC20Contract2.balanceOf(takerAddress)).to.be.equal(
          40000000000
        );
        expect(await ERC721Contract.ownerOf(1)).to.be.equal(takerAddress);
        expect(await ERC1155Contract.balanceOf(takerAddress, 1)).to.be.equal(
          50
        );
        expect(await ERC1155Contract.balanceOf(makerAddress, 1)).to.be.equal(0);

        await expect(
          ExchangeContractAsUser.matchOrders([
            {
              orderLeft, // passing ERC20 as left order
              signatureLeft: makerSig,
              orderRight, // passing Bundle as right order
              signatureRight: takerSig,
            },
          ])
        ).to.be.revertedWith('royalties are too high (>50%)');
      });

      it('should execute complete match order for bundle with royalty on ERC721 token', async function () {
        // set up royalties by token
        await RoyaltiesRegistryAsDeployer.setRoyaltiesByToken(
          await ERC721Contract.getAddress(),
          [await LibPartData(royaltyReceiver, 2000)] // 20% royalty for ERC721 token
        );

        orderLeft = await OrderDefault(
          maker, // ERC20
          makerAsset,
          ZeroAddress,
          takerAsset, // Bundle
          1,
          0,
          0
        );
        orderRight = await OrderDefault(
          taker,
          takerAsset, // Bundle
          ZeroAddress,
          makerAsset, // ERC20
          1,
          0,
          0
        );
        8000000000;
        makerSig = await signOrder(orderLeft, maker, OrderValidatorAsAdmin);
        takerSig = await signOrder(orderRight, taker, OrderValidatorAsAdmin);

        const makerAddress = await maker.getAddress();
        const takerAddress = await taker.getAddress();

        expect(await ERC20Contract.balanceOf(makerAddress)).to.be.equal(
          30000000000
        );
        expect(await ERC20Contract.balanceOf(takerAddress)).to.be.equal(0);
        expect(await ERC20Contract2.balanceOf(makerAddress)).to.be.equal(0);
        expect(await ERC20Contract2.balanceOf(takerAddress)).to.be.equal(
          40000000000
        );
        expect(await ERC721Contract.ownerOf(1)).to.be.equal(takerAddress);
        expect(await ERC1155Contract.balanceOf(takerAddress, 1)).to.be.equal(
          50
        );
        expect(await ERC1155Contract.balanceOf(makerAddress, 1)).to.be.equal(0);

        await ExchangeContractAsUser.matchOrders([
          {
            orderLeft, // passing ERC20 as left order
            signatureLeft: makerSig,
            orderRight, // passing Bundle as right order
            signatureRight: takerSig,
          },
        ]);

        expect(await ERC1155Contract.balanceOf(makerAddress, 1)).to.be.equal(
          10
        );
        expect(await ERC721Contract.ownerOf(1)).to.be.equal(makerAddress);
        expect(await ERC1155Contract.balanceOf(takerAddress, 1)).to.be.equal(
          40
        );

        expect(
          await ExchangeContractAsUser.fills(hashKey(orderLeft))
        ).to.be.equal(1);
        expect(
          await ExchangeContractAsUser.fills(hashKey(orderRight))
        ).to.be.equal(10000000000);

        expect(await ERC20Contract.balanceOf(takerAddress)).to.be.equal(
          9550000000 // 10000000000 - royalty - protocolFee
        );

        expect(await ERC20Contract.balanceOf(maker)).to.be.equal(20000000000);
        expect(await ERC20Contract2.balanceOf(maker)).to.be.equal(20000000000);
        expect(await ERC20Contract2.balanceOf(taker)).to.be.equal(20000000000);

        // check paid royalty
        expect(
          await ERC20Contract.balanceOf(royaltyReceiver.getAddress())
        ).to.be.equal(200000000); // 10% of asset price for ERC721 token

        // check protocol fee -> 250 * 10000000000 / 10000 = 250000000
        expect(
          await ERC20Contract.balanceOf(defaultFeeReceiver.getAddress())
        ).to.be.equal(
          (Number(protocolFeeSecondary) * Number(makerAsset.value)) / 10000
        );
      });

      it('should execute complete match order for bundle with multiple royalty receivers on ERC721 token', async function () {
        bundledERC721 = [
          {
            erc721Address: ERC721Contract.target,
            ids: [1, 2],
          },
        ];

        priceDistribution = {
          erc20Prices: [4000000000],
          erc721Prices: [[400000000, 600000000]],
          erc1155Prices: [[500000000]],
          quadPrices: [],
        };

        bundleData = {
          bundledERC20,
          bundledERC721,
          bundledERC1155,
          quads,
          priceDistribution,
        };

        takerAsset = await AssetBundle(bundleData, 1);

        // configuring royalties
        await RoyaltiesProvider.initializeProvider(
          await ERC721Contract.getAddress(),
          1,
          [await LibPartData(royaltyReceiver, 1000)] // 10% royalty for ERC721 token with id:1
        );
        await RoyaltiesProvider.initializeProvider(
          await ERC721Contract.getAddress(),
          2,
          [await LibPartData(royaltyReceiver2, 2000)] // 20% royalty for ERC721 token with id:2
        );
        await RoyaltiesRegistryAsDeployer.setProviderByToken(
          await ERC721Contract.getAddress(),
          RoyaltiesProvider.getAddress()
        );

        orderLeft = await OrderDefault(
          maker, // ERC20
          makerAsset,
          ZeroAddress,
          takerAsset, // Bundle
          1,
          0,
          0
        );
        orderRight = await OrderDefault(
          taker,
          takerAsset, // Bundle
          ZeroAddress,
          makerAsset, // ERC20
          1,
          0,
          0
        );

        makerSig = await signOrder(orderLeft, maker, OrderValidatorAsAdmin);
        takerSig = await signOrder(orderRight, taker, OrderValidatorAsAdmin);

        const makerAddress = await maker.getAddress();
        const takerAddress = await taker.getAddress();

        expect(await ERC20Contract.balanceOf(makerAddress)).to.be.equal(
          30000000000
        );
        expect(await ERC20Contract.balanceOf(takerAddress)).to.be.equal(0);
        expect(await ERC20Contract2.balanceOf(makerAddress)).to.be.equal(0);
        expect(await ERC20Contract2.balanceOf(takerAddress)).to.be.equal(
          40000000000
        );
        expect(await ERC721Contract.ownerOf(1)).to.be.equal(takerAddress);
        expect(await ERC1155Contract.balanceOf(takerAddress, 1)).to.be.equal(
          50
        );
        expect(await ERC1155Contract.balanceOf(makerAddress, 1)).to.be.equal(0);

        await ExchangeContractAsUser.matchOrders([
          {
            orderLeft, // passing ERC20 as left order
            signatureLeft: makerSig,
            orderRight, // passing Bundle as right order
            signatureRight: takerSig,
          },
        ]);

        expect(await ERC1155Contract.balanceOf(makerAddress, 1)).to.be.equal(
          10
        );
        expect(await ERC721Contract.ownerOf(1)).to.be.equal(makerAddress);
        expect(await ERC1155Contract.balanceOf(takerAddress, 1)).to.be.equal(
          40
        );

        expect(
          await ExchangeContractAsUser.fills(hashKey(orderLeft))
        ).to.be.equal(1);
        expect(
          await ExchangeContractAsUser.fills(hashKey(orderRight))
        ).to.be.equal(10000000000);

        expect(await ERC20Contract.balanceOf(takerAddress)).to.be.equal(
          9590000000 // 10000000000 - royalty - protocolFee
        );

        expect(await ERC20Contract.balanceOf(maker)).to.be.equal(20000000000);
        expect(await ERC20Contract2.balanceOf(maker)).to.be.equal(20000000000);
        expect(await ERC20Contract2.balanceOf(taker)).to.be.equal(20000000000);

        // check paid royalty
        expect(
          await ERC20Contract.balanceOf(royaltyReceiver.getAddress())
        ).to.be.equal(40000000); // 10% of asset price for ERC721 token with id:1
        expect(
          await ERC20Contract.balanceOf(royaltyReceiver2.getAddress())
        ).to.be.equal(120000000); // 20% of asset price for ERC721 token with id:2

        // check protocol fee -> 250 * 10000000000 / 10000 = 250000000
        expect(
          await ERC20Contract.balanceOf(defaultFeeReceiver.getAddress())
        ).to.be.equal(
          (Number(protocolFeeSecondary) * Number(makerAsset.value)) / 10000
        );
      });

      it('should not execute match order for bundle if royalties are > 50% for ERC1155 token', async function () {
        bundledERC1155 = [
          {
            erc1155Address: ERC1155Contract.target,
            ids: [1],
            supplies: [10],
          },
        ];

        bundleData = {
          bundledERC20,
          bundledERC721,
          bundledERC1155,
          quads,
          priceDistribution,
        };

        takerAsset = await AssetBundle(bundleData, 1);

        // configuring royalties
        await RoyaltiesProvider.initializeProvider(
          await ERC1155Contract.getAddress(),
          1,
          [await LibPartData(royaltyReceiver, 5100)] // royalty is set to 51% of the amount
        );
        await RoyaltiesRegistryAsDeployer.setProviderByToken(
          await ERC1155Contract.getAddress(),
          RoyaltiesProvider.getAddress()
        );

        orderLeft = await OrderDefault(
          maker, // ERC20
          makerAsset,
          ZeroAddress,
          takerAsset, // Bundle
          1,
          0,
          0
        );
        orderRight = await OrderDefault(
          taker,
          takerAsset, // Bundle
          ZeroAddress,
          makerAsset, // ERC20
          1,
          0,
          0
        );

        makerSig = await signOrder(orderLeft, maker, OrderValidatorAsAdmin);
        takerSig = await signOrder(orderRight, taker, OrderValidatorAsAdmin);

        const makerAddress = await maker.getAddress();
        const takerAddress = await taker.getAddress();

        expect(await ERC20Contract.balanceOf(makerAddress)).to.be.equal(
          30000000000
        );
        expect(await ERC20Contract.balanceOf(takerAddress)).to.be.equal(0);
        expect(await ERC20Contract2.balanceOf(makerAddress)).to.be.equal(0);
        expect(await ERC20Contract2.balanceOf(takerAddress)).to.be.equal(
          40000000000
        );
        expect(await ERC721Contract.ownerOf(1)).to.be.equal(takerAddress);
        expect(await ERC1155Contract.balanceOf(takerAddress, 1)).to.be.equal(
          50
        );
        expect(await ERC1155Contract.balanceOf(makerAddress, 1)).to.be.equal(0);

        await expect(
          ExchangeContractAsUser.matchOrders([
            {
              orderLeft, // passing ERC20 as left order
              signatureLeft: makerSig,
              orderRight, // passing Bundle as right order
              signatureRight: takerSig,
            },
          ])
        ).to.be.revertedWith('royalties are too high (>50%)');
      });

      it('should execute complete match order for bundle with royalty on ERC1155 token', async function () {
        bundleData = {
          bundledERC20,
          bundledERC721,
          bundledERC1155,
          quads,
          priceDistribution,
        };

        takerAsset = await AssetBundle(bundleData, 1);

        // configuring royalties
        await RoyaltiesProvider.initializeProvider(
          await ERC1155Contract.getAddress(),
          1,
          [await LibPartData(royaltyReceiver, 500)] // 5% royalty for ERC1155 token with id:1
        );

        await RoyaltiesRegistryAsDeployer.setProviderByToken(
          await ERC1155Contract.getAddress(),
          RoyaltiesProvider.getAddress()
        );

        orderLeft = await OrderDefault(
          maker, // ERC20
          makerAsset,
          ZeroAddress,
          takerAsset, // Bundle
          1,
          0,
          0
        );
        orderRight = await OrderDefault(
          taker,
          takerAsset, // Bundle
          ZeroAddress,
          makerAsset, // ERC20
          1,
          0,
          0
        );

        makerSig = await signOrder(orderLeft, maker, OrderValidatorAsAdmin);
        takerSig = await signOrder(orderRight, taker, OrderValidatorAsAdmin);

        const makerAddress = await maker.getAddress();
        const takerAddress = await taker.getAddress();

        expect(await ERC20Contract.balanceOf(makerAddress)).to.be.equal(
          30000000000
        );
        expect(await ERC20Contract.balanceOf(takerAddress)).to.be.equal(0);
        expect(await ERC20Contract2.balanceOf(makerAddress)).to.be.equal(0);
        expect(await ERC20Contract2.balanceOf(takerAddress)).to.be.equal(
          40000000000
        );
        expect(await ERC721Contract.ownerOf(1)).to.be.equal(takerAddress);
        expect(await ERC1155Contract.balanceOf(takerAddress, 1)).to.be.equal(
          50
        );
        expect(await ERC1155Contract.balanceOf(makerAddress, 1)).to.be.equal(0);

        await ExchangeContractAsUser.matchOrders([
          {
            orderLeft, // passing ERC20 as left order
            signatureLeft: makerSig,
            orderRight, // passing Bundle as right order
            signatureRight: takerSig,
          },
        ]);

        expect(await ERC1155Contract.balanceOf(makerAddress, 1)).to.be.equal(
          10
        );
        expect(await ERC721Contract.ownerOf(1)).to.be.equal(makerAddress);
        expect(await ERC1155Contract.balanceOf(takerAddress, 1)).to.be.equal(
          40
        );

        expect(
          await ExchangeContractAsUser.fills(hashKey(orderLeft))
        ).to.be.equal(1);
        expect(
          await ExchangeContractAsUser.fills(hashKey(orderRight))
        ).to.be.equal(10000000000);

        expect(await ERC20Contract.balanceOf(takerAddress)).to.be.equal(
          9725000000 // 10000000000 - royalty - protocolFee
        );

        expect(await ERC20Contract.balanceOf(maker)).to.be.equal(20000000000);
        expect(await ERC20Contract2.balanceOf(maker)).to.be.equal(20000000000);
        expect(await ERC20Contract2.balanceOf(taker)).to.be.equal(20000000000);

        // check paid royalty
        expect(
          await ERC20Contract.balanceOf(royaltyReceiver.getAddress())
        ).to.be.equal(25000000); // 5% of asset price for ERC1155 token with id:1

        // check protocol fee -> 250 * 10000000000 / 10000 = 250000000
        expect(
          await ERC20Contract.balanceOf(defaultFeeReceiver.getAddress())
        ).to.be.equal(
          (Number(protocolFeeSecondary) * Number(makerAsset.value)) / 10000
        );
      });

      it('should execute complete match order for bundle with multiple royalty receivers on ERC1155 token', async function () {
        bundledERC1155 = [
          {
            erc1155Address: ERC1155Contract.target,
            ids: [1, 2],
            supplies: [10, 5],
          },
        ];

        priceDistribution = {
          erc20Prices: [4000000000],
          erc721Prices: [[1000000000]],
          erc1155Prices: [[300000000, 400000000]],
          quadPrices: [],
        };

        bundleData = {
          bundledERC20,
          bundledERC721,
          bundledERC1155,
          quads,
          priceDistribution,
        };

        takerAsset = await AssetBundle(bundleData, 1);

        // configuring royalties
        await RoyaltiesProvider.initializeProvider(
          await ERC1155Contract.getAddress(),
          1,
          [await LibPartData(royaltyReceiver, 500)] // 5% royalty for ERC1155 token with id:1
        );
        await RoyaltiesProvider.initializeProvider(
          await ERC1155Contract.getAddress(),
          2,
          [await LibPartData(royaltyReceiver2, 1000)] // 10% royalty for ERC1155 token with id:2
        );
        await RoyaltiesRegistryAsDeployer.setProviderByToken(
          await ERC1155Contract.getAddress(),
          RoyaltiesProvider.getAddress()
        );

        orderLeft = await OrderDefault(
          maker, // ERC20
          makerAsset,
          ZeroAddress,
          takerAsset, // Bundle
          1,
          0,
          0
        );
        orderRight = await OrderDefault(
          taker,
          takerAsset, // Bundle
          ZeroAddress,
          makerAsset, // ERC20
          1,
          0,
          0
        );

        makerSig = await signOrder(orderLeft, maker, OrderValidatorAsAdmin);
        takerSig = await signOrder(orderRight, taker, OrderValidatorAsAdmin);

        const makerAddress = await maker.getAddress();
        const takerAddress = await taker.getAddress();

        expect(await ERC20Contract.balanceOf(makerAddress)).to.be.equal(
          30000000000
        );
        expect(await ERC20Contract.balanceOf(takerAddress)).to.be.equal(0);
        expect(await ERC20Contract2.balanceOf(makerAddress)).to.be.equal(0);
        expect(await ERC20Contract2.balanceOf(takerAddress)).to.be.equal(
          40000000000
        );
        expect(await ERC721Contract.ownerOf(1)).to.be.equal(takerAddress);
        expect(await ERC1155Contract.balanceOf(takerAddress, 1)).to.be.equal(
          50
        );
        expect(await ERC1155Contract.balanceOf(takerAddress, 2)).to.be.equal(
          50
        );
        expect(await ERC1155Contract.balanceOf(makerAddress, 1)).to.be.equal(0);
        expect(await ERC1155Contract.balanceOf(makerAddress, 2)).to.be.equal(0);

        await ExchangeContractAsUser.matchOrders([
          {
            orderLeft, // passing ERC20 as left order
            signatureLeft: makerSig,
            orderRight, // passing Bundle as right order
            signatureRight: takerSig,
          },
        ]);

        expect(await ERC1155Contract.balanceOf(makerAddress, 1)).to.be.equal(
          10
        );
        expect(await ERC1155Contract.balanceOf(makerAddress, 2)).to.be.equal(5);
        expect(await ERC721Contract.ownerOf(1)).to.be.equal(makerAddress);
        expect(await ERC1155Contract.balanceOf(takerAddress, 1)).to.be.equal(
          40
        );
        expect(await ERC1155Contract.balanceOf(takerAddress, 2)).to.be.equal(
          45
        );

        expect(
          await ExchangeContractAsUser.fills(hashKey(orderLeft))
        ).to.be.equal(1);
        expect(
          await ExchangeContractAsUser.fills(hashKey(orderRight))
        ).to.be.equal(10000000000);

        expect(await ERC20Contract.balanceOf(takerAddress)).to.be.equal(
          9695000000 // 10000000000 - royalty - protocolFee
        );

        expect(await ERC20Contract.balanceOf(maker)).to.be.equal(20000000000);
        expect(await ERC20Contract2.balanceOf(maker)).to.be.equal(20000000000);
        expect(await ERC20Contract2.balanceOf(taker)).to.be.equal(20000000000);

        // check paid royalty
        expect(
          await ERC20Contract.balanceOf(royaltyReceiver.getAddress())
        ).to.be.equal(15000000); // 5% of asset price for ERC1155 token with id:1
        expect(
          await ERC20Contract.balanceOf(royaltyReceiver2.getAddress())
        ).to.be.equal(40000000); // 10% of asset price for ERC1155 token with id:2

        // check protocol fee -> 250 * 10000000000 / 10000 = 250000000
        expect(
          await ERC20Contract.balanceOf(defaultFeeReceiver.getAddress())
        ).to.be.equal(
          (Number(protocolFeeSecondary) * Number(makerAsset.value)) / 10000
        );
      });

      it('should execute complete match order for bundle with royalty on Quads', async function () {
        quads = {
          sizes: [3, 3], // 3x3, 3x3 = 9+9 lands total
          xs: [3, 0],
          ys: [0, 3],
          data: '0x',
        };

        priceDistribution = {
          erc20Prices: [3000000000],
          erc721Prices: [[1000000000]],
          erc1155Prices: [[500000000]],
          quadPrices: [400000000, 600000000],
        };

        // Create bundle for passing as right order
        bundleData = {
          bundledERC20,
          bundledERC721,
          bundledERC1155,
          quads,
          priceDistribution,
        };

        takerAsset = await AssetBundle(bundleData, 1);

        // set up royalties by token
        await RoyaltiesRegistryAsDeployer.setRoyaltiesByToken(
          await LandAsAdmin.getAddress(),
          [await LibPartData(royaltyReceiver, 1000)] // 10% royalty for Land token
        );

        orderLeft = await OrderDefault(
          maker, // ERC20
          makerAsset,
          ZeroAddress,
          takerAsset, // Bundle
          1,
          0,
          0
        );
        orderRight = await OrderDefault(
          taker,
          takerAsset, // Bundle
          ZeroAddress,
          makerAsset, // ERC20
          1,
          0,
          0
        );

        makerSig = await signOrder(orderLeft, maker, OrderValidatorAsAdmin);
        takerSig = await signOrder(orderRight, taker, OrderValidatorAsAdmin);

        const makerAddress = await maker.getAddress();
        const takerAddress = await taker.getAddress();

        expect(await ERC20Contract.balanceOf(makerAddress)).to.be.equal(
          30000000000
        );
        expect(await ERC20Contract.balanceOf(takerAddress)).to.be.equal(0);
        expect(await ERC20Contract2.balanceOf(makerAddress)).to.be.equal(0);
        expect(await ERC20Contract2.balanceOf(takerAddress)).to.be.equal(
          40000000000
        );
        expect(await ERC721Contract.ownerOf(1)).to.be.equal(takerAddress);
        expect(await ERC1155Contract.balanceOf(takerAddress, 1)).to.be.equal(
          50
        );
        expect(await ERC1155Contract.balanceOf(makerAddress, 1)).to.be.equal(0);

        await ExchangeContractAsUser.matchOrders([
          {
            orderLeft, // passing ERC20 as left order
            signatureLeft: makerSig,
            orderRight, // passing Bundle as right order
            signatureRight: takerSig,
          },
        ]);
        expect(await ERC1155Contract.balanceOf(makerAddress, 1)).to.be.equal(
          10
        );
        expect(await ERC721Contract.ownerOf(1)).to.be.equal(makerAddress);
        expect(await ERC1155Contract.balanceOf(takerAddress, 1)).to.be.equal(
          40
        );

        expect(
          await ExchangeContractAsUser.fills(hashKey(orderLeft))
        ).to.be.equal(1);
        expect(
          await ExchangeContractAsUser.fills(hashKey(orderRight))
        ).to.be.equal(10000000000);

        expect(await ERC20Contract.balanceOf(takerAddress)).to.be.equal(
          9650000000 // 10000000000 - protocolFee - royalty
        );

        expect(await ERC20Contract.balanceOf(makerAddress)).to.be.equal(
          20000000000
        );
        expect(await ERC20Contract2.balanceOf(makerAddress)).to.be.equal(
          20000000000
        );
        expect(await ERC20Contract2.balanceOf(takerAddress)).to.be.equal(
          20000000000
        );

        // check paid royalty
        expect(
          await ERC20Contract.balanceOf(royaltyReceiver.getAddress())
        ).to.be.equal(100000000); // 10% of asset price for quad (3,0) & (0,3)

        // check protocol fee -> 250 * 10000000000 / 10000 = 250000000
        expect(
          await ERC20Contract.balanceOf(await defaultFeeReceiver.getAddress())
        ).to.be.equal(
          (Number(protocolFeeSecondary) * Number(makerAsset.value)) / 10000
        );

        // check maker received quads
        expect(await LandContract.balanceOf(takerAddress)).to.be.equal(18);
        expect(await LandContract.balanceOf(makerAddress)).to.be.equal(18);
      });

      it('should execute complete match order for bundle with multiple royalty receivers on Quads', async function () {
        quads = {
          sizes: [3, 3], // 3x3, 3x3 = 9+9 lands total
          xs: [3, 0],
          ys: [0, 3],
          data: '0x',
        };

        priceDistribution = {
          erc20Prices: [3000000000],
          erc721Prices: [[1000000000]],
          erc1155Prices: [[500000000]],
          quadPrices: [400000000, 600000000],
        };

        // Create bundle for passing as right order
        bundleData = {
          bundledERC20,
          bundledERC721,
          bundledERC1155,
          quads,
          priceDistribution,
        };

        takerAsset = await AssetBundle(bundleData, 1);

        // configuring royalties
        for (let i = 0; i < 9; i++) {
          await RoyaltiesProvider.initializeProvider(
            await LandAsAdmin.getAddress(),
            await QuadHelper.idInPath(i, 3, 3, 0),
            [await LibPartData(royaltyReceiver, 1000)] // royalty is set to 10% of the amount for quad(3,0)
          );
        }

        for (let i = 0; i < 9; i++) {
          await RoyaltiesProvider.initializeProvider(
            await LandAsAdmin.getAddress(),
            await QuadHelper.idInPath(i, 3, 0, 3),
            [await LibPartData(royaltyReceiver2, 2000)] // royalty is set to 20% of the amount for quad(0,3)
          );
        }

        await RoyaltiesRegistryAsDeployer.setProviderByToken(
          await LandAsAdmin.getAddress(),
          RoyaltiesProvider.getAddress()
        );

        orderLeft = await OrderDefault(
          maker, // ERC20
          makerAsset,
          ZeroAddress,
          takerAsset, // Bundle
          1,
          0,
          0
        );
        orderRight = await OrderDefault(
          taker,
          takerAsset, // Bundle
          ZeroAddress,
          makerAsset, // ERC20
          1,
          0,
          0
        );

        makerSig = await signOrder(orderLeft, maker, OrderValidatorAsAdmin);
        takerSig = await signOrder(orderRight, taker, OrderValidatorAsAdmin);

        const makerAddress = await maker.getAddress();
        const takerAddress = await taker.getAddress();

        expect(await ERC20Contract.balanceOf(makerAddress)).to.be.equal(
          30000000000
        );
        expect(await ERC20Contract.balanceOf(takerAddress)).to.be.equal(0);
        expect(await ERC20Contract2.balanceOf(makerAddress)).to.be.equal(0);
        expect(await ERC20Contract2.balanceOf(takerAddress)).to.be.equal(
          40000000000
        );
        expect(await ERC721Contract.ownerOf(1)).to.be.equal(takerAddress);
        expect(await ERC1155Contract.balanceOf(takerAddress, 1)).to.be.equal(
          50
        );
        expect(await ERC1155Contract.balanceOf(makerAddress, 1)).to.be.equal(0);

        await ExchangeContractAsUser.matchOrders([
          {
            orderLeft, // passing ERC20 as left order
            signatureLeft: makerSig,
            orderRight, // passing Bundle as right order
            signatureRight: takerSig,
          },
        ]);
        expect(await ERC1155Contract.balanceOf(makerAddress, 1)).to.be.equal(
          10
        );
        expect(await ERC721Contract.ownerOf(1)).to.be.equal(makerAddress);
        expect(await ERC1155Contract.balanceOf(takerAddress, 1)).to.be.equal(
          40
        );

        expect(
          await ExchangeContractAsUser.fills(hashKey(orderLeft))
        ).to.be.equal(1);
        expect(
          await ExchangeContractAsUser.fills(hashKey(orderRight))
        ).to.be.equal(10000000000);

        expect(await ERC20Contract.balanceOf(takerAddress)).to.be.equal(
          9590000000 // 10000000000 - protocolFee - royalty
        );

        expect(await ERC20Contract.balanceOf(makerAddress)).to.be.equal(
          20000000000
        );
        expect(await ERC20Contract2.balanceOf(makerAddress)).to.be.equal(
          20000000000
        );
        expect(await ERC20Contract2.balanceOf(takerAddress)).to.be.equal(
          20000000000
        );

        // check paid royalty
        expect(
          await ERC20Contract.balanceOf(royaltyReceiver.getAddress())
        ).to.be.equal(40000000); // 10% of asset price for quad(3,0)
        expect(
          await ERC20Contract.balanceOf(royaltyReceiver2.getAddress())
        ).to.be.equal(120000000); // 20% of asset price for quad(0,3)

        // check protocol fee -> 250 * 10000000000 / 10000 = 250000000
        expect(
          await ERC20Contract.balanceOf(await defaultFeeReceiver.getAddress())
        ).to.be.equal(
          (Number(protocolFeeSecondary) * Number(makerAsset.value)) / 10000
        );

        // check maker received quads
        expect(await LandContract.balanceOf(takerAddress)).to.be.equal(18);
        expect(await LandContract.balanceOf(makerAddress)).to.be.equal(18);
      });

      it('should execute complete match order for bundle with multiple external royalty receivers', async function () {
        quads = {
          sizes: [3, 3], // 3x3, 3x3 = 9+9 lands total
          xs: [3, 0],
          ys: [0, 3],
          data: '0x',
        };

        priceDistribution = {
          erc20Prices: [3000000000],
          erc721Prices: [[1000000000]],
          erc1155Prices: [[500000000]],
          quadPrices: [400000000, 600000000],
        };

        // Create bundle for passing as right order
        bundleData = {
          bundledERC20,
          bundledERC721,
          bundledERC1155,
          quads,
          priceDistribution,
        };

        takerAsset = await AssetBundle(bundleData, 1);

        // set up royalties by token for ERC721 token
        await RoyaltiesRegistryAsDeployer.setRoyaltiesByToken(
          await ERC721Contract.getAddress(),
          [await LibPartData(royaltyReceiver, 1000)] // 10% royalty for ERC721 token
        );

        // configuring royalties for ERC1155 tokens
        await RoyaltiesProvider.initializeProvider(
          await ERC1155Contract.getAddress(),
          1,
          [await LibPartData(royaltyReceiver2, 1000)] // 10% royalty for ERC1155 token with id 1
        );
        await RoyaltiesRegistryAsDeployer.setProviderByToken(
          await ERC1155Contract.getAddress(),
          RoyaltiesProvider.getAddress()
        );

        // set up royalties by token for quad
        await RoyaltiesRegistryAsDeployer.setRoyaltiesByToken(
          await LandAsAdmin.getAddress(),
          [await LibPartData(royaltyReceiver3, 1000)] // 10% royalty for Land token
        );

        orderLeft = await OrderDefault(
          maker, // ERC20
          makerAsset,
          ZeroAddress,
          takerAsset, // Bundle
          1,
          0,
          0
        );
        orderRight = await OrderDefault(
          taker,
          takerAsset, // Bundle
          ZeroAddress,
          makerAsset, // ERC20
          1,
          0,
          0
        );

        makerSig = await signOrder(orderLeft, maker, OrderValidatorAsAdmin);
        takerSig = await signOrder(orderRight, taker, OrderValidatorAsAdmin);

        const makerAddress = await maker.getAddress();
        const takerAddress = await taker.getAddress();

        expect(await ERC20Contract.balanceOf(makerAddress)).to.be.equal(
          30000000000
        );
        expect(await ERC20Contract.balanceOf(takerAddress)).to.be.equal(0);
        expect(await ERC20Contract2.balanceOf(makerAddress)).to.be.equal(0);
        expect(await ERC20Contract2.balanceOf(takerAddress)).to.be.equal(
          40000000000
        );
        expect(await ERC721Contract.ownerOf(1)).to.be.equal(takerAddress);
        expect(await ERC1155Contract.balanceOf(takerAddress, 1)).to.be.equal(
          50
        );
        expect(await ERC1155Contract.balanceOf(makerAddress, 1)).to.be.equal(0);

        await ExchangeContractAsUser.matchOrders([
          {
            orderLeft, // passing ERC20 as left order
            signatureLeft: makerSig,
            orderRight, // passing Bundle as right order
            signatureRight: takerSig,
          },
        ]);
        expect(await ERC1155Contract.balanceOf(makerAddress, 1)).to.be.equal(
          10
        );
        expect(await ERC721Contract.ownerOf(1)).to.be.equal(makerAddress);
        expect(await ERC1155Contract.balanceOf(takerAddress, 1)).to.be.equal(
          40
        );

        expect(
          await ExchangeContractAsUser.fills(hashKey(orderLeft))
        ).to.be.equal(1);
        expect(
          await ExchangeContractAsUser.fills(hashKey(orderRight))
        ).to.be.equal(10000000000);

        expect(await ERC20Contract.balanceOf(takerAddress)).to.be.equal(
          9500000000 // 10000000000 - protocolFee - royalty
        );

        expect(await ERC20Contract.balanceOf(makerAddress)).to.be.equal(
          20000000000
        );
        expect(await ERC20Contract2.balanceOf(makerAddress)).to.be.equal(
          20000000000
        );
        expect(await ERC20Contract2.balanceOf(takerAddress)).to.be.equal(
          20000000000
        );

        // check paid royalty
        expect(
          await ERC20Contract.balanceOf(royaltyReceiver.getAddress())
        ).to.be.equal(100000000); // 10% of the amount
        expect(
          await ERC20Contract.balanceOf(royaltyReceiver2.getAddress())
        ).to.be.equal(50000000); // 10% of asset price for ERC1155 token with id:1
        expect(
          await ERC20Contract.balanceOf(royaltyReceiver3.getAddress())
        ).to.be.equal(100000000); // 10% of asset price for quad (3,0) & (0,3)

        // check protocol fee -> 250 * 10000000000 / 10000 = 250000000
        expect(
          await ERC20Contract.balanceOf(await defaultFeeReceiver.getAddress())
        ).to.be.equal(
          (Number(protocolFeeSecondary) * Number(makerAsset.value)) / 10000
        );

        // check maker received quads
        expect(await LandContract.balanceOf(takerAddress)).to.be.equal(18);
        expect(await LandContract.balanceOf(makerAddress)).to.be.equal(18);
      });
    });
  });
}
