import {expect} from 'chai';
import {deployFixtures} from '../fixtures/index.ts';
import {loadFixture} from '@nomicfoundation/hardhat-network-helpers';
import {AssetERC20, AssetERC721, Asset} from '../utils/assets.ts';

import {getSymmetricOrder, OrderDefault, signOrder} from '../utils/order.ts';
import {ZeroAddress, Contract, Signer} from 'ethers';

// eslint-disable-next-line mocha/no-exports
export function shouldMatchOrderForBatching() {
  describe('Exchange MatchOrders for batching', function () {
    let ExchangeContractAsUser: Contract,
      OrderValidatorAsAdmin: Contract,
      ERC20Contract: Contract,
      ERC721Contract: Contract,
      maker: Signer,
      taker: Signer,
      takerAsset: Asset,
      totalPayment: number;

    beforeEach(async function () {
      ({
        ExchangeContractAsUser,
        OrderValidatorAsAdmin,
        ERC20Contract,
        ERC721Contract,
        user2: maker,
        user: taker,
      } = await loadFixture(deployFixtures));

      const ERC20Role = await OrderValidatorAsAdmin.ERC20_ROLE();

      await OrderValidatorAsAdmin.grantRole(
        ERC20Role,
        await ERC20Contract.getAddress()
      );
    });

    it('should be able to buy 2 tokens from different orders in one txs', async function () {
      totalPayment = 200;
      await ERC20Contract.mint(taker.getAddress(), totalPayment);
      await ERC20Contract.connect(taker).approve(
        await ExchangeContractAsUser.getAddress(),
        totalPayment
      );
      await ERC721Contract.mint(maker.getAddress(), 123);
      await ERC721Contract.connect(maker).approve(
        await ExchangeContractAsUser.getAddress(),
        123
      );
      await ERC721Contract.mint(maker.getAddress(), 345);
      await ERC721Contract.connect(maker).approve(
        await ExchangeContractAsUser.getAddress(),
        345
      );

      expect(await ERC20Contract.balanceOf(taker)).to.be.equal(totalPayment);
      expect(await ERC20Contract.balanceOf(maker)).to.be.equal(0);

      expect(await ERC721Contract.ownerOf(123)).to.be.equal(
        await maker.getAddress()
      );
      expect(await ERC721Contract.ownerOf(345)).to.be.equal(
        await maker.getAddress()
      );

      takerAsset = await AssetERC20(ERC20Contract, totalPayment / 2);
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
      expect(await ERC20Contract.balanceOf(maker)).to.be.equal(
        196 // 200 - protocolFee
      );

      expect(await ERC721Contract.ownerOf(123)).to.be.equal(
        await taker.getAddress()
      );
      expect(await ERC721Contract.ownerOf(345)).to.be.equal(
        await taker.getAddress()
      );
    });

    it('should be able to buy 3 tokens from different orders in one txs', async function () {
      totalPayment = 300;
      await ERC20Contract.mint(taker.getAddress(), totalPayment);
      await ERC20Contract.connect(taker).approve(
        await ExchangeContractAsUser.getAddress(),
        totalPayment
      );

      for (let i = 0; i < 3; i++) {
        await ERC721Contract.mint(maker.getAddress(), i);
        await ERC721Contract.connect(maker).approve(
          await ExchangeContractAsUser.getAddress(),
          i
        );
      }

      expect(await ERC20Contract.balanceOf(taker)).to.be.equal(totalPayment);
      expect(await ERC20Contract.balanceOf(maker)).to.be.equal(0);

      for (let i = 0; i < 3; i++) {
        expect(await ERC721Contract.ownerOf(i)).to.be.equal(
          await maker.getAddress()
        );
      }

      takerAsset = await AssetERC20(ERC20Contract, totalPayment / 3);

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
        expect(await ERC721Contract.ownerOf(i)).to.be.equal(
          await taker.getAddress()
        );
      }
    });

    // eslint-disable-next-line mocha/no-skipped-tests
    it.skip('@slow should be able to buy 20 tokens from different orders in one txs', async function () {
      totalPayment = 2000;
      await ERC20Contract.mint(taker.getAddress(), totalPayment);
      await ERC20Contract.connect(taker).approve(
        await ExchangeContractAsUser.getAddress(),
        totalPayment
      );

      for (let i = 0; i < 20; i++) {
        await ERC721Contract.mint(maker.getAddress(), i);
        await ERC721Contract.connect(maker).approve(
          await ExchangeContractAsUser.getAddress(),
          i
        );
      }

      expect(await ERC20Contract.balanceOf(taker)).to.be.equal(totalPayment);
      expect(await ERC20Contract.balanceOf(maker)).to.be.equal(0);

      for (let i = 0; i < 20; i++) {
        expect(await ERC721Contract.ownerOf(i)).to.be.equal(
          await maker.getAddress()
        );
      }

      takerAsset = await AssetERC20(ERC20Contract, totalPayment / 20);

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
        expect(await ERC721Contract.ownerOf(i)).to.be.equal(
          await taker.getAddress()
        );
      }
    });

    // eslint-disable-next-line mocha/no-skipped-tests
    it.skip('@slow should be able to buy 50 tokens from different orders in one txs', async function () {
      totalPayment = 5000;
      await ERC20Contract.mint(taker.getAddress(), totalPayment);
      await ERC20Contract.connect(taker).approve(
        await ExchangeContractAsUser.getAddress(),
        totalPayment
      );

      for (let i = 0; i < 50; i++) {
        await ERC721Contract.mint(maker.getAddress(), i);
        await ERC721Contract.connect(maker).approve(
          await ExchangeContractAsUser.getAddress(),
          i
        );
      }

      expect(await ERC20Contract.balanceOf(taker)).to.be.equal(totalPayment);
      expect(await ERC20Contract.balanceOf(maker)).to.be.equal(0);

      for (let i = 0; i < 50; i++) {
        expect(await ERC721Contract.ownerOf(i)).to.be.equal(
          await maker.getAddress()
        );
      }

      takerAsset = await AssetERC20(ERC20Contract, totalPayment / 50);

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
        expect(await ERC721Contract.ownerOf(i)).to.be.equal(
          await taker.getAddress()
        );
      }
    });

    it('should not be able to buy 51 tokens from different orders in one txs, match orders limit = 50', async function () {
      totalPayment = 5100;
      await ERC20Contract.mint(taker.getAddress(), totalPayment);
      await ERC20Contract.connect(taker).approve(
        await ExchangeContractAsUser.getAddress(),
        totalPayment
      );

      for (let i = 0; i < 51; i++) {
        await ERC721Contract.mint(maker.getAddress(), i);
        await ERC721Contract.connect(maker).approve(
          await ExchangeContractAsUser.getAddress(),
          i
        );
      }

      expect(await ERC20Contract.balanceOf(taker)).to.be.equal(totalPayment);
      expect(await ERC20Contract.balanceOf(maker)).to.be.equal(0);

      for (let i = 0; i < 51; i++) {
        expect(await ERC721Contract.ownerOf(i)).to.be.equal(
          await maker.getAddress()
        );
      }

      takerAsset = await AssetERC20(ERC20Contract, totalPayment / 51);

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
}
