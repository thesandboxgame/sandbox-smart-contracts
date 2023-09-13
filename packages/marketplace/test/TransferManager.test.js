const TransferManagerTest = artifacts.require('TransferManagerTest.sol');
const TestRoyaltiesRegistry = artifacts.require('TestRoyaltiesRegistry.sol');
const TestERC20 = artifacts.require('TestERC20.sol');
const TestERC721Royalties2981Multi = artifacts.require(
  'TestERC721WithRoyaltyV2981Multi.sol'
);
const TestERC1155Royalties2981 = artifacts.require(
  'TestERC1155WithRoyaltyV2981.sol'
);

const TestERC721WithRoyaltyV2981 = artifacts.require(
  'TestERC721WithRoyaltyV2981'
);

const ERC721LazyMintTest = artifacts.require('ERC721LazyMintTest.sol');
const ERC1155LazyMintTest = artifacts.require('ERC1155LazyMintTest.sol');

const {Order, Asset} = require('./utils/order.js');
const ZERO = '0x0000000000000000000000000000000000000000';
const {expectThrow, verifyBalanceChange} = require('@daonomic/tests-common');
const {
  ETH,
  ERC20,
  ERC721,
  ERC1155,
  enc,
  id,
} = require('./utils/assets.js');

contract('TransferManagerTest:doTransferTest()', (accounts) => {
  let RTM;
  let royaltiesRegistry;

  const protocol = accounts[9];
  const community = accounts[8];
  const erc721TokenId1 = 53;
  const erc1155TokenId1 = 54;
  const erc1155TokenId2 = 55;
  const protocolFeePrimary = 0;
  const protocolFeeSecondary = 250;

  before(async function () {
    RTM = await TransferManagerTest.new();
    royaltiesRegistry = await TestRoyaltiesRegistry.new();

    await RTM.init____(
      protocolFeePrimary,
      protocolFeeSecondary,
      community,
      royaltiesRegistry.address
    );
  });

  describe('Check doTransfersExternal()', function () {
    it('Transfer from ETH to ERC1155, protocol fee 6% (buyerFee3%, sallerFee3%)', async function () {
      const erc1155 = await prepareERC1155(accounts[2], 10);

      const left = Order(
        accounts[0],
        Asset(ETH, '0x', 100),
        ZERO,
        Asset(ERC1155, enc(erc1155.address, erc1155TokenId1), 7),
        1,
        0,
        0,
        '0xffffffff',
        '0x'
      );
      const right = Order(
        accounts[2],
        Asset(ERC1155, enc(erc1155.address, erc1155TokenId1), 7),
        ZERO,
        Asset(ETH, '0x', 100),
        1,
        0,
        0,
        '0xffffffff',
        '0x'
      );

      await verifyBalanceChange(accounts[0], 100, () =>
        verifyBalanceChange(accounts[2], -98, () =>
          verifyBalanceChange(protocol, 0, () =>
            RTM.doTransfersExternal(left, right, {
              value: 100,
              from: accounts[0],
              gasPrice: 1,
            })
          )
        )
      );
      assert.equal(await erc1155.balanceOf(accounts[0], erc1155TokenId1), 7);
      assert.equal(await erc1155.balanceOf(accounts[2], erc1155TokenId1), 3);
    });

    it('Transfer from ERC1155 to ERC721, (buyerFee3%, sallerFee3% = 6%) of ERC1155 protocol (buyerFee3%, sallerFee3%)', async function () {
      const erc721 = await prepareERC721(accounts[2]);
      const erc1155 = await prepareERC1155(accounts[1], 105);

      const left = Order(
        accounts[1],
        Asset(ERC1155, enc(erc1155.address, erc1155TokenId1), 100),
        ZERO,
        Asset(ERC721, enc(erc721.address, erc721TokenId1), 1),
        1,
        0,
        0,
        '0xffffffff',
        '0x'
      );
      const right = Order(
        accounts[2],
        Asset(ERC721, enc(erc721.address, erc721TokenId1), 1),
        ZERO,
        Asset(ERC1155, enc(erc1155.address, erc1155TokenId1), 100),
        1,
        0,
        0,
        '0xffffffff',
        '0x'
      );

      await RTM.doTransfersExternal(left, right);

      assert.equal(await erc721.balanceOf(accounts[2]), 0);
      assert.equal(await erc721.balanceOf(accounts[1]), 1);
      assert.equal(await erc1155.balanceOf(accounts[2], erc1155TokenId1), 98);
      assert.equal(await erc1155.balanceOf(community, erc1155TokenId1), 2); //protocol fee
      assert.equal(await erc1155.balanceOf(accounts[1], erc1155TokenId1), 5);
      assert.equal(await erc1155.balanceOf(protocol, erc1155TokenId1), 0);
    });

    it('Transfer from ERC20 to ERC1155, protocol fee 6% (buyerFee3%, sallerFee3%)', async function () {
      const erc20 = await prepareERC20(accounts[1], 105);
      const erc1155 = await prepareERC1155(accounts[2], 10);

      const left = Order(
        accounts[1],
        Asset(ERC20, enc(erc20.address), 100),
        ZERO,
        Asset(ERC1155, enc(erc1155.address, erc1155TokenId1), 7),
        1,
        0,
        0,
        '0xffffffff',
        '0x'
      );
      const right = Order(
        accounts[2],
        Asset(ERC1155, enc(erc1155.address, erc1155TokenId1), 7),
        ZERO,
        Asset(ERC20, enc(erc20.address), 100),
        1,
        0,
        0,
        '0xffffffff',
        '0x'
      );

      await RTM.doTransfersExternal(left, right);

      assert.equal(await erc20.balanceOf(accounts[1]), 5);
      assert.equal(await erc20.balanceOf(accounts[2]), 98);
      assert.equal(await erc20.balanceOf(community), 2); // protocol fee
      assert.equal(await erc1155.balanceOf(accounts[1], erc1155TokenId1), 7);
      assert.equal(await erc1155.balanceOf(accounts[2], erc1155TokenId1), 3);
      assert.equal(await erc20.balanceOf(protocol), 0);
    });

    it('Transfer from ERC1155 to ERC20, protocol fee 6% (buyerFee3%, sallerFee3%)', async function () {
      const erc20 = await prepareERC20(accounts[4], 105);
      const erc1155 = await prepareERC1155(accounts[3], 10, erc1155TokenId2);

      const left = Order(
        accounts[3],
        Asset(ERC1155, enc(erc1155.address, erc1155TokenId2), 7),
        ZERO,
        Asset(ERC20, enc(erc20.address), 100),
        1,
        0,
        0,
        '0xffffffff',
        '0x'
      );
      const right = Order(
        accounts[4],
        Asset(ERC20, enc(erc20.address), 100),
        ZERO,
        Asset(ERC1155, enc(erc1155.address, erc1155TokenId2), 7),
        1,
        0,
        0,
        '0xffffffff',
        '0x'
      );

      await RTM.doTransfersExternal(left, right);

      assert.equal(await erc20.balanceOf(accounts[3]), 98);
      assert.equal(await erc20.balanceOf(community), 2); // protocol fee
      assert.equal(await erc20.balanceOf(accounts[4]), 5);
      assert.equal(await erc1155.balanceOf(accounts[3], erc1155TokenId2), 3);
      assert.equal(await erc1155.balanceOf(accounts[4], erc1155TokenId2), 7);
      assert.equal(await erc20.balanceOf(protocol), 0);
    });

    it('Transfer from ERC20 to ERC721, protocol fee 6% (buyerFee3%, sallerFee3%)', async function () {
      const erc20 = await prepareERC20(accounts[1], 105);
      const erc721 = await prepareERC721(accounts[2]);

      const left = Order(
        accounts[1],
        Asset(ERC20, enc(erc20.address), 100),
        ZERO,
        Asset(ERC721, enc(erc721.address, erc721TokenId1), 1),
        1,
        0,
        0,
        '0xffffffff',
        '0x'
      );
      const right = Order(
        accounts[2],
        Asset(ERC721, enc(erc721.address, erc721TokenId1), 1),
        ZERO,
        Asset(ERC20, enc(erc20.address), 100),
        1,
        0,
        0,
        '0xffffffff',
        '0x'
      );

      await RTM.doTransfersExternal(left, right);

      assert.equal(await erc20.balanceOf(accounts[1]), 5);
      assert.equal(await erc20.balanceOf(accounts[2]), 98);
      assert.equal(await erc20.balanceOf(community), 2); // protocol fee
      assert.equal(await erc721.balanceOf(accounts[1]), 1);
      assert.equal(await erc721.balanceOf(accounts[2]), 0);
      assert.equal(await erc20.balanceOf(protocol), 0);
    });

    it('Transfer from ERC721 to ERC20, no protocol fee ', async function () {
      const erc20 = await prepareERC20(accounts[2], 105);
      const erc721 = await prepareERC721(accounts[1]);

      const left = Order(
        accounts[1],
        Asset(ERC721, enc(erc721.address, erc721TokenId1), 1),
        ZERO,
        Asset(ERC20, enc(erc20.address), 100),
        1,
        0,
        0,
        '0xffffffff',
        '0x'
      );
      const right = Order(
        accounts[2],
        Asset(ERC20, enc(erc20.address), 100),
        ZERO,
        Asset(ERC721, enc(erc721.address, erc721TokenId1), 1),
        1,
        0,
        0,
        '0xffffffff',
        '0x'
      );

      await RTM.doTransfersExternal(left, right);

      assert.equal(await erc20.balanceOf(accounts[1]), 98);
      assert.equal(await erc20.balanceOf(community), 2); // no protocol fee
      assert.equal(await erc20.balanceOf(accounts[2]), 5);
      assert.equal(await erc721.balanceOf(accounts[1]), 0);
      assert.equal(await erc721.balanceOf(accounts[2]), 1);
      assert.equal(await erc20.balanceOf(protocol), 0);
    });

    it('Transfer from ERC20 to ERC20, protocol fee 6% (buyerFee3%, sallerFee3%)', async function () {
      const erc20 = await prepareERC20(accounts[1], 105);
      const t2 = await prepareERC20(accounts[2], 220);

      const left = Order(
        accounts[1],
        Asset(ERC20, enc(erc20.address), 100),
        ZERO,
        Asset(ERC20, enc(t2.address), 200),
        1,
        0,
        0,
        '0xffffffff',
        '0x'
      );
      const right = Order(
        accounts[2],
        Asset(ERC20, enc(t2.address), 200),
        ZERO,
        Asset(ERC20, enc(erc20.address), 100),
        1,
        0,
        0,
        '0xffffffff',
        '0x'
      );

      await RTM.doTransfersExternal(left, right);

      assert.equal(await erc20.balanceOf(accounts[1]), 5);
      assert.equal(await erc20.balanceOf(accounts[2]), 98);
      assert.equal(await erc20.balanceOf(community), 2); // protocol fee
      assert.equal(await t2.balanceOf(accounts[1]), 200);
      assert.equal(await t2.balanceOf(accounts[2]), 20);
      assert.equal(await erc20.balanceOf(protocol), 0);
    });
  });

  describe('Check lazy with royalties', function () {
    it('Transfer from  ERC721lazy to ERC20 ', async function () {
      const erc721Test = await ERC721LazyMintTest.new();

      const erc20 = await prepareERC20(accounts[2], 106);

      const encodedMintData = await erc721Test.encode([
        1,
        'uri',
        [[accounts[1], 0]],
        [
          [accounts[5], 2000],
          [accounts[6], 1000],
        ],
        [],
      ]);

      const left = Order(
        accounts[1],
        Asset(id('ERC721_LAZY'), encodedMintData, 1),
        ZERO,
        Asset(ERC20, enc(erc20.address), 100),
        1,
        0,
        0,
        '0xffffffff',
        '0x'
      );
      const right = Order(
        accounts[2],
        Asset(ERC20, enc(erc20.address), 100),
        ZERO,
        Asset(id('ERC721_LAZY'), encodedMintData, 1),
        1,
        0,
        0,
        '0xffffffff',
        '0x'
      );

      await RTM.doTransfersExternal(left, right);

      assert.equal(await erc721Test.ownerOf(1), accounts[2]);
      assert.equal(await erc20.balanceOf(accounts[1]), 68);
      assert.equal(await erc20.balanceOf(community), 2); // protocol fee
      assert.equal(await erc20.balanceOf(accounts[2]), 6);
      assert.equal(await erc20.balanceOf(accounts[5]), 20);
      assert.equal(await erc20.balanceOf(accounts[6]), 10);
    });

    it('Transfer from  ERC1155lazy to ERC20 ', async function () {
      const erc1155Test = await ERC1155LazyMintTest.new();

      const erc20 = await prepareERC20(accounts[2], 106);

      const encodedMintData = await erc1155Test.encode([
        1,
        'uri',
        5,
        [[accounts[1], 0]],
        [
          [accounts[5], 2000],
          [accounts[6], 1000],
        ],
        [],
      ]);

      const left = Order(
        accounts[1],
        Asset(id('ERC1155_LAZY'), encodedMintData, 5),
        ZERO,
        Asset(ERC20, enc(erc20.address), 100),
        1,
        0,
        0,
        '0xffffffff',
        '0x'
      );
      const right = Order(
        accounts[2],
        Asset(ERC20, enc(erc20.address), 100),
        ZERO,
        Asset(id('ERC1155_LAZY'), encodedMintData, 5),
        1,
        0,
        0,
        '0xffffffff',
        '0x'
      );

      await RTM.doTransfersExternal(left, right);

      assert.equal(await erc1155Test.balanceOf(accounts[2], 1), 5);
      assert.equal(await erc20.balanceOf(accounts[1]), 68);
      assert.equal(await erc20.balanceOf(community), 2); // protocol fee
      assert.equal(await erc20.balanceOf(accounts[2]), 6);
      assert.equal(await erc20.balanceOf(accounts[5]), 20);
      assert.equal(await erc20.balanceOf(accounts[6]), 10);
    });

    it('Transfer from ETH to ERC721Lazy', async function () {
      const erc721Test = await ERC721LazyMintTest.new();

      const encodedMintData = await erc721Test.encode([
        1,
        'uri',
        [[accounts[2], 0]],
        [
          [accounts[5], 2000],
          [accounts[6], 1000],
        ],
        [],
      ]);

      const left = Order(
        accounts[1],
        Asset(ETH, '0x', 100),
        ZERO,
        Asset(id('ERC721_LAZY'), encodedMintData, 1),
        1,
        0,
        0,
        '0xffffffff',
        '0x'
      );
      const right = Order(
        accounts[2],
        Asset(id('ERC721_LAZY'), encodedMintData, 1),
        ZERO,
        Asset(ETH, '0x', 100),
        1,
        0,
        0,
        '0xffffffff',
        '0x'
      );

      await verifyBalanceChange(accounts[1], 100, () =>
        verifyBalanceChange(accounts[2], -68, () =>
          verifyBalanceChange(accounts[5], -20, () =>
            verifyBalanceChange(accounts[6], -10, () =>
              verifyBalanceChange(protocol, 0, () =>
                RTM.doTransfersExternal(left, right, {
                  value: 100,
                  from: accounts[1],
                  gasPrice: 0,
                })
              )
            )
          )
        )
      );
      assert.equal(await erc721Test.ownerOf(1), accounts[1]);
    });

    it('Transfer from ETH to ERC1155Lazy', async function () {
      const erc1155Test = await ERC1155LazyMintTest.new();

      const encodedMintData = await erc1155Test.encode([
        1,
        'uri',
        5,
        [[accounts[2], 0]],
        [
          [accounts[5], 2000],
          [accounts[6], 1000],
        ],
        [],
      ]);

      const left = Order(
        accounts[1],
        Asset(ETH, '0x', 100),
        ZERO,
        Asset(id('ERC1155_LAZY'), encodedMintData, 5),
        1,
        0,
        0,
        '0xffffffff',
        '0x'
      );
      const right = Order(
        accounts[2],
        Asset(id('ERC1155_LAZY'), encodedMintData, 5),
        ZERO,
        Asset(ETH, '0x', 100),
        1,
        0,
        0,
        '0xffffffff',
        '0x'
      );

      await verifyBalanceChange(accounts[1], 100, () =>
        verifyBalanceChange(accounts[2], -68, () =>
          verifyBalanceChange(accounts[5], -20, () =>
            verifyBalanceChange(accounts[6], -10, () =>
              verifyBalanceChange(protocol, 0, () =>
                RTM.doTransfersExternal(left, right, {
                  value: 100,
                  from: accounts[1],
                  gasPrice: 0,
                })
              )
            )
          )
        )
      );
      assert.equal(await erc1155Test.balanceOf(accounts[1], 1), 5);
    });
  });

  describe('Check doTransfersExternal() with Royalties fees', function () {
    it('Transfer from ERC20 to ERC721 multi receivers, protocol fee 6% (buyerFee3%, sallerFee3%)', async function () {
      const erc20 = await prepareERC20(accounts[1], 105);
      const erc721V2 = await prepareERC721Multi(
        accounts[0],
        erc721TokenId1,
        []
      );

      await royaltiesRegistry.setRoyaltiesByToken(erc721V2.address, [
        [accounts[2], 1000],
        [accounts[3], 500],
      ]);

      const left = Order(
        accounts[1],
        Asset(ERC20, enc(erc20.address), 100),
        ZERO,
        Asset(ERC721, enc(erc721V2.address, erc721TokenId1), 1),
        1,
        0,
        0,
        '0xffffffff',
        '0x'
      );
      const right = Order(
        accounts[0],
        Asset(ERC721, enc(erc721V2.address, erc721TokenId1), 1),
        ZERO,
        Asset(ERC20, enc(erc20.address), 100),
        1,
        0,
        0,
        '0xffffffff',
        '0x'
      );

      await RTM.doTransfersExternal(left, right);

      assert.equal(await erc20.balanceOf(accounts[1]), 5);
      assert.equal(await erc20.balanceOf(accounts[0]), 83);
      assert.equal(await erc20.balanceOf(community), 2); // protocol fee
      assert.equal(await erc20.balanceOf(accounts[2]), 10);
      assert.equal(await erc20.balanceOf(accounts[3]), 5);
      assert.equal(await erc721V2.balanceOf(accounts[1]), 1);
      assert.equal(await erc721V2.balanceOf(accounts[0]), 0);
      assert.equal(await erc20.balanceOf(protocol), 0);
    });

    it('Transfer from ERC721 to ERC20 no royalties, no protocol fee - primary market', async function () {
      const erc20 = await prepareERC20(accounts[0], 105);
      const erc721V2 = await prepareERC721Multi(
        accounts[1],
        erc721TokenId1,
        []
      );

      await royaltiesRegistry.setRoyaltiesByToken(erc721V2.address, [
        [accounts[2], 1000],
        [accounts[3], 500],
      ]);

      const left = Order(
        accounts[1],
        Asset(ERC721, enc(erc721V2.address, erc721TokenId1), 1),
        ZERO,
        Asset(ERC20, enc(erc20.address), 100),
        1,
        0,
        0,
        '0xffffffff',
        '0x'
      );
      const right = Order(
        accounts[0],
        Asset(ERC20, enc(erc20.address), 100),
        ZERO,
        Asset(ERC721, enc(erc721V2.address, erc721TokenId1), 1),
        1,
        0,
        0,
        '0xffffffff',
        '0x'
      );

      await RTM.doTransfersExternal(left, right);

      assert.equal(await erc20.balanceOf(accounts[0]), 5);
      assert.equal(await erc20.balanceOf(accounts[1]), 100);
      assert.equal(await erc20.balanceOf(community), 0); // no protocol fee
      assert.equal(await erc20.balanceOf(accounts[2]), 0); // no royaties
      assert.equal(await erc20.balanceOf(accounts[3]), 0); // no royaties
      assert.equal(await erc721V2.balanceOf(accounts[0]), 1);
      assert.equal(await erc721V2.balanceOf(accounts[1]), 0);
      assert.equal(await erc20.balanceOf(protocol), 0);
    });

    it('Transfer from ERC20 to ERC1155, protocol fee 6% (buyerFee3%, sallerFee3%)', async function () {
      const erc20 = await prepareERC20(accounts[1], 105);
      const erc1155V2 = await prepareERC1155(accounts[0], 8);

      await royaltiesRegistry.setRoyaltiesByToken(erc1155V2.address, [
        [accounts[2], 1000],
        [accounts[3], 500],
      ]); //set royalties by token

      const left = Order(
        accounts[1],
        Asset(ERC20, enc(erc20.address), 100),
        ZERO,
        Asset(ERC1155, enc(erc1155V2.address, erc1155TokenId1), 6),
        1,
        0,
        0,
        '0xffffffff',
        '0x'
      );
      const right = Order(
        accounts[0],
        Asset(ERC1155, enc(erc1155V2.address, erc1155TokenId1), 6),
        ZERO,
        Asset(ERC20, enc(erc20.address), 100),
        1,
        0,
        0,
        '0xffffffff',
        '0x'
      );

      await RTM.doTransfersExternal(left, right);

      assert.equal(await erc20.balanceOf(accounts[1]), 5);
      assert.equal(await erc20.balanceOf(accounts[0]), 83);
      assert.equal(await erc20.balanceOf(community), 2); // protocol fee
      assert.equal(await erc20.balanceOf(accounts[2]), 10);
      assert.equal(await erc20.balanceOf(accounts[3]), 5);
      assert.equal(await erc1155V2.balanceOf(accounts[1], erc1155TokenId1), 6);
      assert.equal(await erc1155V2.balanceOf(accounts[0], erc1155TokenId1), 2);
      assert.equal(await erc20.balanceOf(protocol), 0);
    });

    it('Transfer from ERC20 to ERC1155, royalties are too high', async function () {
      const erc20 = await prepareERC20(accounts[1], 105);
      const erc1155V2 = await prepareERC1155(accounts[0], 8);

      await royaltiesRegistry.setRoyaltiesByToken(erc1155V2.address, [
        [accounts[2], 2000],
        [accounts[3], 3001],
      ]); //set royalties by token
      const left = Order(
        accounts[1],
        Asset(ERC20, enc(erc20.address), 100),
        ZERO,
        Asset(ERC1155, enc(erc1155V2.address, erc1155TokenId1), 6),
        1,
        0,
        0,
        '0xffffffff',
        '0x'
      );
      const right = Order(
        accounts[0],
        Asset(ERC1155, enc(erc1155V2.address, erc1155TokenId1), 6),
        ZERO,
        Asset(ERC20, enc(erc20.address), 100),
        1,
        0,
        0,
        '0xffffffff',
        '0x'
      );

      await expectThrow(RTM.doTransfersExternal(left, right));
    });

    it('Transfer from ETH to ERC1155V2, protocol fee 6% (buyerFee3%, sallerFee3%)', async function () {
      const erc1155V2 = await prepareERC1155(accounts[1], 10);

      await royaltiesRegistry.setRoyaltiesByToken(erc1155V2.address, [
        [accounts[2], 1000],
        [accounts[3], 500],
      ]); //set royalties by token

      const left = Order(
        accounts[0],
        Asset(ETH, '0x', 100),
        ZERO,
        Asset(ERC1155, enc(erc1155V2.address, erc1155TokenId1), 7),
        1,
        0,
        0,
        '0xffffffff',
        '0x'
      );
      const right = Order(
        accounts[1],
        Asset(ERC1155, enc(erc1155V2.address, erc1155TokenId1), 7),
        ZERO,
        Asset(ETH, '0x', 100),
        1,
        0,
        0,
        '0xffffffff',
        '0x'
      );

      await verifyBalanceChange(accounts[0], 100, () =>
        verifyBalanceChange(accounts[1], -83, () =>
          verifyBalanceChange(accounts[2], -10, () =>
            verifyBalanceChange(accounts[3], -5, () =>
              verifyBalanceChange(protocol, 0, () =>
                RTM.doTransfersExternal(left, right, {
                  value: 100,
                  from: accounts[0],
                  gasPrice: 0,
                })
              )
            )
          )
        )
      );
      assert.equal(await erc1155V2.balanceOf(accounts[0], erc1155TokenId1), 7);
      assert.equal(await erc1155V2.balanceOf(accounts[1], erc1155TokenId1), 3);
    });
  });

  async function prepareERC20(user, value = 1000) {
    const erc20Token = await TestERC20.new();

    await erc20Token.mint(user, value);
    await erc20Token.approve(RTM.address, value, {from: user});
    return erc20Token;
  }

  async function prepareERC721(user, tokenId = erc721TokenId1, royalties = []) {
    const erc721 = await TestERC721WithRoyaltyV2981.new();

    await erc721.mint(user, tokenId, royalties);
    await erc721.setApprovalForAll(RTM.address, true, {from: user});
    return erc721;
  }

  async function prepareERC721Multi(
    user,
    tokenId = erc721TokenId1,
    royalties = []
  ) {
    const erc721 = await TestERC721Royalties2981Multi.new({from: accounts[1]});
    await erc721.initialize({from: accounts[1]});

    await erc721.mint(user, tokenId, royalties, {from: accounts[1]});
    await erc721.setApprovalForAll(RTM.address, true, {from: user});
    return erc721;
  }

  async function prepareERC1155(
    user,
    value = 100,
    tokenId = erc1155TokenId1,
    royalties = []
  ) {
    const erc1155 = await TestERC1155Royalties2981.new({
      from: accounts[1],
    });

    await erc1155.initialize({from: accounts[1]});

    await erc1155.mint(user, tokenId, value, royalties);
    await erc1155.setApprovalForAll(RTM.address, true, {from: user});
    return erc1155;
  }
});
