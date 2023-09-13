const TestERC1271 = artifacts.require('TestERC1271.sol');
const OrderValidator = artifacts.require('OrderValidator.sol');
const order = require('./utils/order.js');
const {ETH} = require('./utils/assets');
const ZERO = '0x0000000000000000000000000000000000000000';
const {expectThrow} = require('@daonomic/tests-common');

contract('OrderValidator', (accounts) => {
  let testing;
  let erc1271;

  before(async function () {
    testing = await OrderValidator.new();
    await testing.__OrderValidator_init_unchained(false, false, false, false);
    erc1271 = await TestERC1271.new();
  });

  it('Test1. should validate if signer is correct', async function () {
    const testOrder = order.Order(
      accounts[1],
      order.Asset(ETH, '0x', 100),
      ZERO,
      order.Asset(ETH, '0x', 200),
      1,
      0,
      0,
      ETH,
      '0x'
    );
    const signature = await getSignature(
      testOrder,
      accounts[1],
      testing.address
    );
    await testing.validate(testOrder, signature, accounts[0]);
  });

  it('Test2. should fail validate if signer is incorrect', async function () {
    const testOrder = order.Order(
      accounts[1],
      order.Asset(ETH, '0x', 100),
      ZERO,
      order.Asset(ETH, '0x', 200),
      1,
      0,
      0,
      ETH,
      '0x'
    );
    const signature = await getSignature(
      testOrder,
      accounts[2],
      testing.address
    );
    await expectThrow(testing.validate(testOrder, signature, accounts[0]));
  });

  it('Test3. should bypass signature if maker is msg.sender', async function () {
    const testOrder = order.Order(
      accounts[5],
      order.Asset(ETH, '0x', 100),
      ZERO,
      order.Asset(ETH, '0x', 200),
      1,
      0,
      0,
      ETH,
      '0x'
    );
    await testing.validate(testOrder, '0x', accounts[5], {from: accounts[5]});
  });

  it('Test4. should validate if signer is contract and 1271 passes', async function () {
    const testOrder = order.Order(
      erc1271.address,
      order.Asset(ETH, '0x', 100),
      ZERO,
      order.Asset(ETH, '0x', 200),
      1,
      0,
      0,
      ETH,
      '0x'
    );
    const signature = await getSignature(
      testOrder,
      accounts[2],
      testing.address
    );

    await expectThrow(testing.validate(testOrder, signature, accounts[0]));

    await erc1271.setReturnSuccessfulValidSignature(true);

    await testing.validate(testOrder, signature, accounts[0]);
  });

  it('Test5. should not validate contract don`t support ERC1271_INTERFACE', async function () {
    const testOrder = order.Order(
      testing.address,
      order.Asset(ETH, '0x', 100),
      ZERO,
      order.Asset(ETH, '0x', 200),
      1,
      0,
      0,
      ETH,
      '0x'
    );
    const signature = await getSignature(
      testOrder,
      accounts[2],
      testing.address
    );
    await expectThrow(testing.validate(testOrder, signature, accounts[0]));
  });

  it('Test6. should validate IERC1271 with empty signature', async function () {
    const testOrder = order.Order(
      erc1271.address,
      order.Asset(ETH, '0x', 100),
      ZERO,
      order.Asset(ETH, '0x', 200),
      1,
      0,
      0,
      ETH,
      '0x'
    );

    await erc1271.setReturnSuccessfulValidSignature(false);

    await expectThrow(testing.validate(testOrder, '0x', accounts[0]));

    await erc1271.setReturnSuccessfulValidSignature(true);

    await testing.validate(testOrder, '0x', accounts[0]);
  });

  async function getSignature(Order, signer) {
    return order.sign(Order, signer, testing.address);
  }
});
