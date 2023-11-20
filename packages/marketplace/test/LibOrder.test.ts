/* eslint-disable mocha/no-setup-in-describe */
import {loadFixture} from '@nomicfoundation/hardhat-network-helpers';
import {expect} from 'chai';
import {
  buySellTest,
  deployLibAssetTest,
  fillOrder,
  fillOrder4Tests,
  fillOrderTest,
} from './utils/fill';

const UINT_MAX = 2n ** 256n - 1n;
const SQRT_UINT_MAX = 2n ** 128n;

describe('LibOrder.sol fill', function () {
  describe('first part: take into account fill (in storage we track the take side)', function () {
    describe('rounding error in calculateRemaining', function () {
      describe('should revert when there is a rounding error', function () {
        it('a user asks for 999 Sand giving 2 nft (price 499.5 Sand/nft) one is filled', async function () {
          const {libOrderMock} = await loadFixture(deployLibAssetTest);
          // A user asks for 999 Sand giving 2 nft (price 499.5 Sand/nft), but
          // one was already used fill = 1.
          // When converting the remaining nft from the take side to make
          // side (2 nft - 1 nft == 1 nft) you get 499.5 Sand. The rounded value is
          // between 499 and 500 Sand.
          // We have an error that is grater than 0.1%
          const fill = 1;
          await expect(
            libOrderMock.calculateRemaining(fillOrder(999n, 2n), fill)
          ).to.be.revertedWith('rounding error');
        });
      });
      it('should success when the rounding error is less than 0.1%', async function () {
        const {libOrderMock} = await loadFixture(deployLibAssetTest);
        // But if the user asks for 1000, then error is zero
        await libOrderMock.calculateRemaining(fillOrder(1000n, 2n), 1);
      });
    });
  });
  describe('second part (fill=0): compare prices (make/take) and fill the order (giving some advantage to right)', function () {
    fillOrder4Tests({
      leftTakeValue: 10,
      leftMakeValue: 20_000,
      leftFill: 0,
      rightTakeValue: 10_000,
      rightMakeValue: 8,
      rightFill: 0,
    });
    fillOrder4Tests({
      leftTakeValue: 6,
      leftMakeValue: 12_000,
      leftFill: 0,
      rightTakeValue: 8_000,
      rightMakeValue: 8,
      rightFill: 0,
    });
    fillOrder4Tests({
      leftTakeValue: 10,
      leftMakeValue: 20_000,
      leftFill: 0,
      rightTakeValue: 4_000,
      rightMakeValue: 2,
      rightFill: 0,
    });

    describe('right order make is checked and ignored if gt price (leftMakeValue >= rightTakeValue)', function () {
      fillOrderTest({
        leftTakeValue: 100,
        leftMakeValue: 10,
        leftFill: 0,
        rightTakeValue: 10,
        rightMakeValue: 100_000_000_000_000,
        rightFill: 0,
      });
      fillOrderTest({
        leftTakeValue: 10,
        leftMakeValue: 200,
        leftFill: 0,
        rightTakeValue: 100,
        rightMakeValue: 100_000_000_000_000,
        rightFill: 0,
      });
      fillOrderTest({
        leftTakeValue: 100,
        leftMakeValue: 100,
        leftFill: 0,
        rightTakeValue: 100,
        rightMakeValue: 99,
        rightFill: 0,
      });
      fillOrderTest({
        leftTakeValue: 100,
        leftMakeValue: 99,
        leftFill: 0,
        rightTakeValue: 100,
        rightMakeValue: 100,
        rightFill: 0,
      });
    });

    describe('left order is used, right is checked and ignored (leftMakeValue < rightTakeValue)', function () {
      fillOrderTest({
        leftTakeValue: 10,
        leftMakeValue: 10,
        leftFill: 0,
        rightTakeValue: 10,
        rightMakeValue: 100_000_000_000_000,
        rightFill: 0,
      });
      fillOrderTest({
        leftTakeValue: 10,
        leftMakeValue: 10,
        leftFill: 0,
        rightTakeValue: 100_000_000_000_000,
        rightMakeValue: 100_000_000_000_000,
        rightFill: 0,
      });
      fillOrderTest({
        leftTakeValue: 10,
        leftMakeValue: 10,
        leftFill: 0,
        rightTakeValue: 11,
        rightMakeValue: 10,
        rightFill: 0,
      });
      fillOrderTest({
        leftTakeValue: 1,
        leftMakeValue: 100,
        leftFill: 0,
        rightTakeValue: (2 * 100 * 100_000_000_000_000) / 100,
        rightMakeValue: (2 * 100_000_000_000_000) / 100,
        rightFill: 0,
      });
      fillOrderTest({
        leftTakeValue: 1,
        leftMakeValue: 100,
        leftFill: 0,
        rightTakeValue: 100 + 1,
        rightMakeValue: 1,
        rightFill: 0,
      });
    });
  });
  describe('both parts integrated', function () {
    describe('buySellTests', function () {
      describe('UINT_MAX vs 1', function () {
        buySellTest(UINT_MAX, 1n);
      });
      describe('1 vs 1', function () {
        buySellTest(1n, 1n);
      });
      describe('sqrt(UINT_MAX)-1 vs sqrt(UINT_MAX)', function () {
        buySellTest(SQRT_UINT_MAX - 1n, SQRT_UINT_MAX);
      });
    });
    describe('overflow', function () {
      it('should overflow when p1 and p2 > UINT_MAX * SQRT_UINT_MAX + 1', async function () {
        const {libOrderMock} = await loadFixture(deployLibAssetTest);
        const p1 = UINT_MAX;
        const p2 = SQRT_UINT_MAX + 1n;
        const leftOrder = fillOrder(p1, p2);
        const rightOrder = fillOrder(p2, p1);

        await expect(
          libOrderMock.fillOrder(leftOrder, rightOrder, 0n, 0n)
        ).to.be.revertedWithPanic(0x11);

        // swap orders
        await expect(
          libOrderMock.fillOrder(rightOrder, leftOrder, 0n, 0n)
        ).to.be.revertedWithPanic(0x11);
      });
      it('should underflow when p1 - fill < 0', async function () {
        const {libOrderMock} = await loadFixture(deployLibAssetTest);
        const p1 = 1n;
        const p2 = 1n;
        const leftOrder = fillOrder(p1, p2);
        const rightOrder = fillOrder(p2, p1);

        await expect(
          libOrderMock.fillOrder(leftOrder, rightOrder, 2n, 0n)
        ).to.be.revertedWith('filling more than order permits');

        // swap orders
        await expect(
          libOrderMock.fillOrder(rightOrder, leftOrder, 0n, 2n)
        ).to.be.revertedWith('filling more than order permits');
      });
    });
    describe('zero', function () {
      it('should revert with price zero', async function () {
        const {libOrderMock} = await loadFixture(deployLibAssetTest);
        const p1 = 0;
        const p2 = 1;
        const leftOrder = fillOrder(p1, p2);
        const rightOrder = fillOrder(p2, p1);

        await expect(
          libOrderMock.fillOrder(leftOrder, rightOrder, 0n, 0n)
        ).to.be.revertedWith('division by zero');

        // swap orders
        await expect(
          libOrderMock.fillOrder(rightOrder, leftOrder, 0n, 0n)
        ).to.be.revertedWith('division by zero');
      });
      it('should success with full order (after value - fill == zero)', async function () {
        const {libOrderMock} = await loadFixture(deployLibAssetTest);
        const p1 = 100n;
        const p2 = 1n;
        const leftOrder = fillOrder(p1, p2);
        const rightOrder = fillOrder(p2, p1);

        const [leftFill, rightFill] = await libOrderMock.fillOrder(
          leftOrder,
          rightOrder,
          1,
          100
        );
        expect(leftFill).to.be.equal(0);
        expect(rightFill).to.be.equal(0);

        // swap orders
        const [leftFill2, rightFill2] = await libOrderMock.fillOrder(
          rightOrder,
          leftOrder,
          100,
          1
        );
        expect(leftFill2).to.be.equal(0);
        expect(rightFill2).to.be.equal(0);
      });
    });
    describe('when fill != 0 the orders are consumed on the take side, make side is not completely consumed', function () {
      // fillOrderTest({
      //   leftTakeValue: 4,
      //   leftMakeValue: 8000,
      //   leftFill: 0,
      //   rightTakeValue: 8000,
      //   rightMakeValue: 8,
      //   rightFill: 0,
      // });
      for (let i = 1; i <= 10; i++) {
        fillOrder4Tests({
          leftTakeValue: 10,
          leftMakeValue: 20000,
          leftFill: i,
          rightTakeValue: 10000,
          rightMakeValue: 10,
          rightFill: 2000,
        });
      }
    });
  });
});
