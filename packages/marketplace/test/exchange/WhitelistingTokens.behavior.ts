import {expect} from 'chai';
import {exchangeSetup} from '../fixtures/exchangeFixtures.ts';
import {orderValidatorSetup} from '../fixtures/orderValidatorFixtures.ts';
import {handlerSetup} from '../fixtures/handlerFixtures.ts';
import {signerSetup} from '../fixtures/signerFixtures.ts';
import {loadFixture} from '@nomicfoundation/hardhat-network-helpers';
import {
  AssetERC20,
  AssetERC721,
  FeeRecipientsData,
  Asset,
} from '../utils/assets.ts';

import {hashKey, OrderDefault, signOrder, Order} from '../utils/order.ts';
import {ZeroAddress, Contract, Signer} from 'ethers';

// eslint-disable-next-line mocha/no-exports
export function shouldCheckForWhitelisting() {
  describe('Exchange MatchOrders for Whitelisting tokens', function () {
    let ExchangeContractAsUser: Contract,
      OrderValidatorAsAdmin: Contract,
      ERC20Contract: Contract,
      ERC20Contract2: Contract,
      ERC721WithRoyaltyV2981: Contract,
      maker: Signer,
      taker: Signer,
      makerAsset: Asset,
      takerAsset: Asset,
      orderLeft: Order,
      orderRight: Order,
      makerSig: string,
      takerSig: string;

    beforeEach(async function () {
      ({user1: maker, user2: taker} = await loadFixture(signerSetup));

      ({ERC20Contract, ERC20Contract2, ERC721WithRoyaltyV2981} =
        await loadFixture(handlerSetup));

      ({OrderValidatorAsAdmin} = await loadFixture(orderValidatorSetup));

      ({ExchangeContractAsUser} = await loadFixture(exchangeSetup));
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

      it('should NOT execute a complete match order between ERC20 tokens if whitelisting for ERC20 is ON', async function () {
        const ERC20_ROLE = await OrderValidatorAsAdmin.ERC20_ROLE();
        await OrderValidatorAsAdmin.enableRole(ERC20_ROLE);
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
        const ERC20_ROLE = await OrderValidatorAsAdmin.ERC20_ROLE();
        await OrderValidatorAsAdmin.enableRole(ERC20_ROLE);
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
        } = await loadFixture(signerSetup));
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

      it('should NOT allow ERC721 tokens exchange if TSB_ROLE is activated and token is not whitelisted', async function () {
        expect(
          await ExchangeContractAsUser.fills(hashKey(orderLeft))
        ).to.be.equal(0);
        expect(
          await ExchangeContractAsUser.fills(hashKey(orderRight))
        ).to.be.equal(0);

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

      it('should allow ERC721 tokens exchange if TSB_ROLE is activated and token is whitelisted', async function () {
        expect(
          await ExchangeContractAsUser.fills(hashKey(orderLeft))
        ).to.be.equal(0);
        expect(
          await ExchangeContractAsUser.fills(hashKey(orderRight))
        ).to.be.equal(0);

        await OrderValidatorAsAdmin.disableWhitelists();
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

      it('should NOT allow ERC721 tokens exchange if PARTNER_ROLE is activated and token is not whitelisted', async function () {
        expect(
          await ExchangeContractAsUser.fills(hashKey(orderLeft))
        ).to.be.equal(0);
        expect(
          await ExchangeContractAsUser.fills(hashKey(orderRight))
        ).to.be.equal(0);

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

      it('should allow ERC721 tokens exchange if PARTNERS is activated and token is whitelisted', async function () {
        expect(
          await ExchangeContractAsUser.fills(hashKey(orderLeft))
        ).to.be.equal(0);
        expect(
          await ExchangeContractAsUser.fills(hashKey(orderRight))
        ).to.be.equal(0);

        await OrderValidatorAsAdmin.disableWhitelists();
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

      it('should allow ERC721 tokens exchange if TSB_ROLE and PARTNER_ROLE are activated but so is open', async function () {
        expect(
          await ExchangeContractAsUser.fills(hashKey(orderLeft))
        ).to.be.equal(0);
        expect(
          await ExchangeContractAsUser.fills(hashKey(orderRight))
        ).to.be.equal(0);

        const PARTNER_ROLE = await OrderValidatorAsAdmin.PARTNER_ROLE();
        const TSB_ROLE = await OrderValidatorAsAdmin.PARTNER_ROLE();
        await OrderValidatorAsAdmin.setRolesEnabled(
          [PARTNER_ROLE, TSB_ROLE],
          [true, true]
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
    });
  });
}
