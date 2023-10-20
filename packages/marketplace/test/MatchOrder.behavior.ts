import {expect} from 'chai';
import {deployFixtures} from './fixtures.ts';
import {loadFixture} from '@nomicfoundation/hardhat-network-helpers';
import {hashKey, isOrderEqual} from './utils/order.ts';
import {expectEvent} from '@openzeppelin/test-helpers';
export async function matchOrder(
  orderLeft,
  signatureLeft,
  orderRight,
  signatureRight,
  matchOrders,
  ExchangeContract,
  // user,
) {
  describe('match order', function () {
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
