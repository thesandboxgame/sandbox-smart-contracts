import {expect} from 'chai';
import {deployFixtures} from '../fixtures/index.ts';
import {loadFixture} from '@nomicfoundation/hardhat-network-helpers';
import {
  AssetERC20,
  AssetERC721,
  AssetERC1155,
  Asset,
  Bundle,
} from '../utils/assets.ts';

import {hashKey, OrderDefault, signOrder, Order} from '../utils/order.ts';
import {ZeroAddress, Contract, Signer} from 'ethers';

// eslint-disable-next-line mocha/no-exports
export function shouldMatchOrdersForBundle() {
  describe('Exchange MatchOrders for Bundle', function () {
    let ExchangeContractAsUser: Contract,
      OrderValidatorAsAdmin: Contract,
      ERC20Contract: Contract,
      ERC20Contract2: Contract,
      ERC721Contract: Contract,
      ERC1155Contract: Contract,
      protocolFeeSecondary: number,
      defaultFeeReceiver: Signer,
      maker: Signer,
      taker: Signer,
      makerAsset: Asset,
      takerAsset: Asset,
      ERC20Asset: Asset,
      orderLeft: Order,
      orderRight: Order,
      makerSig: string,
      takerSig: string;

    beforeEach(async function () {
      ({
        ExchangeContractAsUser,
        ExchangeContractAsAdmin,
        OrderValidatorAsAdmin,
        ERC20Contract,
        ERC20Contract2,
        ERC721Contract,
        ERC1155Contract,
        protocolFeeSecondary,
        defaultFeeReceiver,
        user1: maker,
        user2: taker,
        user3: makeRecipient,
        user,
        PAUSER_ROLE,
        ERC1776_OPERATOR_ROLE,
      } = await loadFixture(deployFixtures));

      // Set up ERC20 for maker
      await ERC20Contract.mint(maker.getAddress(), 20000000000);
      await ERC20Contract.connect(maker).approve(
        await ExchangeContractAsUser.getAddress(),
        20000000000
      );

      ERC20Asset = await AssetERC20(ERC20Contract, 10000000000);

      // Construct makerAsset
      makerAsset = await AssetERC20(ERC20Contract, 10000000000);

      // Set up ERC20 for taker
      await ERC20Contract2.mint(taker.getAddress(), 30000000000);
      await ERC20Contract2.connect(taker).approve(
        await ExchangeContractAsUser.getAddress(),
        30000000000
      ); // TODO: review approve amounts

      // Set up ERC721 for taker
      await ERC721Contract.mint(taker.getAddress(), 1);
      await ERC721Contract.connect(taker).approve(
        await ExchangeContractAsUser.getAddress(),
        1
      );

      ERC721Asset = await AssetERC721(ERC721Contract, 1);

      // Set up ERC1155 for taker
      await ERC1155Contract.mint(taker.getAddress(), 1, 10);

      await ERC1155Contract.connect(taker).setApprovalForAll(
        await ExchangeContractAsUser.getAddress(),
        true
      );

      ERC1155Asset = await AssetERC1155(ERC1155Contract, 1, 10);

      // Construct takerAsset bundle
      const bundledERC20 = [
        {
          erc20Address: ERC20Contract2.target, // TODO: review use of 'target'
          value: 20000000000,
        },
      ];
      const bundledERC721 = [
        {
          erc721Address: ERC721Contract.target,
          ids: [1],
        },
      ];
      const bundledERC1155 = [
        {
          erc1155Address: ERC1155Contract.target,
          ids: [1],
          supplies: [10],
        },
      ];

      const bundleInformation = {
        bundledERC20,
        bundledERC721,
        bundledERC1155,
      };

      takerAsset = await Bundle(bundleInformation);

      orderLeft = await OrderDefault(
        maker,
        makerAsset,
        ZeroAddress,
        takerAsset, // bundle
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

    describe('ERC20 x Bundle token', function () {
      it('should execute a complete match order between ERC20 tokens and Bundle', async function () {
        const makerAddress = await maker.getAddress();
        const takerAddress = await taker.getAddress();

        expect(await ERC20Contract.balanceOf(makerAddress)).to.be.equal(
          20000000000
        );
        expect(await ERC20Contract.balanceOf(takerAddress)).to.be.equal(0);
        expect(await ERC20Contract2.balanceOf(makerAddress)).to.be.equal(0);
        expect(await ERC20Contract2.balanceOf(takerAddress)).to.be.equal(
          30000000000
        );
        expect(await ERC721Contract.ownerOf(1)).to.be.equal(takerAddress);
        expect(await ERC1155Contract.balanceOf(takerAddress, 1)).to.be.equal(
          10
        );
        expect(await ERC1155Contract.balanceOf(makerAddress, 1)).to.be.equal(0);

        await ExchangeContractAsUser.matchOrders([
          {
            orderLeft, // passing ERC20 as left order
            signatureLeft: makerSig,
            orderRight, // passing Bundle as left order
            signatureRight: takerSig,
          },
        ]);

        expect(await ERC1155Contract.balanceOf(makerAddress, 1)).to.be.equal(
          10
        );
        expect(await ERC721Contract.ownerOf(1)).to.be.equal(makerAddress);
        expect(await ERC1155Contract.balanceOf(takerAddress, 1)).to.be.equal(0);

        expect(
          await ExchangeContractAsUser.fills(hashKey(orderLeft))
        ).to.be.equal(1);
        expect(
          await ExchangeContractAsUser.fills(hashKey(orderRight))
        ).to.be.equal(10000000000);

        expect(await ERC20Contract.balanceOf(takerAddress)).to.be.equal(
          9750000000 // 10000000000 - protocolFee
        );

        expect(await ERC20Contract.balanceOf(maker)).to.be.equal(10000000000);
        expect(await ERC20Contract2.balanceOf(maker)).to.be.equal(20000000000);
        expect(await ERC20Contract2.balanceOf(taker)).to.be.equal(10000000000);

        // check protocol fee -> 250 * 10000000000 / 10000 = 250000000
        expect(
          await ERC20Contract.balanceOf(defaultFeeReceiver.getAddress())
        ).to.be.equal(
          (Number(protocolFeeSecondary) * Number(ERC20Asset.value)) / 10000
        );
      });
    });
  });
}
