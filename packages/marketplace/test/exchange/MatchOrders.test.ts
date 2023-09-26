import {deployFixturesWithExtraTokens} from '../fixtures';
import {loadFixture} from '@nomicfoundation/hardhat-network-helpers';
import {expect} from 'chai';
import {
  AssetBundle,
  AssetERC1155,
  AssetERC20,
  AssetERC721,
} from '../utils/assets.ts';
import * as crypto from 'crypto';

import {OrderDefault} from '../utils/order.ts';
import {ethers, ZeroAddress} from 'ethers';
import {signOrder} from '../utils/signature';
import {latest} from '@nomicfoundation/hardhat-network-helpers/dist/src/helpers/time';

describe('Exchange match orders tests', function () {
  describe('without royalties', function () {
    describe('erc20 x erc20', function () {
      it('match order', async function () {
        const {
          ExchangeContractAsUser,
          user1: maker,
          user2: taker,
          ERC20Contract,
          ERC20Contract2,
          matchOrders,
        } = await loadFixture(deployFixturesWithExtraTokens);
        const makerAmount = ethers.parseUnits('12', 'ether');
        const takerAmount = ethers.parseUnits('23', 'ether');
        const t1 = ERC20Contract;
        const t2 = ERC20Contract2;

        await t1.mint(maker.address, makerAmount);
        await t1
          .connect(maker)
          .approve(await ExchangeContractAsUser.getAddress(), makerAmount);

        await t2.mint(taker.address, takerAmount);
        await t2
          .connect(taker)
          .approve(await ExchangeContractAsUser.getAddress(), takerAmount);

        expect(await t1.balanceOf(maker)).to.be.equal(makerAmount);
        expect(await t1.balanceOf(taker)).to.be.equal(0);
        expect(await t2.balanceOf(maker)).to.be.equal(0);
        expect(await t2.balanceOf(taker)).to.be.equal(takerAmount);

        const makerAsset = await AssetERC20(t1, makerAmount);
        const takerAsset = await AssetERC20(t2, takerAmount);
        await matchOrders(maker, makerAsset, taker, takerAsset);

        expect(await t1.balanceOf(maker)).to.be.equal(0);
        expect(await t1.balanceOf(taker)).to.be.equal(makerAmount);
        expect(await t2.balanceOf(maker)).to.be.equal(takerAmount);
        expect(await t2.balanceOf(taker)).to.be.equal(0);
      });

      it('directAcceptBid maker accept from anyone, taker is bidMaker', async function () {
        const {
          ExchangeContractAsUser,
          OrderValidatorAsDeployer,
          user1: maker,
          user2: taker,
          ERC20Contract,
          ERC20Contract2,
        } = await loadFixture(deployFixturesWithExtraTokens);
        // This generate a sell order that anybody can take, the first one that runs the right tx get it => front running ?
        const bidPaymentAmount = ethers.parseUnits('12', 'ether');
        const bidNftAmount = ethers.parseUnits('23', 'ether');
        const bidMaker = taker;
        const t1 = ERC20Contract;
        const t2 = ERC20Contract2;

        await t1.mint(maker.address, bidNftAmount);
        await t1
          .connect(maker)
          .approve(await ExchangeContractAsUser.getAddress(), bidNftAmount);

        await t2.mint(taker.address, bidPaymentAmount);
        await t2
          .connect(taker)
          .approve(await ExchangeContractAsUser.getAddress(), bidPaymentAmount);

        const bidSalt = BigInt('0x' + crypto.randomBytes(16).toString('hex'));
        const timestamp = await latest();
        const bidStart = timestamp - 100000;
        const bidEnd = timestamp + 100000;

        const bidPaymentAsset = await AssetERC20(t2, bidPaymentAmount);
        const bidNftAsset = await AssetERC20(t1, bidNftAmount);
        // This creates a taker order with ERC20 or ETH and a taker order with anything (here we choose t2).
        const rightOrder = await OrderDefault(
          bidMaker,
          bidPaymentAsset,
          ZeroAddress,
          bidNftAsset,
          bidSalt,
          bidStart,
          bidEnd
        );

        const bidSignature = await signOrder(
          rightOrder,
          bidMaker,
          OrderValidatorAsDeployer
        );

        const acceptBid = {
          bidMaker,
          bidNftAmount,
          nftAssetClass: bidNftAsset.assetType.assetClass,
          nftData: bidNftAsset.assetType.data,
          bidPaymentAmount,
          paymentToken: await t2.getAddress(),
          bidSalt,
          bidStart,
          bidEnd,
          bidDataType: rightOrder.dataType,
          bidData: rightOrder.data,
          bidSignature,
          sellOrderPaymentAmount: bidPaymentAmount,
          sellOrderNftAmount: bidNftAmount,
          sellOrderData: '0x',
        };

        expect(await t1.balanceOf(maker)).to.be.equal(bidNftAmount);
        expect(await t1.balanceOf(bidMaker)).to.be.equal(0);
        expect(await t2.balanceOf(maker)).to.be.equal(0);
        expect(await t2.balanceOf(bidMaker)).to.be.equal(bidPaymentAmount);

        await ExchangeContractAsUser.connect(maker).directAcceptBid(acceptBid);

        expect(await t1.balanceOf(maker)).to.be.equal(0);
        expect(await t1.balanceOf(bidMaker)).to.be.equal(bidNftAmount);
        expect(await t2.balanceOf(maker)).to.be.equal(bidPaymentAmount);
        expect(await t2.balanceOf(bidMaker)).to.be.equal(0);
      });
    });

    // TODO: Doesn't exists anymore
    // eslint-disable-next-line mocha/no-skipped-tests
    it.skip('directPurchase, maker is sellOrderMaker taker can be anyone', async function () {
      //   const sellOrderNftAmount = parseUnits('12', 'ether');
      //   const sellOrderPaymentAmount = parseUnits('23', 'ether');
      //   const sellOrderMaker = maker;
      //
      //   const t1 = await ERC20Contract.new({from: deployer});
      //   const nftData = enc(t1.address);
      //   const nftAssetClass = ERC20;
      //   const t2 = await ERC20Contract.new({from: deployer});
      //   const paymentToken = t2.address;
      //   const paymentAssetType = ERC20;
      //
      //   await t1.mint(sellOrderMaker, sellOrderNftAmount);
      //   await t1.approve(await ExchangeContractAsUser.getAddress(), sellOrderNftAmount, {
      //     from: sellOrderMaker
      //   });
      //
      //   await t2.mint(taker, sellOrderPaymentAmount);
      //   await t2.approve(await ExchangeContractAsUser.getAddress(), sellOrderPaymentAmount, {
      //     from: taker
      //   });
      //
      //   const sellOrderSalt = '0x' + crypto.randomBytes(16).toString('hex');
      //   const currentBlock = await web3.eth.getBlock('latest');
      //   const sellOrderStart = currentBlock.timestamp - 100000;
      //   const sellOrderEnd = currentBlock.timestamp + 100000;
      //   const sellOrderDataType = '0xffffffff';
      //   const sellOrderData = '0x';
      //
      //   // This creates a maker order with ERC20 or ETH and a taker order with anything (here we choose t2).
      //   const leftOrder = Order(
      //     sellOrderMaker,
      //     Asset(ERC20, nftData, sellOrderNftAmount),
      //     AddressZero,
      //     Asset(paymentAssetType, enc(paymentToken), sellOrderPaymentAmount),
      //     sellOrderSalt,
      //     sellOrderStart,
      //     sellOrderEnd,
      //     sellOrderDataType,
      //     sellOrderData
      //   );
      //
      //   const sellOrderSignature = await sign(
      //     web3,
      //     leftOrder,
      //     sellOrderMaker,
      //     this.exchange.address
      //   );
      //
      //   const purchase = {
      //     sellOrderMaker,
      //     sellOrderNftAmount,
      //     nftAssetClass,
      //     nftData,
      //     sellOrderPaymentAmount,
      //     paymentToken,
      //     sellOrderSalt,
      //     sellOrderStart,
      //     sellOrderEnd,
      //     sellOrderDataType,
      //     sellOrderData,
      //     sellOrderSignature,
      //     buyOrderPaymentAmount: sellOrderPaymentAmount,
      //     buyOrderNftAmount: sellOrderNftAmount,
      //     buyOrderData: '0x'
      //   };
      //
      //   expect(await t1.balanceOf(sellOrderMaker), sellOrderNftAmount);
      //   expect(await t1.balanceOf(taker), 0);
      //   expect(await t2.balanceOf(sellOrderMaker), 0);
      //   expect(await t2.balanceOf(taker), sellOrderPaymentAmount);
      //
      //   await this.exchange.directPurchase(purchase, {from: taker});
      //
      //   expect(await t1.balanceOf(sellOrderMaker), 0);
      //   expect(await t1.balanceOf(taker), sellOrderNftAmount);
      //   expect(await t2.balanceOf(sellOrderMaker), sellOrderPaymentAmount);
      //   expect(await t2.balanceOf(taker), 0);
    });

    describe('erc721 x erc721', function () {
      it('match order', async function () {
        const {
          ExchangeContractAsUser,
          user1: maker,
          user2: taker,
          ERC721Contract,
          MintableERC721WithRoyalties,
          matchOrders,
        } = await loadFixture(deployFixturesWithExtraTokens);

        const makerTokenId = 123;
        const takerTokenId = 456;
        const t1 = ERC721Contract;
        const t2 = MintableERC721WithRoyalties;

        await t1.mint(maker.address, makerTokenId);
        await t1
          .connect(maker)
          .setApprovalForAll(await ExchangeContractAsUser.getAddress(), true);

        await t2.safeMint(taker.address, takerTokenId);
        await t2
          .connect(taker)
          .setApprovalForAll(await ExchangeContractAsUser.getAddress(), true);

        expect(await t1.ownerOf(makerTokenId)).to.be.equal(maker.address);
        expect(await t2.ownerOf(takerTokenId)).to.be.equal(taker.address);

        const makerAsset = await AssetERC721(t1, makerTokenId);
        const takerAsset = await AssetERC721(t2, takerTokenId);
        await matchOrders(maker, makerAsset, taker, takerAsset);

        expect(await t1.ownerOf(makerTokenId)).to.be.equal(taker.address);
        expect(await t2.ownerOf(takerTokenId)).to.be.equal(maker.address);
      });
    });

    describe('erc1155 x erc1155', function () {
      it('match order', async function () {
        const {
          ExchangeContractAsUser,
          user1: maker,
          user2: taker,
          ERC1155Contract,
          MintableERC1155WithRoyalties,
          matchOrders,
        } = await loadFixture(deployFixturesWithExtraTokens);

        const makerTokenId = 123;
        const makerQuantity = 10;
        const takerTokenId = 456;
        const takerQuantity = 30;
        const t1 = ERC1155Contract;
        const t2 = MintableERC1155WithRoyalties;

        await t1.mint(maker.address, makerTokenId, makerQuantity);
        await t1
          .connect(maker)
          .setApprovalForAll(await ExchangeContractAsUser.getAddress(), true);

        await t2.mint(taker.address, takerTokenId, takerQuantity, '0x');
        await t2
          .connect(taker)
          .setApprovalForAll(await ExchangeContractAsUser.getAddress(), true);

        const makerAsset = await AssetERC1155(t1, makerTokenId, makerQuantity);
        const takerAsset = await AssetERC1155(t2, takerTokenId, takerQuantity);
        await matchOrders(maker, makerAsset, taker, takerAsset);

        expect(await t1.balanceOf(maker, makerTokenId)).to.be.equal(0);
        expect(await t1.balanceOf(taker, makerTokenId)).to.be.equal(
          makerQuantity
        );
        expect(await t2.balanceOf(maker, takerTokenId)).to.be.equal(
          takerQuantity
        );
        expect(await t2.balanceOf(taker, takerTokenId)).to.be.equal(0);
      });
    });

    describe('erc721 x erc20', function () {
      it('match order', async function () {
        const {
          ExchangeContractAsUser,
          user1: maker,
          user2: taker,
          ERC20Contract,
          ERC721Contract,
          matchOrders,
        } = await loadFixture(deployFixturesWithExtraTokens);

        const tokenId = 345;
        const amount = ethers.parseUnits('12', 'ether');

        const t1 = ERC721Contract;
        const t2 = ERC20Contract;

        await t1.mint(maker.address, tokenId);
        await t1
          .connect(maker)
          .setApprovalForAll(await ExchangeContractAsUser.getAddress(), true);

        await t2.mint(taker.address, amount);
        await t2
          .connect(taker)
          .approve(await ExchangeContractAsUser.getAddress(), amount);
        expect(await t1.ownerOf(tokenId)).to.be.equal(maker.address);
        expect(await t2.balanceOf(maker)).to.be.equal(0);
        expect(await t2.balanceOf(taker)).to.be.equal(amount);

        const makerAsset = await AssetERC721(t1, tokenId);
        const takerAsset = await AssetERC20(t2, amount);
        await matchOrders(maker, makerAsset, taker, takerAsset);

        expect(await t1.ownerOf(tokenId)).to.be.equal(taker.address);
        expect(await t2.balanceOf(maker)).to.be.equal(amount);
        expect(await t2.balanceOf(taker)).to.be.equal(0);
      });
    });

    describe('bundle', function () {
      it('match order', async function () {
        const {
          ExchangeContractAsUser,
          user1: maker,
          user2: taker,
          ERC20Contract,
          ERC721Contract,
          ERC1155Contract,
          matchOrders,
        } = await loadFixture(deployFixturesWithExtraTokens);

        const makerTokenId = 123;
        const makerQuantity = 10;
        const takerTokenId = 456;
        const takerQuantity = 30;
        const makerAmount = ethers.parseUnits('10', 'ether');
        const takerAmount = ethers.parseUnits('1', 'ether');

        const t1 = ERC20Contract;
        const t2 = ERC721Contract;
        const t3 = ERC1155Contract;

        // Maker
        await t1.mint(maker.address, makerAmount);
        await t1
          .connect(maker)
          .approve(await ExchangeContractAsUser.getAddress(), makerAmount);

        await t2.mint(maker.address, makerTokenId);
        await t2
          .connect(maker)
          .setApprovalForAll(await ExchangeContractAsUser.getAddress(), true);
        await t3.mint(maker.address, makerTokenId, makerQuantity);
        await t3
          .connect(maker)
          .setApprovalForAll(await ExchangeContractAsUser.getAddress(), true);

        // taker
        await t1.mint(taker.address, takerAmount);
        await t1
          .connect(taker)
          .approve(await ExchangeContractAsUser.getAddress(), takerAmount);
        await t2.mint(taker.address, takerTokenId);
        await t2
          .connect(taker)
          .setApprovalForAll(await ExchangeContractAsUser.getAddress(), true);
        await t3.mint(taker.address, takerTokenId, takerQuantity);
        await t3
          .connect(taker)
          .setApprovalForAll(await ExchangeContractAsUser.getAddress(), true);

        const makerAsset = await AssetBundle(
          [{token: t1, value: makerAmount}],
          [{token: t2, tokenId: makerTokenId}],
          [{token: t3, tokenId: makerTokenId, value: makerQuantity}]
        );
        const takerAsset = await AssetBundle(
          [{token: t1, value: takerAmount}],
          [{token: t2, tokenId: takerTokenId}],
          [{token: t3, tokenId: takerTokenId, value: takerQuantity}]
        );
        await matchOrders(maker, makerAsset, taker, takerAsset);

        expect(await t1.balanceOf(maker)).to.be.equal(takerAmount);
        expect(await t1.balanceOf(taker)).to.be.equal(makerAmount);

        expect(await t2.ownerOf(makerTokenId)).to.be.equal(taker.address);
        expect(await t2.ownerOf(takerTokenId)).to.be.equal(maker.address);

        expect(await t3.balanceOf(maker, makerTokenId)).to.be.equal(0);
        expect(await t3.balanceOf(taker, makerTokenId)).to.be.equal(
          makerQuantity
        );
        expect(await t3.balanceOf(maker, takerTokenId)).to.be.equal(
          takerQuantity
        );
        expect(await t3.balanceOf(taker, takerTokenId)).to.be.equal(0);
      });
    });
  });

  describe('with royalties', function () {
    describe('erc721 x erc20', function () {
      it('match order', async function () {
        const {
          ExchangeContractAsUser,
          deployer,
          user1: maker,
          user2: taker,
          ERC20Contract,
          MintableERC721WithRoyalties,
          matchOrders,
        } = await loadFixture(deployFixturesWithExtraTokens);

        const royaltiesParts = 123n;
        const tokenId = 345;
        const amount = ethers.parseUnits('12', 'ether');
        const tenTo18 = BigInt('1' + '0'.repeat(18));
        const royalties =
          (((amount * royaltiesParts) / tenTo18) * tenTo18) / 10000n;

        const t1 = MintableERC721WithRoyalties;
        await t1.setDefaultRoyalty(deployer.address, royaltiesParts);
        const t2 = ERC20Contract;

        await t1.safeMint(maker.address, tokenId);
        await t1
          .connect(maker)
          .setApprovalForAll(await ExchangeContractAsUser.getAddress(), true);

        await t2.mint(taker, amount);
        await t2
          .connect(taker)
          .approve(await ExchangeContractAsUser.getAddress(), amount);

        expect(await t1.ownerOf(tokenId)).to.be.equal(maker.address);
        expect(await t2.balanceOf(maker)).to.be.equal(0);
        expect(await t2.balanceOf(taker)).to.be.equal(amount);

        const makerAsset = await AssetERC721(t1, tokenId);
        const takerAsset = await AssetERC20(t2, amount);
        await matchOrders(maker, makerAsset, taker, takerAsset);

        expect(await t1.ownerOf(tokenId)).to.be.equal(taker.address);

        expect(await t2.balanceOf(deployer)).to.be.equal(royalties);
        expect(await t2.balanceOf(taker)).to.be.equal(0);
        expect(await t2.balanceOf(maker)).to.be.equal(amount - royalties);
      });
    });

    describe('erc1155 x erc20', function () {
      it('match order', async function () {
        const {
          ExchangeContractAsUser,
          deployer,
          user1: maker,
          user2: taker,
          ERC20Contract,
          MintableERC1155WithRoyalties,
          matchOrders,
        } = await loadFixture(deployFixturesWithExtraTokens);
        const royaltiesParts = 123n;
        const tokenId = 345;
        const quantity = 12;
        const amount = ethers.parseUnits('12', 'ether');
        const tenTo18 = BigInt('1' + '0'.repeat(18));
        const royalties =
          (((amount * royaltiesParts) / tenTo18) * tenTo18) / 10000n;

        const t1 = MintableERC1155WithRoyalties;
        await t1.setDefaultRoyalty(deployer.address, royaltiesParts);
        const t2 = ERC20Contract;

        // mint more than needed
        await t1.mint(maker, tokenId, quantity * 10, '0x');
        await t1
          .connect(maker)
          .setApprovalForAll(await ExchangeContractAsUser.getAddress(), true);

        await t2.mint(taker, amount);
        await t2
          .connect(taker)
          .approve(await ExchangeContractAsUser.getAddress(), amount);

        expect(await t1.balanceOf(maker, tokenId)).to.be.equal(quantity * 10);
        expect(await t1.balanceOf(taker, tokenId)).to.be.equal(0);
        expect(await t2.balanceOf(maker)).to.be.equal(0);
        expect(await t2.balanceOf(taker)).to.be.equal(amount);

        const makerAsset = await AssetERC1155(t1, tokenId, quantity);
        const takerAsset = await AssetERC20(t2, amount);
        await matchOrders(maker, makerAsset, taker, takerAsset);

        expect(await t1.balanceOf(maker, tokenId)).to.be.equal(quantity * 9);
        expect(await t1.balanceOf(taker, tokenId)).to.be.equal(quantity);

        expect(await t2.balanceOf(deployer)).to.be.equal(royalties);
        expect(await t2.balanceOf(taker)).to.be.equal(0);
        expect(await t2.balanceOf(maker)).to.be.equal(amount - royalties);
      });
    });
  });
});
