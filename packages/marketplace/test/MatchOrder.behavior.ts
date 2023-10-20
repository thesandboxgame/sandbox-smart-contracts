import {expect} from 'chai';
import {deployFixtures} from './fixtures.ts';
import {loadFixture} from '@nomicfoundation/hardhat-network-helpers';
import {
  AssetERC1155,
  AssetERC20,
  AssetERC721,
  FeeRecipientsData,
  LibPartData,
} from './utils/assets.ts';
import {hashKey, isOrderEqual,OrderDefault,signOrder} from './utils/order.ts';
import {expectEvent} from '@openzeppelin/test-helpers';
import {ZeroAddress, AbiCoder} from 'ethers';

export async function matchOrder(
  // ERC20Contract,
  // ERC20Contract2,
  // ExchangeContractAsUser,
  // maker,
  // taker,
  // orderLeft,
  // signatureLeft,
  // orderRight,
  // signatureRight,
  matchOrders,
  ExchangeContract,
  user,
) {
  describe('match order', function () {
    let ExchangeContractAsUser,
    OrderValidatorAsAdmin,
    ERC20Contract,
    ERC20Contract2,
    maker,
    taker,
    user;

  let makerAsset,takerAsset,orderLeft, orderRight, signatureLeft, signatureRight;
  beforeEach(async function () {
    ({
      ExchangeContractAsUser,
      OrderValidatorAsAdmin,
      ERC20Contract,
      ERC20Contract2,
      user1: maker,
      user2: taker,
      user,
    } = await loadFixture(deployFixtures));
    await ERC20Contract.mint(maker.address, 123000000);
    await ERC20Contract.connect(maker).approve(
      await ExchangeContractAsUser.getAddress(),
      123000000
    );

    await ERC20Contract2.mint(taker.address, 456000000);
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

    signatureLeft = await signOrder(orderLeft, maker, OrderValidatorAsAdmin);
    signatureRight = await signOrder(orderRight, taker, OrderValidatorAsAdmin);
  });
    it('should not execute match order with an empty order array', async function () {
      await expect(matchOrders([])).to.be.revertedWith(
        'ExchangeMatch cant be empty'
      );
    });

    it('should emit match order event', async function () {
      const matchedOrders = [
        {
          orderLeft,
          signatureLeft,
          orderRight,
          signatureRight,
        },
      ];
      function verifyOrderLeft(eventOrder: Order): boolean {
        return isOrderEqual(eventOrder, orderLeft);
      }

      function verifyOrderRight(eventOrder: Order): boolean {
        return isOrderEqual(eventOrder, orderRight);
      }
      const tx = await matchOrders(matchedOrders);
      await expect(tx)
        .to.emit(ExchangeContract, 'Match')
        .withArgs(
          user.address,
          hashKey(orderLeft),
          hashKey(orderRight),
          verifyOrderLeft,
          verifyOrderRight,
          [123000000, 456000000],
          456000000,
          123000000
        );
    });

    it('should execute a match order between ERC20 tokens', async function(){
      const matchedOrders = [
        {
          orderLeft,
          signatureLeft,
          orderRight,
          signatureRight,
        },
      ]
      await matchOrders( [
        {
          orderLeft,
          signatureLeft,
          orderRight,
          signatureRight,
        },
      ]);
      
    })
  });
}
