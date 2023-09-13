const LibOrderTest = artifacts.require('LibOrderTest.sol');

const order = require('./utils/order.js');
const {ORDER_DATA_SELL} = require('./utils/assets.js');

const ZERO = '0x0000000000000000000000000000000000000000';
const {expectThrow} = require('@daonomic/tests-common');

contract('LibOrder', (accounts) => {
  let lib;

  before(async function () {
    lib = await LibOrderTest.new();
  });

  describe('calculateRemaining', function () {
    it('should calculate remaining amounts if fill=0', async function () {
      const make = order.Asset('0x00000000', '0x', 100);
      const take = order.Asset('0x00000000', '0x', 200);
      const result = await lib.calculateRemaining(
        order.Order(ZERO, make, ZERO, take, 1, 0, 0, '0xffffffff', '0x'),
        0,
        false
      );
      assert.equal(result[0], 100);
      assert.equal(result[1], 200);
    });

    it('should calculate remaining amounts if fill is specified', async function () {
      const make = order.Asset('0x00000000', '0x', 100);
      const take = order.Asset('0x00000000', '0x', 200);
      const result = await lib.calculateRemaining(
        order.Order(ZERO, make, ZERO, take, 1, 0, 0, '0xffffffff', '0x'),
        20,
        false
      );
      assert.equal(result[0], 90);
      assert.equal(result[1], 180);
    });

    it('should return 0s if filled fully', async function () {
      const make = order.Asset('0x00000000', '0x', 100);
      const take = order.Asset('0x00000000', '0x', 200);
      const result = await lib.calculateRemaining(
        order.Order(ZERO, make, ZERO, take, 1, 0, 0, '0xffffffff', '0x'),
        200,
        false
      );
      assert.equal(result[0], 0);
      assert.equal(result[1], 0);
    });

    it('should throw if fill is more than in the order', async function () {
      const make = order.Asset('0x00000000', '0x', 100);
      const take = order.Asset('0x00000000', '0x', 200);
      await expectThrow(
        lib.calculateRemaining(
          order.Order(ZERO, make, ZERO, take, 1, 0, 0, '0xffffffff', '0x'),
          220,
          false
        )
      );
    });

    it('should return correct reaming value for makeFill = true', async function () {
      const make = order.Asset('0x00000000', '0x', 200);
      const take = order.Asset('0x00000000', '0x', 600);
      const result = await lib.calculateRemaining(
        order.Order(ZERO, make, ZERO, take, 1, 0, 0, ORDER_DATA_SELL, '0x'),
        100,
        true
      );
      assert.equal(result.makeAmount, 100, 'makeAmount');
      assert.equal(result.takeAmount, 300, 'takeAmount');
    });

    it('should return correct reaming value for makeFill = false', async function () {
      const make = order.Asset('0x00000000', '0x', 100);
      const take = order.Asset('0x00000000', '0x', 200);
      const result = await lib.calculateRemaining(
        order.Order(ZERO, make, ZERO, take, 1, 0, 0, ORDER_DATA_SELL, '0x'),
        20,
        false
      );
      assert.equal(result.makeAmount, 90, 'makeAmount');
      assert.equal(result.takeAmount, 180, 'takeAmount');
    });
  });

  describe('validate', function () {
    let testAsset;

    beforeEach(async function () {
      testAsset = order.Asset('0x00000000', '0x', 100);
    });

    it('should not throw if dates not set', async function () {
      await lib.validate(
        order.Order(
          ZERO,
          testAsset,
          ZERO,
          testAsset,
          0,
          0,
          0,
          '0xffffffff',
          '0x'
        )
      );
    });

    it('should not throw if dates are correct', async function () {
      const now = parseInt(new Date() / 1000);
      await lib.validate(
        order.Order(
          ZERO,
          testAsset,
          ZERO,
          testAsset,
          0,
          now - 100,
          now + 100,
          '0xffffffff',
          '0x'
        )
      );
    });

    it('should throw if start date error', async function () {
      const now = parseInt(new Date() / 1000);
      await expectThrow(
        lib.validate(
          order.Order(
            ZERO,
            testAsset,
            ZERO,
            testAsset,
            0,
            now + 100,
            0,
            '0xffffffff',
            '0x'
          )
        )
      );
    });

    it('should throw if end date error', async function () {
      const now = parseInt(new Date() / 1000);
      await expectThrow(
        lib.validate(
          order.Order(
            ZERO,
            testAsset,
            ZERO,
            testAsset,
            0,
            0,
            now - 100,
            '0xffffffff',
            '0x'
          )
        )
      );
    });

    it('should throw if both dates error', async function () {
      const now = parseInt(new Date() / 1000);
      await expectThrow(
        lib.validate(
          order.Order(
            ZERO,
            testAsset,
            ZERO,
            testAsset,
            0,
            now + 100,
            now - 100,
            '0xffffffff',
            '0x'
          )
        )
      );
    });
  });

  describe('hashKey', function () {
    let maker;
    let makeAsset;
    let takeAsset;
    const salt = 1;
    const data = '0x12';

    beforeEach(async function () {
      maker = accounts[1];
      makeAsset = order.Asset('0x00000000', '0x', 100);
      takeAsset = order.Asset('0x00000000', '0x', 100);
    });

    it('should calculate correct hash key for no type order', async function () {
      const test_order = order.Order(
        maker,
        makeAsset,
        ZERO,
        takeAsset,
        salt,
        0,
        0,
        '0xffffffff',
        data
      );

      const hash = await lib.hashKey(test_order);
      const test_hash = await lib.hashV1(maker, makeAsset, takeAsset, salt);
      const test_wrong_hash = await lib.hashV2(
        maker,
        makeAsset,
        takeAsset,
        salt,
        data
      );

      assert.notEqual(hash, test_wrong_hash, 'not equal to wrong hash');
      assert.equal(hash, test_hash, 'correct hash no type order');
    });
  });
});
