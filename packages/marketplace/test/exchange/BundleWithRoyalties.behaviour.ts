import {expect} from 'chai';
import {deployFixtures} from '../fixtures/index.ts';
import {loadFixture} from '@nomicfoundation/hardhat-network-helpers';
import {
  AssetERC20,
  Asset,
  AssetBundle,
  LibPartData,
  BundledERC721,
  BundledERC1155,
  Quads,
  BundleData,
  PriceDistribution,
  FeeRecipientsData,
} from '../utils/assets.ts';

import {hashKey, OrderDefault, signOrder, Order} from '../utils/order.ts';
import {ZeroAddress, Contract, Signer} from 'ethers';

function calculateFinalPrice(
  priceDistribution: PriceDistribution,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protocolFees: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  royaltyFees: any
): number {
  let finalPrice = 0;

  // ERC721 assets
  for (let i = 0; i < priceDistribution.erc721Prices.length; i++) {
    for (let j = 0; j < priceDistribution.erc721Prices[i].length; j++) {
      const assetPrice = priceDistribution.erc721Prices[i][j];
      const protocolFee = protocolFees.erc721ProtocolFees[i][j];
      const royaltyFee = royaltyFees.erc721RoyaltyFees[i][j];

      const deductedProtocolFee = (assetPrice * protocolFee) / 10000;
      const deductedRoyaltyFee = (assetPrice * royaltyFee) / 100;

      finalPrice += assetPrice - deductedProtocolFee - deductedRoyaltyFee;
    }
  }

  // ERC1155 assets
  for (let i = 0; i < priceDistribution.erc1155Prices.length; i++) {
    for (let j = 0; j < priceDistribution.erc1155Prices[i].length; j++) {
      const assetPrice = priceDistribution.erc1155Prices[i][j];
      const protocolFee = protocolFees.erc1155ProtocolFees[i][j];
      const royaltyFee = royaltyFees.erc1155RoyaltyFees[i][j];

      const deductedProtocolFee = (assetPrice * protocolFee) / 10000;
      const deductedRoyaltyFee = (assetPrice * royaltyFee) / 100;

      finalPrice += assetPrice - deductedProtocolFee - deductedRoyaltyFee;
    }
  }

  // Quad assets
  for (let i = 0; i < priceDistribution.quadPrices.length; i++) {
    const assetPrice = priceDistribution.quadPrices[i];
    const protocolFee = protocolFees.quadProtocolFees[i];
    const royaltyFee = royaltyFees.quadRoyaltyFees[i];

    const deductedProtocolFee = (assetPrice * protocolFee) / 10000;
    const deductedRoyaltyFee = (assetPrice * royaltyFee) / 100;

    finalPrice += assetPrice - deductedProtocolFee - deductedRoyaltyFee;
  }

  return finalPrice;
}

