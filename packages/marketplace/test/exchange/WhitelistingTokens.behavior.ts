import {expect} from 'chai';
import {deployFixturesWithoutWhitelist} from '../fixtures/index.ts';
import {loadFixture} from '@nomicfoundation/hardhat-network-helpers';
import {
  AssetERC20,
  AssetERC721,
  AssetERC1155,
  FeeRecipientsData,
  Asset,
  AssetBundle,
  BundledERC721,
  BundledERC1155,
  Quads,
  BundleData,
  PriceDistribution,
} from '../utils/assets.ts';

import {hashKey, OrderDefault, signOrder, Order} from '../utils/order.ts';
import {ZeroAddress, Contract, Signer} from 'ethers';

// eslint-disable-next-line mocha/no-exports
export function shouldCheckForWhitelisting() {
  describe('Exchange MatchOrders for Whitelisting tokens', function () {
    let ExchangeContractAsUser: Contract,
      ExchangeContractAsAdmin: Contract,
      OrderValidatorAsAdmin: Contract,
      ERC20Contract: Contract,
      ERC20Contract2: Contract,
      ERC721Contract: Contract,
      ERC721WithRoyaltyV2981: Contract,
      ERC1155Contract: Contract,
      maker: Signer,
      taker: Signer,
      makerAsset: Asset,
      takerAsset: Asset,
      priceDistribution: PriceDistribution,
      bundledERC721: BundledERC721,
      bundledERC1155: BundledERC1155,
      quads: Quads,
      bundleData: BundleData,
      orderLeft: Order,
      orderRight: Order,
      makerSig: string,
      takerSig: string,
      TSB_SECONDARY_MARKET_SELLER_ROLE: string;

    beforeEach(async function () {
      ({
        ExchangeContractAsUser,
        ExchangeContractAsAdmin,
        OrderValidatorAsAdmin,
        ERC20Contract,
        ERC20Contract2,
        ERC721Contract,
        ERC721WithRoyaltyV2981,
        ERC1155Contract,
        user1: maker,
        user2: taker,
        TSB_SECONDARY_MARKET_SELLER_ROLE,
      } = await loadFixture(deployFixturesWithoutWhitelist));
    });

    describe('ERC20 x ERC20', function () {
      beforeEach(async function () {
        await ERC20Contract.mint(maker.getAddress(), 123000000);
        await ERC20Contract.connect(maker).approve(
          await ExchangeContractAsUser.getAddress(),
          123000000
        );

        await ERC20Contract2.mint(taker.getAddress(), 456000000);
        await ERC20Contract2.connect(taker).approve(
          await ExchangeContractAsUser.getAddress(),
          456000000
        );
        makerAsset = await AssetERC20(ERC20Contract, 123000000);
        takerAsset = await AssetERC20(ERC20Contract2, 456000000);
        orderLeft = await OrderDefault(
          maker,
          makerAsset,
          ZeroAddress,
          takerAsset,
          1,
          0,
          0
        );
        orderRight = await OrderDefault(
          taker,
          takerAsset,
          ZeroAddress,
          makerAsset,
          1,
          0,
          0
        );

        makerSig = await signOrder(orderLeft, maker, OrderValidatorAsAdmin);
        takerSig = await signOrder(orderRight, taker, OrderValidatorAsAdmin);
      });

      it('should NOT execute complete match order between ERC20 tokens if tokens are not whitelisted', async function () {
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

      it('should execute complete match order between ERC20 tokens if added to whitelist', async function () {
        const ERC20_ROLE = await OrderValidatorAsAdmin.ERC20_ROLE();
        await OrderValidatorAsAdmin.grantRole(ERC20_ROLE, ERC20Contract);
        await OrderValidatorAsAdmin.grantRole(ERC20_ROLE, ERC20Contract2);

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

    describe('ERC721 x ERC20', function () {
      beforeEach(async function () {
        ({
          deployer: maker, // making deployer the maker to sell in primary market
          user2: taker,
        } = await loadFixture(deployFixturesWithoutWhitelist));

        await ERC721WithRoyaltyV2981.mint(maker.getAddress(), 1, [
          await FeeRecipientsData(maker.getAddress(), 10000),
        ]);
        await ERC721WithRoyaltyV2981.connect(maker).approve(
          await ExchangeContractAsUser.getAddress(),
          1
        );
        await ERC20Contract.mint(taker.getAddress(), 100000000000);
        await ERC20Contract.connect(taker).approve(
          await ExchangeContractAsUser.getAddress(),
          100000000000
        );
        makerAsset = await AssetERC721(ERC721WithRoyaltyV2981, 1);
        takerAsset = await AssetERC20(ERC20Contract, 100000000000);
        orderLeft = await OrderDefault(
          maker,
          makerAsset,
          ZeroAddress,
          takerAsset,
          1,
          0,
          0
        );
        orderRight = await OrderDefault(
          taker,
          takerAsset,
          ZeroAddress,
          makerAsset,
          1,
          0,
          0
        );
        makerSig = await signOrder(orderLeft, maker, OrderValidatorAsAdmin);
        takerSig = await signOrder(orderRight, taker, OrderValidatorAsAdmin);
      });

      it('should NOT allow ERC721 token exchange if TSB_ROLE & whitelist functionality are activated and ERC721 token is not granted TSB_ROLE', async function () {
        expect(
          await ExchangeContractAsUser.fills(hashKey(orderLeft))
        ).to.be.equal(0);
        expect(
          await ExchangeContractAsUser.fills(hashKey(orderRight))
        ).to.be.equal(0);

        const ERC20_ROLE = await OrderValidatorAsAdmin.ERC20_ROLE();
        await OrderValidatorAsAdmin.grantRole(ERC20_ROLE, ERC20Contract);
        await OrderValidatorAsAdmin.enableWhitelists();
        const TSB_ROLE = await OrderValidatorAsAdmin.TSB_ROLE();
        await OrderValidatorAsAdmin.enableRole(TSB_ROLE);

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

      it('should allow ERC721 token exchange if TSB_ROLE & whitelist functionality are activated and ERC721 token is granted TSB_ROLE', async function () {
        expect(
          await ExchangeContractAsUser.fills(hashKey(orderLeft))
        ).to.be.equal(0);
        expect(
          await ExchangeContractAsUser.fills(hashKey(orderRight))
        ).to.be.equal(0);

        const ERC20_ROLE = await OrderValidatorAsAdmin.ERC20_ROLE();
        await OrderValidatorAsAdmin.grantRole(ERC20_ROLE, ERC20Contract);
        await OrderValidatorAsAdmin.enableWhitelists();
        const TSB_ROLE = await OrderValidatorAsAdmin.TSB_ROLE();
        await OrderValidatorAsAdmin.enableRole(TSB_ROLE);
        await OrderValidatorAsAdmin.grantRole(TSB_ROLE, ERC721WithRoyaltyV2981);

        await ExchangeContractAsUser.matchOrders([
          {
            orderLeft,
            signatureLeft: makerSig,
            orderRight,
            signatureRight: takerSig,
          },
        ]);
      });

      it('should NOT allow ERC721 token exchange if PARTNER_ROLE & whitelist functionality are activated and token is not granted PARTNER_ROLE', async function () {
        expect(
          await ExchangeContractAsUser.fills(hashKey(orderLeft))
        ).to.be.equal(0);
        expect(
          await ExchangeContractAsUser.fills(hashKey(orderRight))
        ).to.be.equal(0);

        const ERC20_ROLE = await OrderValidatorAsAdmin.ERC20_ROLE();
        await OrderValidatorAsAdmin.grantRole(ERC20_ROLE, ERC20Contract);
        await OrderValidatorAsAdmin.enableWhitelists();
        const PARTNER_ROLE = await OrderValidatorAsAdmin.PARTNER_ROLE();
        await OrderValidatorAsAdmin.enableRole(PARTNER_ROLE);

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

      it('should allow ERC721 token exchange if PARTNER_ROLE & whitelist functionality are activated and token is granted PARTNER_ROLE', async function () {
        expect(
          await ExchangeContractAsUser.fills(hashKey(orderLeft))
        ).to.be.equal(0);
        expect(
          await ExchangeContractAsUser.fills(hashKey(orderRight))
        ).to.be.equal(0);

        const ERC20_ROLE = await OrderValidatorAsAdmin.ERC20_ROLE();
        await OrderValidatorAsAdmin.grantRole(ERC20_ROLE, ERC20Contract);
        await OrderValidatorAsAdmin.enableWhitelists();
        const PARTNER_ROLE = await OrderValidatorAsAdmin.PARTNER_ROLE();
        await OrderValidatorAsAdmin.enableRole(PARTNER_ROLE);
        await OrderValidatorAsAdmin.grantRole(
          PARTNER_ROLE,
          ERC721WithRoyaltyV2981
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

      it('should allow ERC721 token exchange if TSB_ROLE and PARTNER_ROLE are granted but whitelist is disabled', async function () {
        expect(
          await ExchangeContractAsUser.fills(hashKey(orderLeft))
        ).to.be.equal(0);
        expect(
          await ExchangeContractAsUser.fills(hashKey(orderRight))
        ).to.be.equal(0);

        const ERC20_ROLE = await OrderValidatorAsAdmin.ERC20_ROLE();
        await OrderValidatorAsAdmin.grantRole(ERC20_ROLE, ERC20Contract);
        const TSB_ROLE = await OrderValidatorAsAdmin.PARTNER_ROLE();
        const PARTNER_ROLE = await OrderValidatorAsAdmin.PARTNER_ROLE();
        await OrderValidatorAsAdmin.setRolesEnabled(
          [PARTNER_ROLE, TSB_ROLE],
          [true, true]
        );
        await OrderValidatorAsAdmin.grantRole(TSB_ROLE, ERC721WithRoyaltyV2981);
        await OrderValidatorAsAdmin.grantRole(
          PARTNER_ROLE,
          ERC721WithRoyaltyV2981
        );
        await OrderValidatorAsAdmin.disableWhitelists();

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

    describe('ERC1155 x ERC20', function () {
      beforeEach(async function () {
        ({
          deployer: maker, // making deployer the maker to sell in primary market
          user2: taker,
        } = await loadFixture(deployFixturesWithoutWhitelist));

        await ERC1155Contract.mint(maker.getAddress(), 1, 10);
        await ERC1155Contract.connect(maker).setApprovalForAll(
          await ExchangeContractAsUser.getAddress(),
          true
        );
        await ERC20Contract.mint(taker.getAddress(), 100000000000);
        await ERC20Contract.connect(taker).approve(
          await ExchangeContractAsUser.getAddress(),
          100000000000
        );
        makerAsset = await AssetERC1155(
          ERC1155Contract,
          1,
          1,
          await maker.getAddress()
        );
        takerAsset = await AssetERC20(ERC20Contract, 100000000000);
        orderLeft = await OrderDefault(
          maker,
          makerAsset,
          ZeroAddress,
          takerAsset,
          1,
          0,
          0
        );
        orderRight = await OrderDefault(
          taker,
          takerAsset,
          ZeroAddress,
          makerAsset,
          1,
          0,
          0
        );
        makerSig = await signOrder(orderLeft, maker, OrderValidatorAsAdmin);
        takerSig = await signOrder(orderRight, taker, OrderValidatorAsAdmin);
      });

      it('should NOT allow ERC1155 token exchange if TSB_ROLE & whitelist functionality are activated and ERC1155 token is not granted TSB_ROLE', async function () {
        expect(
          await ExchangeContractAsUser.fills(hashKey(orderLeft))
        ).to.be.equal(0);
        expect(
          await ExchangeContractAsUser.fills(hashKey(orderRight))
        ).to.be.equal(0);

        const ERC20_ROLE = await OrderValidatorAsAdmin.ERC20_ROLE();
        await OrderValidatorAsAdmin.grantRole(ERC20_ROLE, ERC20Contract);
        await OrderValidatorAsAdmin.enableWhitelists();
        const TSB_ROLE = await OrderValidatorAsAdmin.TSB_ROLE();
        await OrderValidatorAsAdmin.enableRole(TSB_ROLE);

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

      it('should allow ERC1155 token exchange if TSB_ROLE & whitelist functionality are activated and ERC1155 token is granted TSB_ROLE', async function () {
        expect(
          await ExchangeContractAsUser.fills(hashKey(orderLeft))
        ).to.be.equal(0);
        expect(
          await ExchangeContractAsUser.fills(hashKey(orderRight))
        ).to.be.equal(0);

        const ERC20_ROLE = await OrderValidatorAsAdmin.ERC20_ROLE();
        await OrderValidatorAsAdmin.grantRole(ERC20_ROLE, ERC20Contract);
        await OrderValidatorAsAdmin.enableWhitelists();
        const TSB_ROLE = await OrderValidatorAsAdmin.TSB_ROLE();
        await OrderValidatorAsAdmin.enableRole(TSB_ROLE);
        await OrderValidatorAsAdmin.grantRole(TSB_ROLE, ERC1155Contract);

        await ExchangeContractAsUser.matchOrders([
          {
            orderLeft,
            signatureLeft: makerSig,
            orderRight,
            signatureRight: takerSig,
          },
        ]);
      });

      it('should NOT allow ERC1155 token exchange if PARTNER_ROLE & whitelist functionality are activated and token is not granted PARTNER_ROLE', async function () {
        expect(
          await ExchangeContractAsUser.fills(hashKey(orderLeft))
        ).to.be.equal(0);
        expect(
          await ExchangeContractAsUser.fills(hashKey(orderRight))
        ).to.be.equal(0);

        const ERC20_ROLE = await OrderValidatorAsAdmin.ERC20_ROLE();
        await OrderValidatorAsAdmin.grantRole(ERC20_ROLE, ERC20Contract);
        await OrderValidatorAsAdmin.enableWhitelists();
        const PARTNER_ROLE = await OrderValidatorAsAdmin.PARTNER_ROLE();
        await OrderValidatorAsAdmin.enableRole(PARTNER_ROLE);

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

      it('should allow ERC1155 token exchange if PARTNER_ROLE & whitelist functionality are activated and token is granted PARTNER_ROLE', async function () {
        expect(
          await ExchangeContractAsUser.fills(hashKey(orderLeft))
        ).to.be.equal(0);
        expect(
          await ExchangeContractAsUser.fills(hashKey(orderRight))
        ).to.be.equal(0);

        const ERC20_ROLE = await OrderValidatorAsAdmin.ERC20_ROLE();
        await OrderValidatorAsAdmin.grantRole(ERC20_ROLE, ERC20Contract);
        await OrderValidatorAsAdmin.enableWhitelists();
        const PARTNER_ROLE = await OrderValidatorAsAdmin.PARTNER_ROLE();
        await OrderValidatorAsAdmin.enableRole(PARTNER_ROLE);
        await OrderValidatorAsAdmin.grantRole(PARTNER_ROLE, ERC1155Contract);

        await ExchangeContractAsUser.matchOrders([
          {
            orderLeft,
            signatureLeft: makerSig,
            orderRight,
            signatureRight: takerSig,
          },
        ]);
      });

      it('should allow ERC1155 token exchange if TSB_ROLE and PARTNER_ROLE are activated but whitelist is disabled', async function () {
        expect(
          await ExchangeContractAsUser.fills(hashKey(orderLeft))
        ).to.be.equal(0);
        expect(
          await ExchangeContractAsUser.fills(hashKey(orderRight))
        ).to.be.equal(0);

        const ERC20_ROLE = await OrderValidatorAsAdmin.ERC20_ROLE();
        await OrderValidatorAsAdmin.grantRole(ERC20_ROLE, ERC20Contract);
        const TSB_ROLE = await OrderValidatorAsAdmin.PARTNER_ROLE();
        const PARTNER_ROLE = await OrderValidatorAsAdmin.PARTNER_ROLE();
        await OrderValidatorAsAdmin.setRolesEnabled(
          [PARTNER_ROLE, TSB_ROLE],
          [true, true]
        );
        await OrderValidatorAsAdmin.grantRole(TSB_ROLE, ERC1155Contract);
        await OrderValidatorAsAdmin.grantRole(PARTNER_ROLE, ERC1155Contract);

        await OrderValidatorAsAdmin.disableWhitelists();

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

    describe('Bundle x ERC20', function () {
      beforeEach(async function () {
        ({
          deployer: maker, // making deployer the maker to sell in primary market
          user2: taker,
        } = await loadFixture(deployFixturesWithoutWhitelist));

        // grant tsb bundle seller role to seller
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

        // Set up ERC1155 for maker
        await ERC1155Contract.mint(await maker.getAddress(), 1, 10);

        await ERC1155Contract.connect(maker).setApprovalForAll(
          await ExchangeContractAsUser.getAddress(),
          true
        );

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
      });

      it('should NOT execute complete match order between Bundle and ERC20 if ERC20 token is not whitelisted', async function () {
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

      it('should execute complete match order between Bundle and ERC20 if ERC20 is added to whitelist', async function () {
        const ERC20_ROLE = await OrderValidatorAsAdmin.ERC20_ROLE();
        await OrderValidatorAsAdmin.grantRole(ERC20_ROLE, ERC20Contract);

        await ExchangeContractAsUser.matchOrders([
          {
            orderLeft,
            signatureLeft: makerSig,
            orderRight,
            signatureRight: takerSig,
          },
        ]);
      });

      it('should NOT allow Bundle exchange if TSB_ROLE & whitelist functionality are activated and bundled tokens are not whitelisted', async function () {
        expect(
          await ExchangeContractAsUser.fills(hashKey(orderLeft))
        ).to.be.equal(0);
        expect(
          await ExchangeContractAsUser.fills(hashKey(orderRight))
        ).to.be.equal(0);

        const ERC20_ROLE = await OrderValidatorAsAdmin.ERC20_ROLE();
        await OrderValidatorAsAdmin.grantRole(ERC20_ROLE, ERC20Contract);
        await OrderValidatorAsAdmin.enableWhitelists();
        const TSB_ROLE = await OrderValidatorAsAdmin.TSB_ROLE();
        await OrderValidatorAsAdmin.enableRole(TSB_ROLE);

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

      it('should allow Bundle exchange if TSB_ROLE & whitelist functionality are activated and bundled tokens are whitelisted', async function () {
        expect(
          await ExchangeContractAsUser.fills(hashKey(orderLeft))
        ).to.be.equal(0);
        expect(
          await ExchangeContractAsUser.fills(hashKey(orderRight))
        ).to.be.equal(0);

        const ERC20_ROLE = await OrderValidatorAsAdmin.ERC20_ROLE();
        await OrderValidatorAsAdmin.grantRole(ERC20_ROLE, ERC20Contract);
        await OrderValidatorAsAdmin.enableWhitelists();
        const TSB_ROLE = await OrderValidatorAsAdmin.TSB_ROLE();
        await OrderValidatorAsAdmin.enableRole(TSB_ROLE);
        await OrderValidatorAsAdmin.grantRole(TSB_ROLE, ERC721Contract);
        await OrderValidatorAsAdmin.grantRole(TSB_ROLE, ERC1155Contract);

        await ExchangeContractAsUser.matchOrders([
          {
            orderLeft,
            signatureLeft: makerSig,
            orderRight,
            signatureRight: takerSig,
          },
        ]);
      });

      it('should NOT allow Bundle exchange if PARTNER_ROLE & whitelist functionality are activated and bundled tokens are not whitelisted', async function () {
        expect(
          await ExchangeContractAsUser.fills(hashKey(orderLeft))
        ).to.be.equal(0);
        expect(
          await ExchangeContractAsUser.fills(hashKey(orderRight))
        ).to.be.equal(0);

        const ERC20_ROLE = await OrderValidatorAsAdmin.ERC20_ROLE();
        await OrderValidatorAsAdmin.grantRole(ERC20_ROLE, ERC20Contract);
        await OrderValidatorAsAdmin.enableWhitelists();
        const PARTNER_ROLE = await OrderValidatorAsAdmin.PARTNER_ROLE();
        await OrderValidatorAsAdmin.enableRole(PARTNER_ROLE);

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

      it('should allow Bundle exchange if PARTNER_ROLE & whitelist functionality are activated and bundled tokens are not whitelisted', async function () {
        expect(
          await ExchangeContractAsUser.fills(hashKey(orderLeft))
        ).to.be.equal(0);
        expect(
          await ExchangeContractAsUser.fills(hashKey(orderRight))
        ).to.be.equal(0);

        const ERC20_ROLE = await OrderValidatorAsAdmin.ERC20_ROLE();
        await OrderValidatorAsAdmin.grantRole(ERC20_ROLE, ERC20Contract);
        await OrderValidatorAsAdmin.enableWhitelists();
        const PARTNER_ROLE = await OrderValidatorAsAdmin.PARTNER_ROLE();
        await OrderValidatorAsAdmin.enableRole(PARTNER_ROLE);
        await OrderValidatorAsAdmin.grantRole(PARTNER_ROLE, ERC721Contract);
        await OrderValidatorAsAdmin.grantRole(PARTNER_ROLE, ERC1155Contract);

        await ExchangeContractAsUser.matchOrders([
          {
            orderLeft,
            signatureLeft: makerSig,
            orderRight,
            signatureRight: takerSig,
          },
        ]);
      });

      it('should allow Bundle exchange if TSB_ROLE and PARTNER_ROLE are activated but whitelist is disabled', async function () {
        expect(
          await ExchangeContractAsUser.fills(hashKey(orderLeft))
        ).to.be.equal(0);
        expect(
          await ExchangeContractAsUser.fills(hashKey(orderRight))
        ).to.be.equal(0);

        const ERC20_ROLE = await OrderValidatorAsAdmin.ERC20_ROLE();
        await OrderValidatorAsAdmin.grantRole(ERC20_ROLE, ERC20Contract);
        const TSB_ROLE = await OrderValidatorAsAdmin.PARTNER_ROLE();
        const PARTNER_ROLE = await OrderValidatorAsAdmin.PARTNER_ROLE();
        await OrderValidatorAsAdmin.setRolesEnabled(
          [PARTNER_ROLE, TSB_ROLE],
          [true, true]
        );
        await OrderValidatorAsAdmin.grantRole(TSB_ROLE, ERC721Contract);
        await OrderValidatorAsAdmin.grantRole(TSB_ROLE, ERC1155Contract);
        await OrderValidatorAsAdmin.grantRole(PARTNER_ROLE, ERC721Contract);
        await OrderValidatorAsAdmin.grantRole(PARTNER_ROLE, ERC1155Contract);

        await OrderValidatorAsAdmin.disableWhitelists();

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
}