// eslint-disable-next-line mocha/no-exports
export function shouldMatchOrdersForBundleWithRoyalty() {
  describe('Exchange MatchOrders for Bundle with royalty', function () {
    let ExchangeContractAsUser: Contract,
      ExchangeContractAsAdmin: Contract,
      OrderValidatorAsAdmin: Contract,
      RoyaltiesRegistryAsDeployer: Contract,
      ERC20Contract: Contract,
      ERC721Contract: Contract,
      ERC721WithRoyaltyV2981: Contract,
      ERC1155WithRoyaltyV2981: Contract,
      ERC1155Contract: Contract,
      LandContract: Contract,
      RoyaltiesProvider: Contract,
      LandAsAdmin: Contract,
      QuadHelper: Contract,
      protocolFeePrimary: number,
      defaultFeeReceiver: Signer,
      maker: Signer,
      taker: Signer,
      landAdmin: Signer,
      royaltyReceiver: Signer,
      royaltyReceiver2: Signer,
      royaltyReceiver3: Signer,
      makerAsset: Asset,
      takerAsset: Asset,
      bundleWithoutERC721Left: Asset,
      bundleWithoutERC721Right: Asset,
      priceDistribution: PriceDistribution,
      bundledERC721: BundledERC721,
      bundledERC1155: BundledERC1155,
      quads: Quads,
      bundleData: BundleData,
      orderLeft: Order,
      orderRight: Order,
      makerSig: string,
      takerSig: string,
      TSB_PRIMARY_MARKET_SELLER_ROLE: string,
      TSB_SECONDARY_MARKET_SELLER_ROLE: string;

    describe('Bundle in primary market', function () {
      beforeEach(async function () {
        ({
          ExchangeContractAsUser,
          ExchangeContractAsAdmin,
          OrderValidatorAsAdmin,
          RoyaltiesRegistryAsDeployer,
          LandAsAdmin,
          ERC20Contract,
          ERC721Contract,
          ERC721WithRoyaltyV2981,
          ERC1155Contract,
          ERC1155WithRoyaltyV2981,
          LandContract,
          RoyaltiesProvider,
          protocolFeePrimary,
          defaultFeeReceiver,
          deployer: maker,
          user2: taker,
          admin: royaltyReceiver,
          user: royaltyReceiver2,
          landAdmin,
          TSB_PRIMARY_MARKET_SELLER_ROLE,
          TSB_SECONDARY_MARKET_SELLER_ROLE,
        } = await loadFixture(deployFixtures));

        priceDistribution = {
          erc721Prices: [[4000000000]],
          erc1155Prices: [[6000000000]],
          quadPrices: [],
        };

        // Set up ERC721 for maker
        await ERC721Contract.mint(await maker.getAddress(), 1);
        await ERC721Contract.connect(maker).approve(
          await ExchangeContractAsUser.getAddress(),
          1
        );

        // Set up ERC721 for maker in primary markt
        await ERC721WithRoyaltyV2981.mint(await maker.getAddress(), 1, [
          await FeeRecipientsData(maker.getAddress(), 10000),
        ]);
        await ERC721WithRoyaltyV2981.connect(maker).approve(
          await ExchangeContractAsUser.getAddress(),
          1
        );

        // Set up ERC1155 for maker
        await ERC1155Contract.mint(await maker.getAddress(), 1, 50);
        await ERC1155Contract.mint(await maker.getAddress(), 2, 50);

        await ERC1155Contract.connect(maker).setApprovalForAll(
          await ExchangeContractAsUser.getAddress(),
          true
        );

        // Set up ERC1155 for maker in primary markt
        await ERC1155WithRoyaltyV2981.mint(await maker.getAddress(), 1, 50, [
          await FeeRecipientsData(maker.getAddress(), 10000),
        ]);
        await ERC1155WithRoyaltyV2981.connect(maker).setApprovalForAll(
          await ExchangeContractAsUser.getAddress(),
          true
        );

        // Make sure the land contract address is set on the Exchange
        const landContractAddress = await LandContract.getAddress();
        await ExchangeContractAsAdmin.setLandContract(landContractAddress);

        // Land contract setup for maker -------------------------------------------------------------

        // Set a minter
        await LandAsAdmin.setMinter(await landAdmin.getAddress(), true);

        // Ensure that the marketplace contract is an approved operator for mock land contract
        await LandContract.connect(maker).setApprovalForAllWithOutFilter(
          await ExchangeContractAsUser.getAddress(),
          true
        );

        await LandAsAdmin.mintQuad(await maker.getAddress(), 3, 0, 0, '0x');
        await LandAsAdmin.mintQuad(await maker.getAddress(), 3, 0, 3, '0x');
        await LandAsAdmin.mintQuad(await maker.getAddress(), 3, 3, 0, '0x');
        await LandAsAdmin.mintQuad(await maker.getAddress(), 3, 3, 3, '0x');
        expect(
          await LandContract.balanceOf(await maker.getAddress())
        ).to.be.equal(36);

        // End land setup for maker ------------------------------------------------------------------

        // Set up ERC20 for taker
        await ERC20Contract.mint(await taker.getAddress(), 30000000000);
        await ERC20Contract.connect(taker).approve(
          await ExchangeContractAsUser.getAddress(),
          30000000000
        );

        // Construct takerAsset
        takerAsset = await AssetERC20(ERC20Contract, 10000000000);
      });

      it('should execute complete match order for bundle with ERC721, ERC1155 & Quads in primary market without royalty for TSB_PRIMARY_MARKET_SELLER', async function () {
        // Construct makerAsset bundle
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

        priceDistribution = {
          erc721Prices: [[4000000000]],
          erc1155Prices: [[5000000000]],
          quadPrices: [400000000, 600000000],
        };

        // Create bundle for passing as left order
        bundleData = {
          bundledERC721,
          bundledERC1155,
          quads,
          priceDistribution,
        };

        makerAsset = await AssetBundle(bundleData, 1);

        // set up royalties by token for ERC721 token
        await RoyaltiesRegistryAsDeployer.setRoyaltiesByToken(
          await ERC721Contract.getAddress(),
          [await LibPartData(royaltyReceiver, 1000)] // 10% royalty for ERC721 token
        );

        // configuring royalties for ERC1155 tokens
        await RoyaltiesProvider.initializeProvider(
          await ERC1155Contract.getAddress(),
          1,
          [await LibPartData(royaltyReceiver, 1000)] // 10% royalty for ERC1155 token with id 1
        );
        await RoyaltiesRegistryAsDeployer.setProviderByToken(
          await ERC1155Contract.getAddress(),
          RoyaltiesProvider.getAddress()
        );

        // set up royalties by token for quad
        await RoyaltiesRegistryAsDeployer.setRoyaltiesByToken(
          await LandAsAdmin.getAddress(),
          [await LibPartData(royaltyReceiver, 1000)] // 10% royalty for Land token
        );

        // grant tsb primary market seller role to maker
        await ExchangeContractAsAdmin.grantRole(
          TSB_PRIMARY_MARKET_SELLER_ROLE,
          await maker.getAddress()
        );

        orderLeft = await OrderDefault(
          maker,
          makerAsset, // Bundle
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

        expect(await ERC721Contract.ownerOf(1)).to.be.equal(makerAddress);
        expect(await ERC20Contract.balanceOf(makerAddress)).to.be.equal(0);
        expect(await ERC20Contract.balanceOf(takerAddress)).to.be.equal(
          30000000000
        );

        expect(await ERC1155Contract.balanceOf(makerAddress, 1)).to.be.equal(
          50
        );
        expect(await ERC1155Contract.balanceOf(takerAddress, 1)).to.be.equal(0);

        await ExchangeContractAsAdmin.matchOrders([
          {
            orderLeft, // passing Bundle as left order
            signatureLeft: makerSig,
            orderRight, // passing ERC20 as right order
            signatureRight: takerSig,
          },
        ]);

        expect(await ERC721Contract.ownerOf(1)).to.be.equal(takerAddress);
        expect(await ERC1155Contract.balanceOf(makerAddress, 1)).to.be.equal(
          40
        );
        expect(await ERC1155Contract.balanceOf(takerAddress, 1)).to.be.equal(
          10
        );

        expect(
          await ExchangeContractAsUser.fills(hashKey(orderLeft))
        ).to.be.equal(10000000000);
        expect(
          await ExchangeContractAsUser.fills(hashKey(orderRight))
        ).to.be.equal(1);

        const protocolFees = {
          erc721ProtocolFees: [[protocolFeePrimary]],
          erc1155ProtocolFees: [[protocolFeePrimary]],
          quadProtocolFees: [protocolFeePrimary, protocolFeePrimary],
        };

        const royaltyFees = {
          erc721RoyaltyFees: [[0]],
          erc1155RoyaltyFees: [[0]],
          quadRoyaltyFees: [0, 0],
        };

        const expectedFinalReturn = calculateFinalPrice(
          priceDistribution,
          protocolFees,
          royaltyFees
        );

        expect(await ERC20Contract.balanceOf(makerAddress)).to.be.equal(
          expectedFinalReturn // 10000000000 - protocolFee - royalty
        );

        expect(await ERC20Contract.balanceOf(takerAddress)).to.be.equal(
          20000000000
        );

        // no royalties paid
        expect(
          await ERC20Contract.balanceOf(royaltyReceiver.getAddress())
        ).to.be.equal(0);

        // check protocol fee
        expect(
          await ERC20Contract.balanceOf(await defaultFeeReceiver.getAddress())
        ).to.be.equal(
          (Number(protocolFeePrimary) *
            Number(priceDistribution.erc721Prices[0][0]) +
            Number(protocolFeePrimary) *
              Number(priceDistribution.erc1155Prices[0][0]) +
            Number(protocolFeePrimary) *
              Number(priceDistribution.quadPrices[0]) +
            Number(protocolFeePrimary) *
              Number(priceDistribution.quadPrices[1])) /
            10000
        );

        // check maker received quads
        expect(await LandContract.balanceOf(takerAddress)).to.be.equal(18);
        expect(await LandContract.balanceOf(makerAddress)).to.be.equal(18);
      });

      it('should not execute match order for bundle with ERC721 & ERC1155 for regular user in secondary market', async function () {
        // Construct makerAsset bundle
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

        // Create bundle for passing as left order
        bundleData = {
          bundledERC721,
          bundledERC1155,
          quads,
          priceDistribution,
        };

        makerAsset = await AssetBundle(bundleData, 1); // there can only ever be 1 copy of a bundle that contains ERC721

        // set up royalties by token
        await RoyaltiesRegistryAsDeployer.setRoyaltiesByToken(
          await ERC721Contract.getAddress(),
          [await LibPartData(royaltyReceiver, 1000)] // 10% royalty for ERC721 token
        );

        // configuring royalties
        await RoyaltiesProvider.initializeProvider(
          await ERC1155Contract.getAddress(),
          1,
          [await LibPartData(royaltyReceiver, 1000)] // 10% royalty for ERC1155 token with id:1
        );

        await RoyaltiesRegistryAsDeployer.setProviderByToken(
          await ERC1155Contract.getAddress(),
          RoyaltiesProvider.getAddress()
        );

        orderLeft = await OrderDefault(
          maker,
          makerAsset, // Bundle
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

        expect(await ERC20Contract.balanceOf(makerAddress)).to.be.equal(0);
        expect(await ERC20Contract.balanceOf(takerAddress)).to.be.equal(
          30000000000
        );

        expect(await ERC721Contract.ownerOf(1)).to.be.equal(makerAddress);
        expect(await ERC1155Contract.balanceOf(makerAddress, 1)).to.be.equal(
          50
        );
        expect(await ERC1155Contract.balanceOf(takerAddress, 1)).to.be.equal(0);

        await expect(
          ExchangeContractAsUser.matchOrders([
            {
              orderLeft, // passing Bundle as left order
              signatureLeft: makerSig,
              orderRight, // passing ERC20 as right order
              signatureRight: takerSig,
            },
          ])
        ).to.be.revertedWith('not TSB secondary market seller');
      });

      it('should not execute match order for bundle with quad for creator', async function () {
        // Construct makerAsset bundle
        bundledERC721 = [
          {
            erc721Address: ERC721WithRoyaltyV2981.target,
            ids: [1],
          },
        ];

        bundledERC1155 = [
          {
            erc1155Address: ERC1155WithRoyaltyV2981.target,
            ids: [1],
            supplies: [10],
          },
        ];

        quads = {
          sizes: [3, 3],
          xs: [3, 0],
          ys: [0, 3],
          data: '0x',
        }; // non empty quads

        priceDistribution = {
          erc721Prices: [[4000000000]],
          erc1155Prices: [[5000000000]],
          quadPrices: [400000000, 600000000],
        };

        // Create bundle for passing as left order
        bundleData = {
          bundledERC721,
          bundledERC1155,
          quads,
          priceDistribution,
        };

        makerAsset = await AssetBundle(bundleData, 1); // there can only ever be 1 copy of a bundle that contains ERC721

        // set up royalties by token
        await RoyaltiesRegistryAsDeployer.setRoyaltiesByToken(
          await ERC721WithRoyaltyV2981.getAddress(),
          [await LibPartData(royaltyReceiver, 1000)] // 10% royalty for ERC721 token
        );

        // configuring royalties
        await RoyaltiesProvider.initializeProvider(
          await ERC1155WithRoyaltyV2981.getAddress(),
          1,
          [await LibPartData(royaltyReceiver, 1000)] // 10% royalty for ERC1155 token with id:1
        );

        await RoyaltiesRegistryAsDeployer.setProviderByToken(
          await ERC1155Contract.getAddress(),
          RoyaltiesProvider.getAddress()
        );

        orderLeft = await OrderDefault(
          maker,
          makerAsset, // Bundle
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

        expect(await ERC20Contract.balanceOf(makerAddress)).to.be.equal(0);
        expect(await ERC20Contract.balanceOf(takerAddress)).to.be.equal(
          30000000000
        );

        expect(await ERC721WithRoyaltyV2981.ownerOf(1)).to.be.equal(
          makerAddress
        );
        expect(
          await ERC1155WithRoyaltyV2981.balanceOf(makerAddress, 1)
        ).to.be.equal(50);
        expect(
          await ERC1155WithRoyaltyV2981.balanceOf(takerAddress, 1)
        ).to.be.equal(0);

        await expect(
          ExchangeContractAsUser.matchOrders([
            {
              orderLeft, // passing Bundle as left order
              signatureLeft: makerSig,
              orderRight, // passing ERC20 as right order
              signatureRight: takerSig,
            },
          ])
        ).to.be.revertedWith('not TSB secondary market seller');
      });

      it('should execute complete match order for bundle with ERC721 & ERC1155 assets without royalties but with primary market fees for creator', async function () {
        // Construct makerAsset bundle
        bundledERC721 = [
          {
            erc721Address: ERC721WithRoyaltyV2981.target,
            ids: [1],
          },
        ];

        bundledERC1155 = [
          {
            erc1155Address: ERC1155WithRoyaltyV2981.target,
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

        // Create bundle for passing as left order
        bundleData = {
          bundledERC721,
          bundledERC1155,
          quads,
          priceDistribution,
        };

        makerAsset = await AssetBundle(bundleData, 1); // there can only ever be 1 copy of a bundle that contains ERC721

        // set up royalties by token
        await RoyaltiesRegistryAsDeployer.setRoyaltiesByToken(
          await ERC721WithRoyaltyV2981.getAddress(),
          [await LibPartData(royaltyReceiver, 1000)] // 10% royalty for ERC721 token
        );

        // configuring royalties
        await RoyaltiesProvider.initializeProvider(
          await ERC1155WithRoyaltyV2981.getAddress(),
          1,
          [await LibPartData(royaltyReceiver, 1000)] // 10% royalty for ERC1155 token with id:1
        );

        await RoyaltiesRegistryAsDeployer.setProviderByToken(
          await ERC1155Contract.getAddress(),
          RoyaltiesProvider.getAddress()
        );

        orderLeft = await OrderDefault(
          maker,
          makerAsset, // Bundle
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

        expect(await ERC20Contract.balanceOf(makerAddress)).to.be.equal(0);
        expect(await ERC20Contract.balanceOf(takerAddress)).to.be.equal(
          30000000000
        );

        expect(await ERC721WithRoyaltyV2981.ownerOf(1)).to.be.equal(
          makerAddress
        );
        expect(
          await ERC1155WithRoyaltyV2981.balanceOf(makerAddress, 1)
        ).to.be.equal(50);
        expect(
          await ERC1155WithRoyaltyV2981.balanceOf(takerAddress, 1)
        ).to.be.equal(0);

        await ExchangeContractAsUser.matchOrders([
          {
            orderLeft, // passing Bundle as left order
            signatureLeft: makerSig,
            orderRight, // passing ERC20 as right order
            signatureRight: takerSig,
          },
        ]);

        expect(await ERC721WithRoyaltyV2981.ownerOf(1)).to.be.equal(
          takerAddress
        );
        expect(
          await ERC1155WithRoyaltyV2981.balanceOf(makerAddress, 1)
        ).to.be.equal(40);
        expect(
          await ERC1155WithRoyaltyV2981.balanceOf(takerAddress, 1)
        ).to.be.equal(10);

        expect(
          await ExchangeContractAsUser.fills(hashKey(orderLeft))
        ).to.be.equal(10000000000);
        expect(
          await ExchangeContractAsUser.fills(hashKey(orderRight))
        ).to.be.equal(1);

        const protocolFees = {
          erc721ProtocolFees: [[protocolFeePrimary]],
          erc1155ProtocolFees: [[protocolFeePrimary]],
          quadProtocolFees: [],
        };

        const royaltyFees = {
          erc721RoyaltyFees: [[0]],
          erc1155RoyaltyFees: [[0]],
          quadRoyaltyFees: [],
        };

        const expectedFinalReturn = calculateFinalPrice(
          priceDistribution,
          protocolFees,
          royaltyFees
        );

        expect(await ERC20Contract.balanceOf(makerAddress)).to.be.equal(
          expectedFinalReturn // 10000000000 - protocolFee
        );

        expect(await ERC20Contract.balanceOf(takerAddress)).to.be.equal(
          20000000000
        );

        // protocol fee paid in primary market
        expect(
          await ERC20Contract.balanceOf(defaultFeeReceiver.getAddress())
        ).to.be.equal(
          (Number(protocolFeePrimary) * Number(takerAsset.value)) / 10000
        );

        // no royalties paid
        expect(
          await ERC20Contract.balanceOf(royaltyReceiver.getAddress())
        ).to.be.equal(0);
      });

      it('should execute complete match order for bundle with ERC721 asset in primary market and ERC1155 asset in secondary market for TSB_SECONDARY_MARKET_SELLER', async function () {
        // Construct makerAsset bundle
        bundledERC721 = [
          {
            erc721Address: ERC721WithRoyaltyV2981.target,
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

        // Create bundle for passing as left order
        bundleData = {
          bundledERC721,
          bundledERC1155,
          quads,
          priceDistribution,
        };

        makerAsset = await AssetBundle(bundleData, 1); // there can only ever be 1 copy of a bundle that contains ERC721

        // set up royalties by token
        await RoyaltiesRegistryAsDeployer.setRoyaltiesByToken(
          await ERC721WithRoyaltyV2981.getAddress(),
          [await LibPartData(royaltyReceiver, 1000)] // 10% royalty for ERC721 token
        );

        // configuring royalties
        await RoyaltiesProvider.initializeProvider(
          await ERC1155Contract.getAddress(),
          1,
          [await LibPartData(royaltyReceiver, 1000)] // 5% royalty for ERC1155 token with id:1
        );

        await RoyaltiesRegistryAsDeployer.setProviderByToken(
          await ERC1155Contract.getAddress(),
          RoyaltiesProvider.getAddress()
        );

        // grant tsb secondary market seller role to maker
        await ExchangeContractAsAdmin.grantRole(
          TSB_SECONDARY_MARKET_SELLER_ROLE,
          await maker.getAddress()
        );

        orderLeft = await OrderDefault(
          maker,
          makerAsset, // Bundle
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

        expect(await ERC20Contract.balanceOf(makerAddress)).to.be.equal(0);
        expect(await ERC20Contract.balanceOf(takerAddress)).to.be.equal(
          30000000000
        );

        expect(await ERC721WithRoyaltyV2981.ownerOf(1)).to.be.equal(
          makerAddress
        );
        expect(await ERC1155Contract.balanceOf(makerAddress, 1)).to.be.equal(
          50
        );
        expect(await ERC1155Contract.balanceOf(takerAddress, 1)).to.be.equal(0);

        await ExchangeContractAsAdmin.matchOrders([
          {
            orderLeft, // passing Bundle as left order
            signatureLeft: makerSig,
            orderRight, // passing ERC20 as right order
            signatureRight: takerSig,
          },
        ]);

        expect(await ERC721WithRoyaltyV2981.ownerOf(1)).to.be.equal(
          takerAddress
        );
        expect(await ERC1155Contract.balanceOf(makerAddress, 1)).to.be.equal(
          40
        );
        expect(await ERC1155Contract.balanceOf(takerAddress, 1)).to.be.equal(
          10
        );

        expect(
          await ExchangeContractAsUser.fills(hashKey(orderLeft))
        ).to.be.equal(10000000000);
        expect(
          await ExchangeContractAsUser.fills(hashKey(orderRight))
        ).to.be.equal(1);

        const protocolFees = {
          erc721ProtocolFees: [[protocolFeePrimary]],
          erc1155ProtocolFees: [[protocolFeePrimary]],
          quadProtocolFees: [],
        };

        const royaltyFees = {
          erc721RoyaltyFees: [[0]],
          erc1155RoyaltyFees: [[10]],
          quadRoyaltyFees: [],
        };

        const expectedFinalReturn = calculateFinalPrice(
          priceDistribution,
          protocolFees,
          royaltyFees
        );

        expect(await ERC20Contract.balanceOf(makerAddress)).to.be.equal(
          expectedFinalReturn // 10000000000 - protocolFee - royalty
        );

        expect(await ERC20Contract.balanceOf(takerAddress)).to.be.equal(
          20000000000
        );

        // check protocol fee
        expect(
          await ERC20Contract.balanceOf(defaultFeeReceiver.getAddress())
        ).to.be.equal(
          (Number(protocolFeePrimary) *
            Number(priceDistribution.erc721Prices[0][0]) +
            Number(protocolFeePrimary) *
              Number(priceDistribution.erc1155Prices[0][0])) /
            10000
        );

        // check paid royalty
        expect(
          await ERC20Contract.balanceOf(royaltyReceiver.getAddress())
        ).to.be.equal(600000000); // 10% of asset price for ERC1155 token with id:1
      });

      it('should execute complete match order for bundle with ERC721 asset in secondary market and ERC1155 asset in primary market for TSB_SECONDARY_MARKET_SELLER', async function () {
        // Construct makerAsset bundle
        bundledERC721 = [
          {
            erc721Address: ERC721Contract.target,
            ids: [1],
          },
        ];

        bundledERC1155 = [
          {
            erc1155Address: ERC1155WithRoyaltyV2981.target,
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

        // Create bundle for passing as left order
        bundleData = {
          bundledERC721,
          bundledERC1155,
          quads,
          priceDistribution,
        };

        makerAsset = await AssetBundle(bundleData, 1); // there can only ever be 1 copy of a bundle that contains ERC721

        // set up royalties by token
        await RoyaltiesRegistryAsDeployer.setRoyaltiesByToken(
          await ERC721Contract.getAddress(),
          [await LibPartData(royaltyReceiver, 1000)] // 10% royalty for ERC721 token
        );

        // configuring royalties
        await RoyaltiesProvider.initializeProvider(
          await ERC1155WithRoyaltyV2981.getAddress(),
          1,
          [await LibPartData(royaltyReceiver, 1000)] // 10% royalty for ERC1155 token with id:1
        );

        await RoyaltiesRegistryAsDeployer.setProviderByToken(
          await ERC1155WithRoyaltyV2981.getAddress(),
          RoyaltiesProvider.getAddress()
        );

        // grant tsb secondary market seller role to maker
        await ExchangeContractAsAdmin.grantRole(
          TSB_SECONDARY_MARKET_SELLER_ROLE,
          await maker.getAddress()
        );

        orderLeft = await OrderDefault(
          maker,
          makerAsset, // Bundle
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

        expect(await ERC20Contract.balanceOf(makerAddress)).to.be.equal(0);
        expect(await ERC20Contract.balanceOf(takerAddress)).to.be.equal(
          30000000000
        );

        expect(await ERC721Contract.ownerOf(1)).to.be.equal(makerAddress);
        expect(
          await ERC1155WithRoyaltyV2981.balanceOf(makerAddress, 1)
        ).to.be.equal(50);
        expect(
          await ERC1155WithRoyaltyV2981.balanceOf(takerAddress, 1)
        ).to.be.equal(0);

        await ExchangeContractAsAdmin.matchOrders([
          {
            orderLeft, // passing Bundle as left order
            signatureLeft: makerSig,
            orderRight, // passing ERC20 as right order
            signatureRight: takerSig,
          },
        ]);

        expect(await ERC721Contract.ownerOf(1)).to.be.equal(takerAddress);
        expect(
          await ERC1155WithRoyaltyV2981.balanceOf(makerAddress, 1)
        ).to.be.equal(40);
        expect(
          await ERC1155WithRoyaltyV2981.balanceOf(takerAddress, 1)
        ).to.be.equal(10);

        expect(
          await ExchangeContractAsUser.fills(hashKey(orderLeft))
        ).to.be.equal(10000000000);
        expect(
          await ExchangeContractAsUser.fills(hashKey(orderRight))
        ).to.be.equal(1);

        const protocolFees = {
          erc721ProtocolFees: [[protocolFeePrimary]],
          erc1155ProtocolFees: [[protocolFeePrimary]],
          quadProtocolFees: [],
        };

        const royaltyFees = {
          erc721RoyaltyFees: [[10]],
          erc1155RoyaltyFees: [[0]],
          quadRoyaltyFees: [],
        };

        const expectedFinalReturn = calculateFinalPrice(
          priceDistribution,
          protocolFees,
          royaltyFees
        );

        expect(await ERC20Contract.balanceOf(makerAddress)).to.be.equal(
          expectedFinalReturn // 10000000000 - protocolFee - royalty
        );

        expect(await ERC20Contract.balanceOf(takerAddress)).to.be.equal(
          20000000000
        );

        // check protocol fee
        expect(
          await ERC20Contract.balanceOf(defaultFeeReceiver.getAddress())
        ).to.be.equal(
          (Number(protocolFeePrimary) *
            Number(priceDistribution.erc721Prices[0][0]) +
            Number(protocolFeePrimary) *
              Number(priceDistribution.erc1155Prices[0][0])) /
            10000
        );

        // check paid royalty
        expect(
          await ERC20Contract.balanceOf(royaltyReceiver.getAddress())
        ).to.be.equal(400000000); // 10% of asset price for ERC721 token with id:1
      });
    });

    describe('Royalty X Bundle', function () {
      beforeEach(async function () {
        ({
          ExchangeContractAsUser,
          ExchangeContractAsAdmin,
          OrderValidatorAsAdmin,
          RoyaltiesRegistryAsDeployer,
          LandAsAdmin,
          ERC20Contract,
          ERC721Contract,
          ERC1155Contract,
          LandContract,
          RoyaltiesProvider,
          QuadHelper,
          protocolFeePrimary,
          defaultFeeReceiver,
          user1: maker,
          user2: taker,
          deployer: royaltyReceiver,
          admin: royaltyReceiver2,
          user: royaltyReceiver3,
          landAdmin,
          TSB_SECONDARY_MARKET_SELLER_ROLE,
        } = await loadFixture(deployFixtures));

        // grant tsb secondary market seller role to maker
        await ExchangeContractAsAdmin.grantRole(
          TSB_SECONDARY_MARKET_SELLER_ROLE,
          await maker.getAddress()
        );

        priceDistribution = {
          erc721Prices: [[4000000000]],
          erc1155Prices: [[6000000000]],
          quadPrices: [],
        };

        // Set up ERC721 for maker
        await ERC721Contract.mint(await maker.getAddress(), 1);
        await ERC721Contract.connect(maker).approve(
          await ExchangeContractAsUser.getAddress(),
          1
        );
        await ERC721Contract.mint(await maker.getAddress(), 2);
        await ERC721Contract.connect(maker).approve(
          await ExchangeContractAsUser.getAddress(),
          2
        );

        // Set up ERC1155 for maker
        await ERC1155Contract.mint(await maker.getAddress(), 1, 50);
        await ERC1155Contract.mint(await maker.getAddress(), 2, 50);

        await ERC1155Contract.connect(maker).setApprovalForAll(
          await ExchangeContractAsUser.getAddress(),
          true
        );

        // Make sure the land contract address is set on the Exchange
        const landContractAddress = await LandContract.getAddress();
        await ExchangeContractAsAdmin.setLandContract(landContractAddress);

        // Land contract setup for maker -------------------------------------------------------------

        // Set a minter
        await LandAsAdmin.setMinter(await landAdmin.getAddress(), true);

        // Ensure that the marketplace contract is an approved operator for mock land contract
        await LandContract.connect(maker).setApprovalForAllWithOutFilter(
          await ExchangeContractAsUser.getAddress(),
          true
        );

        await LandAsAdmin.mintQuad(await maker.getAddress(), 3, 0, 0, '0x');
        await LandAsAdmin.mintQuad(await maker.getAddress(), 3, 0, 3, '0x');
        await LandAsAdmin.mintQuad(await maker.getAddress(), 3, 3, 0, '0x');
        await LandAsAdmin.mintQuad(await maker.getAddress(), 3, 3, 3, '0x');
        expect(
          await LandContract.balanceOf(await maker.getAddress())
        ).to.be.equal(36);

        // End land setup for maker ------------------------------------------------------------------

        // Construct makerAsset bundle
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

        // Create bundle for passing as left order
        bundleData = {
          bundledERC721,
          bundledERC1155,
          quads,
          priceDistribution,
        };

        makerAsset = await AssetBundle(bundleData, 1); // there can only ever be 1 copy of a bundle that contains ERC721

        // Set up ERC20 for taker
        await ERC20Contract.mint(await taker.getAddress(), 30000000000);
        await ERC20Contract.connect(taker).approve(
          await ExchangeContractAsUser.getAddress(),
          30000000000
        );

        // Construct takerAsset
        takerAsset = await AssetERC20(ERC20Contract, 10000000000);
      });

      it('should not execute match order for bundle if royalties are > 50% for ERC721 token', async function () {
        // set up royalties by token
        await RoyaltiesRegistryAsDeployer.setRoyaltiesByToken(
          await ERC721Contract.getAddress(),
          [await LibPartData(royaltyReceiver, 5100)] // royalty is set to 5100% of the amount
        );

        orderLeft = await OrderDefault(
          maker,
          makerAsset, // Bundle
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

        expect(await ERC20Contract.balanceOf(makerAddress)).to.be.equal(0);
        expect(await ERC20Contract.balanceOf(takerAddress)).to.be.equal(
          30000000000
        );
        expect(await ERC721Contract.ownerOf(1)).to.be.equal(makerAddress);
        expect(await ERC1155Contract.balanceOf(makerAddress, 1)).to.be.equal(
          50
        );
        expect(await ERC1155Contract.balanceOf(takerAddress, 1)).to.be.equal(0);

        await expect(
          ExchangeContractAsAdmin.matchOrders([
            {
              orderLeft, // passing Bundle as left order
              signatureLeft: makerSig,
              orderRight, // passing ERC20 as right order
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
          maker,
          makerAsset, // Bundle
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

        expect(await ERC20Contract.balanceOf(makerAddress)).to.be.equal(0);
        expect(await ERC20Contract.balanceOf(takerAddress)).to.be.equal(
          30000000000
        );

        expect(await ERC721Contract.ownerOf(1)).to.be.equal(makerAddress);
        expect(await ERC1155Contract.balanceOf(makerAddress, 1)).to.be.equal(
          50
        );
        expect(await ERC1155Contract.balanceOf(takerAddress, 1)).to.be.equal(0);

        await ExchangeContractAsAdmin.matchOrders([
          {
            orderLeft, // passing Bundle as left order
            signatureLeft: makerSig,
            orderRight, // passing ERC20 as right order
            signatureRight: takerSig,
          },
        ]);

        expect(await ERC721Contract.ownerOf(1)).to.be.equal(takerAddress);
        expect(await ERC1155Contract.balanceOf(makerAddress, 1)).to.be.equal(
          40
        );
        expect(await ERC1155Contract.balanceOf(takerAddress, 1)).to.be.equal(
          10
        );

        expect(
          await ExchangeContractAsUser.fills(hashKey(orderLeft))
        ).to.be.equal(10000000000);
        expect(
          await ExchangeContractAsUser.fills(hashKey(orderRight))
        ).to.be.equal(1);

        const protocolFees = {
          erc721ProtocolFees: [[protocolFeePrimary]],
          erc1155ProtocolFees: [[protocolFeePrimary]],
          quadProtocolFees: [],
        };

        const royaltyFees = {
          erc721RoyaltyFees: [[20]],
          erc1155RoyaltyFees: [[0]],
          quadRoyaltyFees: [],
        };

        const expectedFinalReturn = calculateFinalPrice(
          priceDistribution,
          protocolFees,
          royaltyFees
        );

        expect(await ERC20Contract.balanceOf(makerAddress)).to.be.equal(
          expectedFinalReturn // 10000000000 - royalty - protocolFee
        );

        expect(await ERC20Contract.balanceOf(takerAddress)).to.be.equal(
          20000000000
        );
        // check paid royalty
        expect(
          await ERC20Contract.balanceOf(royaltyReceiver.getAddress())
        ).to.be.equal(800000000); // 20% of asset price for ERC721 token

        // check protocol fee
        expect(
          await ERC20Contract.balanceOf(defaultFeeReceiver.getAddress())
        ).to.be.equal(
          (Number(protocolFeePrimary) *
            Number(priceDistribution.erc721Prices[0][0]) +
            Number(protocolFeePrimary) *
              Number(priceDistribution.erc1155Prices[0][0])) /
            10000
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
          erc721Prices: [[2000000000, 3000000000]],
          erc1155Prices: [[5000000000]],
          quadPrices: [],
        };

        bundleData = {
          bundledERC721,
          bundledERC1155,
          quads,
          priceDistribution,
        };

        makerAsset = await AssetBundle(bundleData, 1);

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
          maker,
          makerAsset, // Bundle
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

        expect(await ERC20Contract.balanceOf(makerAddress)).to.be.equal(0);
        expect(await ERC20Contract.balanceOf(takerAddress)).to.be.equal(
          30000000000
        );
        expect(await ERC721Contract.ownerOf(1)).to.be.equal(makerAddress);
        expect(await ERC1155Contract.balanceOf(makerAddress, 1)).to.be.equal(
          50
        );
        expect(await ERC1155Contract.balanceOf(takerAddress, 1)).to.be.equal(0);

        await ExchangeContractAsAdmin.matchOrders([
          {
            orderLeft, // passing Bundle as left order
            signatureLeft: makerSig,
            orderRight, // passing ERC20 as right order
            signatureRight: takerSig,
          },
        ]);

        expect(await ERC721Contract.ownerOf(1)).to.be.equal(takerAddress);
        expect(await ERC1155Contract.balanceOf(makerAddress, 1)).to.be.equal(
          40
        );
        expect(await ERC1155Contract.balanceOf(takerAddress, 1)).to.be.equal(
          10
        );

        expect(
          await ExchangeContractAsUser.fills(hashKey(orderLeft))
        ).to.be.equal(10000000000);
        expect(
          await ExchangeContractAsUser.fills(hashKey(orderRight))
        ).to.be.equal(1);

        const protocolFees = {
          erc721ProtocolFees: [[protocolFeePrimary, protocolFeePrimary]],
          erc1155ProtocolFees: [[protocolFeePrimary]],
          quadProtocolFees: [],
        };

        const royaltyFees = {
          erc721RoyaltyFees: [[10, 20]],
          erc1155RoyaltyFees: [[0]],
          quadRoyaltyFees: [],
        };

        const expectedFinalReturn = calculateFinalPrice(
          priceDistribution,
          protocolFees,
          royaltyFees
        );

        expect(await ERC20Contract.balanceOf(makerAddress)).to.be.equal(
          expectedFinalReturn // 10000000000 - royalty - protocolFee
        );
        expect(await ERC20Contract.balanceOf(takerAddress)).to.be.equal(
          20000000000
        );

        // check paid royalty
        expect(
          await ERC20Contract.balanceOf(royaltyReceiver.getAddress())
        ).to.be.equal(200000000); // 10% of asset price for ERC721 token with id:1
        expect(
          await ERC20Contract.balanceOf(royaltyReceiver2.getAddress())
        ).to.be.equal(600000000); // 20% of asset price for ERC721 token with id:2

        // check protocol fee
        expect(
          await ERC20Contract.balanceOf(defaultFeeReceiver.getAddress())
        ).to.be.equal(
          (Number(protocolFeePrimary) *
            Number(priceDistribution.erc721Prices[0][0]) +
            Number(protocolFeePrimary) *
              Number(priceDistribution.erc721Prices[0][1]) +
            Number(protocolFeePrimary) *
              Number(priceDistribution.erc1155Prices[0][0])) /
            10000
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
          bundledERC721,
          bundledERC1155,
          quads,
          priceDistribution,
        };

        makerAsset = await AssetBundle(bundleData, 1);

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
          maker,
          makerAsset, // Bundle
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

        expect(await ERC20Contract.balanceOf(makerAddress)).to.be.equal(0);
        expect(await ERC20Contract.balanceOf(takerAddress)).to.be.equal(
          30000000000
        );
        expect(await ERC721Contract.ownerOf(1)).to.be.equal(makerAddress);
        expect(await ERC1155Contract.balanceOf(makerAddress, 1)).to.be.equal(
          50
        );
        expect(await ERC1155Contract.balanceOf(takerAddress, 1)).to.be.equal(0);

        await expect(
          ExchangeContractAsAdmin.matchOrders([
            {
              orderLeft, // passing Bundle as left order
              signatureLeft: makerSig,
              orderRight, // passing ERC20 as right order
              signatureRight: takerSig,
            },
          ])
        ).to.be.revertedWith('royalties are too high (>50%)');
      });

      it('should execute complete match order for bundle with royalty on ERC1155 token', async function () {
        bundleData = {
          bundledERC721,
          bundledERC1155,
          quads,
          priceDistribution,
        };

        makerAsset = await AssetBundle(bundleData, 1);

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
          maker,
          makerAsset, // Bundle
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

        expect(await ERC20Contract.balanceOf(makerAddress)).to.be.equal(0);
        expect(await ERC20Contract.balanceOf(takerAddress)).to.be.equal(
          30000000000
        );
        expect(await ERC721Contract.ownerOf(1)).to.be.equal(makerAddress);
        expect(await ERC1155Contract.balanceOf(makerAddress, 1)).to.be.equal(
          50
        );
        expect(await ERC1155Contract.balanceOf(takerAddress, 1)).to.be.equal(0);

        await ExchangeContractAsAdmin.matchOrders([
          {
            orderLeft, // passing Bundle as left order
            signatureLeft: makerSig,
            orderRight, // passing ERC20 as right order
            signatureRight: takerSig,
          },
        ]);

        expect(await ERC721Contract.ownerOf(1)).to.be.equal(takerAddress);
        expect(await ERC1155Contract.balanceOf(makerAddress, 1)).to.be.equal(
          40
        );
        expect(await ERC1155Contract.balanceOf(takerAddress, 1)).to.be.equal(
          10
        );

        expect(
          await ExchangeContractAsUser.fills(hashKey(orderLeft))
        ).to.be.equal(10000000000);
        expect(
          await ExchangeContractAsUser.fills(hashKey(orderRight))
        ).to.be.equal(1);

        const protocolFees = {
          erc721ProtocolFees: [[protocolFeePrimary]],
          erc1155ProtocolFees: [[protocolFeePrimary]],
          quadProtocolFees: [],
        };

        const royaltyFees = {
          erc721RoyaltyFees: [[0]],
          erc1155RoyaltyFees: [[5]],
          quadRoyaltyFees: [],
        };

        const expectedFinalReturn = calculateFinalPrice(
          priceDistribution,
          protocolFees,
          royaltyFees
        );

        expect(await ERC20Contract.balanceOf(makerAddress)).to.be.equal(
          expectedFinalReturn // 10000000000 - royalty - protocolFee
        );
        expect(await ERC20Contract.balanceOf(takerAddress)).to.be.equal(
          20000000000
        );

        // check paid royalty
        expect(
          await ERC20Contract.balanceOf(royaltyReceiver.getAddress())
        ).to.be.equal(300000000); // 5% of asset price for ERC1155 token with id:1

        // check protocol fee
        expect(
          await ERC20Contract.balanceOf(defaultFeeReceiver.getAddress())
        ).to.be.equal(
          (Number(protocolFeePrimary) *
            Number(priceDistribution.erc721Prices[0][0]) +
            Number(protocolFeePrimary) *
              Number(priceDistribution.erc1155Prices[0][0])) /
            10000
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
          erc721Prices: [[5000000000]],
          erc1155Prices: [[3000000000, 2000000000]],
          quadPrices: [],
        };

        bundleData = {
          bundledERC721,
          bundledERC1155,
          quads,
          priceDistribution,
        };

        makerAsset = await AssetBundle(bundleData, 1);

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
          maker,
          makerAsset, // Bundle
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

        expect(await ERC20Contract.balanceOf(makerAddress)).to.be.equal(0);
        expect(await ERC20Contract.balanceOf(takerAddress)).to.be.equal(
          30000000000
        );
        expect(await ERC721Contract.ownerOf(1)).to.be.equal(makerAddress);
        expect(await ERC1155Contract.balanceOf(makerAddress, 1)).to.be.equal(
          50
        );
        expect(await ERC1155Contract.balanceOf(makerAddress, 2)).to.be.equal(
          50
        );
        expect(await ERC1155Contract.balanceOf(takerAddress, 1)).to.be.equal(0);
        expect(await ERC1155Contract.balanceOf(takerAddress, 2)).to.be.equal(0);

        await ExchangeContractAsAdmin.matchOrders([
          {
            orderLeft, // passing Bundle as left order
            signatureLeft: makerSig,
            orderRight, // passing ERC20 as right order
            signatureRight: takerSig,
          },
        ]);

        expect(await ERC721Contract.ownerOf(1)).to.be.equal(takerAddress);
        expect(await ERC1155Contract.balanceOf(makerAddress, 1)).to.be.equal(
          40
        );
        expect(await ERC1155Contract.balanceOf(makerAddress, 2)).to.be.equal(
          45
        );
        expect(await ERC1155Contract.balanceOf(takerAddress, 1)).to.be.equal(
          10
        );
        expect(await ERC1155Contract.balanceOf(takerAddress, 2)).to.be.equal(5);

        expect(
          await ExchangeContractAsUser.fills(hashKey(orderLeft))
        ).to.be.equal(10000000000);
        expect(
          await ExchangeContractAsUser.fills(hashKey(orderRight))
        ).to.be.equal(1);

        const protocolFees = {
          erc721ProtocolFees: [[protocolFeePrimary]],
          erc1155ProtocolFees: [[protocolFeePrimary, protocolFeePrimary]],
          quadProtocolFees: [],
        };

        const royaltyFees = {
          erc721RoyaltyFees: [[0]],
          erc1155RoyaltyFees: [[5, 10]],
          quadRoyaltyFees: [],
        };

        const expectedFinalReturn = calculateFinalPrice(
          priceDistribution,
          protocolFees,
          royaltyFees
        );

        expect(await ERC20Contract.balanceOf(makerAddress)).to.be.equal(
          expectedFinalReturn // 10000000000 - royalty - protocolFee
        );

        expect(await ERC20Contract.balanceOf(takerAddress)).to.be.equal(
          20000000000
        );

        // check paid royalty
        expect(
          await ERC20Contract.balanceOf(royaltyReceiver.getAddress())
        ).to.be.equal(150000000); // 5% of asset price for ERC1155 token with id:1
        expect(
          await ERC20Contract.balanceOf(royaltyReceiver2.getAddress())
        ).to.be.equal(200000000); // 10% of asset price for ERC1155 token with id:2

        // check protocol fee
        expect(
          await ERC20Contract.balanceOf(defaultFeeReceiver.getAddress())
        ).to.be.equal(
          (Number(protocolFeePrimary) *
            Number(priceDistribution.erc721Prices[0][0]) +
            Number(protocolFeePrimary) *
              Number(priceDistribution.erc1155Prices[0][0]) +
            Number(protocolFeePrimary) *
              Number(priceDistribution.erc1155Prices[0][1])) /
            10000
        );
      });

      it('should partially fill orders using matchOrders between ERC20 and ERC1155 BUNDLE with order value >1', async function () {
        // Seller (taker - right) has 5 copies of a Bundle type; buyer (taker - left) just wants to buy 1 of these
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
          erc721Prices: [[]], // price distribution without ERC721
          erc1155Prices: [[10000000000]],
          quadPrices: [],
        };

        const bundleAsset = {
          bundledERC721,
          bundledERC1155,
          quads,
          priceDistribution,
        };

        // configuring royalties
        await RoyaltiesProvider.initializeProvider(
          await ERC1155Contract.getAddress(),
          1,
          [await LibPartData(royaltyReceiver, 1000)] // 10% royalty for ERC1155 token with id:1
        );

        await RoyaltiesRegistryAsDeployer.setProviderByToken(
          await ERC1155Contract.getAddress(),
          RoyaltiesProvider.getAddress()
        );

        // ERC1155Asset for partial fill
        bundleWithoutERC721Left = await AssetBundle(bundleAsset, 5);

        bundleWithoutERC721Right = await AssetBundle(bundleAsset, 2);

        // left order for partial fill
        orderLeft = await OrderDefault(
          maker,
          bundleWithoutERC721Left, // makeAsset
          ZeroAddress,
          ERC20AssetForLeftOrder, // takeAsset
          1,
          0,
          0
        );
        // right order for partial fill
        orderRight = await OrderDefault(
          taker,
          ERC20AssetForRightOrder, // makeAsset
          ZeroAddress,
          bundleWithoutERC721Right, // takeAsset
          1,
          0,
          0
        );

        makerSig = await signOrder(orderLeft, maker, OrderValidatorAsAdmin);
        takerSig = await signOrder(orderRight, taker, OrderValidatorAsAdmin);

        const makerAddress = await maker.getAddress();
        const takerAddress = await taker.getAddress();

        expect(await ERC20Contract.balanceOf(makerAddress)).to.be.equal(0);
        expect(await ERC20Contract.balanceOf(takerAddress)).to.be.equal(
          30000000000
        );
        expect(await ERC1155Contract.balanceOf(takerAddress, 1)).to.be.equal(0);
        expect(await ERC1155Contract.balanceOf(makerAddress, 1)).to.be.equal(
          50
        );
        expect(
          await ExchangeContractAsUser.fills(hashKey(orderLeft))
        ).to.be.equal(0);
        expect(
          await ExchangeContractAsUser.fills(hashKey(orderRight))
        ).to.be.equal(0);

        await ExchangeContractAsAdmin.matchOrders([
          {
            orderLeft,
            signatureLeft: makerSig,
            orderRight,
            signatureRight: takerSig,
          },
        ]);

        expect(
          await ExchangeContractAsUser.fills(hashKey(orderLeft)) // newFill.rightValue
        ).to.be.equal(20000000000);
        expect(
          await ExchangeContractAsUser.fills(hashKey(orderRight)) // newFill.leftValue
        ).to.be.equal(2);

        const protocolFees = {
          erc721ProtocolFees: [[]],
          erc1155ProtocolFees: [[protocolFeePrimary]],
          quadProtocolFees: [],
        };

        const royaltyFees = {
          erc721RoyaltyFees: [[0]],
          erc1155RoyaltyFees: [[10]],
          quadRoyaltyFees: [],
        };

        const expectedFinalReturn = calculateFinalPrice(
          priceDistribution,
          protocolFees,
          royaltyFees
        );

        expect(await ERC20Contract.balanceOf(makerAddress)).to.be.equal(
          2 * expectedFinalReturn // 20000000000 - royalty - protocolFee
        );
        expect(await ERC20Contract.balanceOf(takerAddress)).to.be.equal(
          10000000000
        );

        // check paid royalty
        expect(
          await ERC20Contract.balanceOf(royaltyReceiver.getAddress())
        ).to.be.equal(2000000000); // 10% of asset price for ERC1155 token with id:1 for 2 bundles

        expect(
          await ERC20Contract.balanceOf(defaultFeeReceiver.getAddress())
        ).to.be.equal(
          (2 *
            (Number(protocolFeePrimary) *
              Number(priceDistribution.erc1155Prices[0][0]))) /
            10000
        );

        expect(await ERC1155Contract.balanceOf(makerAddress, 1)).to.be.equal(
          30
        );
        expect(await ERC1155Contract.balanceOf(takerAddress, 1)).to.be.equal(
          20
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
          erc721Prices: [[4000000000]],
          erc1155Prices: [[5000000000]],
          quadPrices: [400000000, 600000000],
        };

        // Create bundle for passing as left order
        bundleData = {
          bundledERC721,
          bundledERC1155,
          quads,
          priceDistribution,
        };

        makerAsset = await AssetBundle(bundleData, 1);

        // set up royalties by token
        await RoyaltiesRegistryAsDeployer.setRoyaltiesByToken(
          await LandAsAdmin.getAddress(),
          [await LibPartData(royaltyReceiver, 1000)] // 10% royalty for Land token
        );

        orderLeft = await OrderDefault(
          maker,
          makerAsset, // Bundle
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

        expect(await ERC721Contract.ownerOf(1)).to.be.equal(makerAddress);
        expect(await ERC20Contract.balanceOf(makerAddress)).to.be.equal(0);
        expect(await ERC20Contract.balanceOf(takerAddress)).to.be.equal(
          30000000000
        );

        expect(await ERC1155Contract.balanceOf(makerAddress, 1)).to.be.equal(
          50
        );
        expect(await ERC1155Contract.balanceOf(takerAddress, 1)).to.be.equal(0);

        await ExchangeContractAsAdmin.matchOrders([
          {
            orderLeft, // passing Bundle as left order
            signatureLeft: makerSig,
            orderRight, // passing ERC20 as right order
            signatureRight: takerSig,
          },
        ]);

        expect(await ERC721Contract.ownerOf(1)).to.be.equal(takerAddress);
        expect(await ERC1155Contract.balanceOf(makerAddress, 1)).to.be.equal(
          40
        );
        expect(await ERC1155Contract.balanceOf(takerAddress, 1)).to.be.equal(
          10
        );

        expect(
          await ExchangeContractAsUser.fills(hashKey(orderLeft))
        ).to.be.equal(10000000000);
        expect(
          await ExchangeContractAsUser.fills(hashKey(orderRight))
        ).to.be.equal(1);

        const protocolFees = {
          erc721ProtocolFees: [[protocolFeePrimary]],
          erc1155ProtocolFees: [[protocolFeePrimary]],
          quadProtocolFees: [protocolFeePrimary, protocolFeePrimary],
        };

        const royaltyFees = {
          erc721RoyaltyFees: [[0]],
          erc1155RoyaltyFees: [[0]],
          quadRoyaltyFees: [10, 10],
        };

        const expectedFinalReturn = calculateFinalPrice(
          priceDistribution,
          protocolFees,
          royaltyFees
        );

        expect(await ERC20Contract.balanceOf(makerAddress)).to.be.equal(
          expectedFinalReturn // 10000000000 - protocolFee - royalty
        );

        expect(await ERC20Contract.balanceOf(takerAddress)).to.be.equal(
          20000000000
        );

        // check paid royalty
        expect(
          await ERC20Contract.balanceOf(royaltyReceiver.getAddress())
        ).to.be.equal(100000000); // 10% of asset price for quad (3,0) & (0,3)

        // check protocol fee
        expect(
          await ERC20Contract.balanceOf(await defaultFeeReceiver.getAddress())
        ).to.be.equal(
          (Number(protocolFeePrimary) *
            Number(priceDistribution.erc721Prices[0][0]) +
            Number(protocolFeePrimary) *
              Number(priceDistribution.erc1155Prices[0][0]) +
            Number(protocolFeePrimary) *
              Number(priceDistribution.quadPrices[0]) +
            Number(protocolFeePrimary) *
              Number(priceDistribution.quadPrices[1])) /
            10000
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
          erc721Prices: [[4000000000]],
          erc1155Prices: [[5000000000]],
          quadPrices: [400000000, 600000000],
        };

        // Create bundle for passing as left order
        bundleData = {
          bundledERC721,
          bundledERC1155,
          quads,
          priceDistribution,
        };

        makerAsset = await AssetBundle(bundleData, 1);

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
          maker,
          makerAsset, // Bundle
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

        expect(await ERC20Contract.balanceOf(makerAddress)).to.be.equal(0);
        expect(await ERC20Contract.balanceOf(takerAddress)).to.be.equal(
          30000000000
        );
        expect(await ERC721Contract.ownerOf(1)).to.be.equal(makerAddress);
        expect(await ERC1155Contract.balanceOf(makerAddress, 1)).to.be.equal(
          50
        );
        expect(await ERC1155Contract.balanceOf(takerAddress, 1)).to.be.equal(0);

        await ExchangeContractAsAdmin.matchOrders([
          {
            orderLeft, // passing Bundle as left order
            signatureLeft: makerSig,
            orderRight, // passing ERC20 as right order
            signatureRight: takerSig,
          },
        ]);

        expect(await ERC721Contract.ownerOf(1)).to.be.equal(takerAddress);
        expect(await ERC1155Contract.balanceOf(makerAddress, 1)).to.be.equal(
          40
        );
        expect(await ERC1155Contract.balanceOf(takerAddress, 1)).to.be.equal(
          10
        );

        expect(
          await ExchangeContractAsUser.fills(hashKey(orderLeft))
        ).to.be.equal(10000000000);
        expect(
          await ExchangeContractAsUser.fills(hashKey(orderRight))
        ).to.be.equal(1);

        const protocolFees = {
          erc721ProtocolFees: [[protocolFeePrimary]],
          erc1155ProtocolFees: [[protocolFeePrimary]],
          quadProtocolFees: [protocolFeePrimary, protocolFeePrimary],
        };

        const royaltyFees = {
          erc721RoyaltyFees: [[0]],
          erc1155RoyaltyFees: [[0]],
          quadRoyaltyFees: [10, 20],
        };

        const expectedFinalReturn = calculateFinalPrice(
          priceDistribution,
          protocolFees,
          royaltyFees
        );

        expect(await ERC20Contract.balanceOf(makerAddress)).to.be.equal(
          expectedFinalReturn // 10000000000 - protocolFee - royalty
        );
        expect(await ERC20Contract.balanceOf(takerAddress)).to.be.equal(
          20000000000
        );

        // check paid royalty
        expect(
          await ERC20Contract.balanceOf(royaltyReceiver.getAddress())
        ).to.be.equal(40000000); // 10% of asset price for quad(3,0)
        expect(
          await ERC20Contract.balanceOf(royaltyReceiver2.getAddress())
        ).to.be.equal(120000000); // 20% of asset price for quad(0,3)

        // check protocol fee
        expect(
          await ERC20Contract.balanceOf(await defaultFeeReceiver.getAddress())
        ).to.be.equal(
          (Number(protocolFeePrimary) *
            Number(priceDistribution.erc721Prices[0][0]) +
            Number(protocolFeePrimary) *
              Number(priceDistribution.erc1155Prices[0][0]) +
            Number(protocolFeePrimary) *
              Number(priceDistribution.quadPrices[0]) +
            Number(protocolFeePrimary) *
              Number(priceDistribution.quadPrices[1])) /
            10000
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
          erc721Prices: [[1000000000]],
          erc1155Prices: [[5000000000]],
          quadPrices: [1000000000, 3000000000],
        };

        // Create bundle for passing as left order
        bundleData = {
          bundledERC721,
          bundledERC1155,
          quads,
          priceDistribution,
        };

        makerAsset = await AssetBundle(bundleData, 1);

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
          maker,
          makerAsset, // Bundle
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

        expect(await ERC20Contract.balanceOf(makerAddress)).to.be.equal(0);
        expect(await ERC20Contract.balanceOf(takerAddress)).to.be.equal(
          30000000000
        );
        expect(await ERC721Contract.ownerOf(1)).to.be.equal(makerAddress);
        expect(await ERC1155Contract.balanceOf(makerAddress, 1)).to.be.equal(
          50
        );
        expect(await ERC1155Contract.balanceOf(takerAddress, 1)).to.be.equal(0);

        await ExchangeContractAsAdmin.matchOrders([
          {
            orderLeft, // passing Bundle as left order
            signatureLeft: makerSig,
            orderRight, // passing ERC20 as right order
            signatureRight: takerSig,
          },
        ]);

        expect(await ERC721Contract.ownerOf(1)).to.be.equal(takerAddress);
        expect(await ERC1155Contract.balanceOf(makerAddress, 1)).to.be.equal(
          40
        );
        expect(await ERC1155Contract.balanceOf(takerAddress, 1)).to.be.equal(
          10
        );

        expect(
          await ExchangeContractAsUser.fills(hashKey(orderLeft))
        ).to.be.equal(10000000000);
        expect(
          await ExchangeContractAsUser.fills(hashKey(orderRight))
        ).to.be.equal(1);

        const protocolFees = {
          erc721ProtocolFees: [[protocolFeePrimary]],
          erc1155ProtocolFees: [[protocolFeePrimary]],
          quadProtocolFees: [protocolFeePrimary, protocolFeePrimary],
        };

        const royaltyFees = {
          erc721RoyaltyFees: [[10]],
          erc1155RoyaltyFees: [[10]],
          quadRoyaltyFees: [10, 10],
        };

        const expectedFinalReturn = calculateFinalPrice(
          priceDistribution,
          protocolFees,
          royaltyFees
        );

        expect(await ERC20Contract.balanceOf(makerAddress)).to.be.equal(
          expectedFinalReturn // 10000000000 - protocolFee - royalty
        );
        expect(await ERC20Contract.balanceOf(takerAddress)).to.be.equal(
          20000000000
        );

        // check paid royalty
        expect(
          await ERC20Contract.balanceOf(royaltyReceiver.getAddress())
        ).to.be.equal(100000000); // 10% of the amount
        expect(
          await ERC20Contract.balanceOf(royaltyReceiver2.getAddress())
        ).to.be.equal(500000000); // 10% of asset price for ERC1155 token with id:1
        expect(
          await ERC20Contract.balanceOf(royaltyReceiver3.getAddress())
        ).to.be.equal(400000000); // 10% of asset price for quad (3,0) & (0,3)

        // check protocol fee
        expect(
          await ERC20Contract.balanceOf(await defaultFeeReceiver.getAddress())
        ).to.be.equal(
          (Number(protocolFeePrimary) *
            Number(priceDistribution.erc721Prices[0][0]) +
            Number(protocolFeePrimary) *
              Number(priceDistribution.erc1155Prices[0][0]) +
            Number(protocolFeePrimary) *
              Number(priceDistribution.quadPrices[0]) +
            Number(protocolFeePrimary) *
              Number(priceDistribution.quadPrices[1])) /
            10000
        );

        // check maker received quads
        expect(await LandContract.balanceOf(takerAddress)).to.be.equal(18);
        expect(await LandContract.balanceOf(makerAddress)).to.be.equal(18);
      });
    });
  });
}
