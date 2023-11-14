import {expect} from 'chai';
import {deployFixtures} from '../fixtures/index.ts';
import {loadFixture} from '@nomicfoundation/hardhat-network-helpers';
import {
  AssetERC20,
  AssetERC721,
  FeeRecipientsData,
  LibPartData,
  Asset,
} from '../utils/assets.ts';

import {hashKey, OrderDefault, signOrder, Order} from '../utils/order.ts';
import {ZeroAddress, Contract, Signer} from 'ethers';

// eslint-disable-next-line mocha/no-exports
export function shouldMatchOrdersWithRoyalty() {
  describe('Exchange MatchOrders with Royalties', function () {
    let ExchangeContractAsDeployer: Contract,
      ExchangeContractAsUser: Contract,
      OrderValidatorAsAdmin: Contract,
      RoyaltiesRegistryAsDeployer: Contract,
      ERC20Contract: Contract,
      ERC721Contract: Contract,
      ERC721WithRoyalty: Contract,
      ERC721WithRoyaltyV2981: Contract,
      ERC721WithRoyaltyWithoutIROYALTYUGC: Contract,
      RoyaltiesProvider: Contract,
      defaultFeeReceiver: Signer,
      deployer: Signer,
      admin: Signer,
      maker: Signer,
      taker: Signer,
      receiver1: Signer,
      receiver2: Signer,
      royaltyReceiver: Signer,
      ERC20Asset: Asset,
      ERC721Asset: Asset,
      orderLeft: Order,
      orderRight: Order,
      makerSig: string,
      takerSig: string,
      EXCHANGE_ADMIN_ROLE: string;

    beforeEach(async function () {
      ({
        ExchangeContractAsDeployer,
        ExchangeContractAsUser,
        OrderValidatorAsAdmin,
        RoyaltiesRegistryAsDeployer,
        ERC20Contract,
        ERC721Contract,
        ERC721WithRoyalty,
        ERC721WithRoyaltyV2981,
        ERC721WithRoyaltyWithoutIROYALTYUGC,
        defaultFeeReceiver,
        RoyaltiesProvider,
        deployer,
        admin,
        user1: maker,
        user2: taker,
        admin: receiver1,
        user: receiver2,
        deployer: royaltyReceiver,
        EXCHANGE_ADMIN_ROLE,
      } = await loadFixture(deployFixtures));

      await ERC20Contract.mint(taker.getAddress(), 10000000000);
      await ERC20Contract.connect(taker).approve(
        await ExchangeContractAsUser.getAddress(),
        10000000000
      );
      ERC20Asset = await AssetERC20(ERC20Contract, 10000000000);

      const ERC20Role = await OrderValidatorAsAdmin.ERC20_ROLE();

      await OrderValidatorAsAdmin.grantRole(
        ERC20Role,
        await ERC20Contract.getAddress()
      );
    });

    it('should execute a complete match order between ERC721 and ERC20 tokens in primary market', async function () {
      // using deployer as maker to sell in primary market
      await ERC721WithRoyaltyV2981.mint(deployer.getAddress(), 1, [
        await FeeRecipientsData(deployer.getAddress(), 10000),
      ]);

      await ERC721WithRoyaltyV2981.connect(deployer).approve(
        await ExchangeContractAsUser.getAddress(),
        1
      );
      ERC721Asset = await AssetERC721(ERC721WithRoyaltyV2981, 1);

      orderLeft = await OrderDefault(
        deployer,
        ERC721Asset,
        ZeroAddress,
        ERC20Asset,
        1,
        0,
        0
      );
      orderRight = await OrderDefault(
        taker,
        ERC20Asset,
        ZeroAddress,
        ERC721Asset,
        1,
        0,
        0
      );
      makerSig = await signOrder(orderLeft, deployer, OrderValidatorAsAdmin);
      takerSig = await signOrder(orderRight, taker, OrderValidatorAsAdmin);

      expect(
        await ExchangeContractAsUser.fills(hashKey(orderLeft))
      ).to.be.equal(0);
      expect(
        await ExchangeContractAsUser.fills(hashKey(orderRight))
      ).to.be.equal(0);
      expect(await ERC721WithRoyaltyV2981.ownerOf(1)).to.be.equal(
        await deployer.getAddress()
      );
      expect(await ERC20Contract.balanceOf(taker.getAddress())).to.be.equal(
        10000000000
      );

      await ExchangeContractAsUser.matchOrders([
        {
          orderLeft,
          signatureLeft: makerSig,
          orderRight,
          signatureRight: takerSig,
        },
      ]);

      expect(
        await ExchangeContractAsUser.fills(hashKey(orderLeft))
      ).to.be.equal(10000000000);
      expect(
        await ExchangeContractAsUser.fills(hashKey(orderRight))
      ).to.be.equal(1);
      expect(await ERC721WithRoyaltyV2981.ownerOf(1)).to.be.equal(
        await taker.getAddress()
      );
      expect(await ERC20Contract.balanceOf(deployer.getAddress())).to.be.equal(
        9877000000
      );

      // check primary market protocol fee
      expect(
        await ERC20Contract.balanceOf(defaultFeeReceiver.getAddress())
      ).to.be.equal(123000000); // 123 * 10000000000 / 10000 = 123000000
    });

    it('should not execute match order when royalties exceed 50%', async function () {
      // set royalty greater than 50%
      await ERC721WithRoyaltyV2981.setRoyalties(1000000);

      await ERC721WithRoyaltyV2981.mint(deployer.getAddress(), 1, [
        await FeeRecipientsData(deployer.getAddress(), 10000),
      ]);
      await ERC721WithRoyaltyV2981.connect(deployer).transferFrom(
        deployer.getAddress(),
        maker.getAddress(),
        1
      );
      await ERC721WithRoyaltyV2981.connect(maker).approve(
        await ExchangeContractAsUser.getAddress(),
        1
      );

      ERC721Asset = await AssetERC721(ERC721WithRoyaltyV2981, 1);

      orderLeft = await OrderDefault(
        maker,
        ERC721Asset,
        ZeroAddress,
        ERC20Asset,
        1,
        0,
        0
      );
      orderRight = await OrderDefault(
        taker,
        ERC20Asset,
        ZeroAddress,
        ERC721Asset,
        1,
        0,
        0
      );
      makerSig = await signOrder(orderLeft, maker, OrderValidatorAsAdmin);
      takerSig = await signOrder(orderRight, taker, OrderValidatorAsAdmin);

      expect(
        await ExchangeContractAsUser.fills(hashKey(orderLeft))
      ).to.be.equal(0);
      expect(
        await ExchangeContractAsUser.fills(hashKey(orderRight))
      ).to.be.equal(0);
      expect(await ERC721WithRoyaltyV2981.ownerOf(1)).to.be.equal(
        await maker.getAddress()
      );
      expect(await ERC20Contract.balanceOf(taker.getAddress())).to.be.equal(
        10000000000
      );

      await expect(
        ExchangeContractAsUser.matchOrders([
          {
            orderLeft,
            signatureLeft: makerSig,
            orderRight,
            signatureRight: takerSig,
          },
        ])
      ).to.be.revertedWith('royalties are too high (>50%)');
    });

    it('should execute a complete match order with external royalties provider(type 1)', async function () {
      await ERC721Contract.mint(maker.getAddress(), 1);
      await ERC721Contract.connect(maker).approve(
        await ExchangeContractAsUser.getAddress(),
        1
      );

      // set up royalties by token
      await RoyaltiesRegistryAsDeployer.setRoyaltiesByToken(
        await ERC721Contract.getAddress(),
        [await LibPartData(royaltyReceiver, 2000)]
      );

      ERC721Asset = await AssetERC721(ERC721Contract, 1);
      orderLeft = await OrderDefault(
        maker,
        ERC721Asset,
        ZeroAddress,
        ERC20Asset,
        1,
        0,
        0
      );
      orderRight = await OrderDefault(
        taker,
        ERC20Asset,
        ZeroAddress,
        ERC721Asset,
        1,
        0,
        0
      );
      makerSig = await signOrder(orderLeft, maker, OrderValidatorAsAdmin);
      takerSig = await signOrder(orderRight, taker, OrderValidatorAsAdmin);

      expect(
        await ExchangeContractAsUser.fills(hashKey(orderLeft))
      ).to.be.equal(0);
      expect(
        await ExchangeContractAsUser.fills(hashKey(orderRight))
      ).to.be.equal(0);
      expect(await ERC721Contract.ownerOf(1)).to.be.equal(
        await maker.getAddress()
      );
      expect(await ERC20Contract.balanceOf(taker.getAddress())).to.be.equal(
        10000000000
      );

      await ExchangeContractAsUser.matchOrders([
        {
          orderLeft,
          signatureLeft: makerSig,
          orderRight,
          signatureRight: takerSig,
        },
      ]);

      expect(
        await ExchangeContractAsUser.fills(hashKey(orderLeft))
      ).to.be.equal(10000000000);
      expect(
        await ExchangeContractAsUser.fills(hashKey(orderRight))
      ).to.be.equal(1);
      expect(await ERC721Contract.ownerOf(1)).to.be.equal(
        await taker.getAddress()
      );

      // check protocol fee
      expect(
        await ERC20Contract.balanceOf(defaultFeeReceiver.getAddress())
      ).to.be.equal(250000000); // 250 * 10000000000 / 10000 = 250000000

      // check paid royalty
      expect(
        await ERC20Contract.balanceOf(royaltyReceiver.getAddress())
      ).to.be.equal(2000000000); // 20% of the amount

      expect(await ERC20Contract.balanceOf(maker.getAddress())).to.be.equal(
        7750000000 // 10000000000 - royalty - protocolFee
      );
    });

    it('should execute a complete match order with external royalties provider(type 2)', async function () {
      await ERC721Contract.mint(maker.getAddress(), 1);

      await ERC721Contract.connect(maker).approve(
        await ExchangeContractAsUser.getAddress(),
        1
      );

      // configuring royalties
      await RoyaltiesProvider.initializeProvider(
        await ERC721Contract.getAddress(),
        1,
        [await LibPartData(royaltyReceiver, 1000)]
      );
      await RoyaltiesRegistryAsDeployer.setProviderByToken(
        await ERC721Contract.getAddress(),
        RoyaltiesProvider.getAddress()
      );

      ERC721Asset = await AssetERC721(ERC721Contract, 1);
      orderLeft = await OrderDefault(
        maker,
        ERC721Asset,
        ZeroAddress,
        ERC20Asset,
        1,
        0,
        0
      );
      orderRight = await OrderDefault(
        taker,
        ERC20Asset,
        ZeroAddress,
        ERC721Asset,
        1,
        0,
        0
      );
      makerSig = await signOrder(orderLeft, maker, OrderValidatorAsAdmin);
      takerSig = await signOrder(orderRight, taker, OrderValidatorAsAdmin);

      expect(
        await ExchangeContractAsUser.fills(hashKey(orderLeft))
      ).to.be.equal(0);
      expect(
        await ExchangeContractAsUser.fills(hashKey(orderRight))
      ).to.be.equal(0);
      expect(await ERC721Contract.ownerOf(1)).to.be.equal(
        await maker.getAddress()
      );
      expect(await ERC20Contract.balanceOf(taker.getAddress())).to.be.equal(
        10000000000
      );

      await ExchangeContractAsUser.matchOrders([
        {
          orderLeft,
          signatureLeft: makerSig,
          orderRight,
          signatureRight: takerSig,
        },
      ]);

      expect(
        await ExchangeContractAsUser.fills(hashKey(orderLeft))
      ).to.be.equal(10000000000);
      expect(
        await ExchangeContractAsUser.fills(hashKey(orderRight))
      ).to.be.equal(1);
      expect(await ERC721Contract.ownerOf(1)).to.be.equal(
        await taker.getAddress()
      );

      // check protocol fee
      expect(
        await ERC20Contract.balanceOf(defaultFeeReceiver.getAddress())
      ).to.be.equal(250000000); // 250 * 10000000000 / 10000 = 250000000

      // check paid royalty
      expect(
        await ERC20Contract.balanceOf(royaltyReceiver.getAddress())
      ).to.be.equal(1000000000); // 10% of the amount

      expect(await ERC20Contract.balanceOf(maker.getAddress())).to.be.equal(
        8750000000 // 10000000000 - royalty - protocolFee
      );
    });

    it('should execute a complete match order with royalties 2981(type 3) transferred to royaltyReceiver', async function () {
      await ERC721WithRoyalty.setRoyalties(5000);

      const fees = [
        {account: receiver1.getAddress(), value: 4000},
        {account: receiver2.getAddress(), value: 5000},
      ];
      await ERC721WithRoyalty.mint(maker.getAddress(), 1, fees);

      await ERC721WithRoyalty.connect(maker).approve(
        await ExchangeContractAsUser.getAddress(),
        1
      );

      // set up receiver
      await ERC721WithRoyalty.setRoyaltiesReceiver(
        1,
        royaltyReceiver.getAddress()
      );

      ERC721Asset = await AssetERC721(ERC721WithRoyalty, 1);
      orderLeft = await OrderDefault(
        maker,
        ERC721Asset,
        ZeroAddress,
        ERC20Asset,
        1,
        0,
        0
      );
      orderRight = await OrderDefault(
        taker,
        ERC20Asset,
        ZeroAddress,
        ERC721Asset,
        1,
        0,
        0
      );
      makerSig = await signOrder(orderLeft, maker, OrderValidatorAsAdmin);
      takerSig = await signOrder(orderRight, taker, OrderValidatorAsAdmin);

      expect(
        await ExchangeContractAsUser.fills(hashKey(orderLeft))
      ).to.be.equal(0);
      expect(
        await ExchangeContractAsUser.fills(hashKey(orderRight))
      ).to.be.equal(0);
      expect(await ERC721WithRoyalty.ownerOf(1)).to.be.equal(
        await maker.getAddress()
      );
      expect(await ERC20Contract.balanceOf(taker.getAddress())).to.be.equal(
        10000000000
      );

      await ExchangeContractAsUser.matchOrders([
        {
          orderLeft,
          signatureLeft: makerSig,
          orderRight,
          signatureRight: takerSig,
        },
      ]);

      expect(
        await ExchangeContractAsUser.fills(hashKey(orderLeft))
      ).to.be.equal(10000000000);
      expect(
        await ExchangeContractAsUser.fills(hashKey(orderRight))
      ).to.be.equal(1);
      expect(await ERC721WithRoyalty.ownerOf(1)).to.be.equal(
        await taker.getAddress()
      );

      // check primary market protocol fee
      expect(
        await ERC20Contract.balanceOf(defaultFeeReceiver.getAddress())
      ).to.be.equal(250000000); // 250 * 10000000000 / 10000 = 250000000

      expect(await ERC20Contract.balanceOf(receiver1.getAddress())).to.be.equal(
        0
      );

      expect(await ERC20Contract.balanceOf(receiver2.getAddress())).to.be.equal(
        0
      );

      expect(
        await ERC20Contract.balanceOf(royaltyReceiver.getAddress())
      ).to.be.equal(
        5000000000 // 5000 * 10000000000 / 10000 = 5000000000
      );

      expect(await ERC20Contract.balanceOf(maker.getAddress())).to.be.equal(
        4750000000 // 10000000000 - royalty - protocolFee
      );
    });

    it('should execute a complete match order with royalties 2981(type 3) transferred to fee recipients', async function () {
      await ERC721WithRoyaltyV2981.mint(maker.getAddress(), 1, [
        await FeeRecipientsData(receiver1.getAddress(), 3000),
        await FeeRecipientsData(receiver2.getAddress(), 7000),
      ]);

      await ERC721WithRoyaltyV2981.connect(maker).approve(
        await ExchangeContractAsUser.getAddress(),
        1
      );

      // set up receiver
      await ERC721WithRoyaltyV2981.setRoyaltiesReceiver(
        1,
        royaltyReceiver.getAddress()
      );

      ERC721Asset = await AssetERC721(ERC721WithRoyaltyV2981, 1);
      orderLeft = await OrderDefault(
        maker,
        ERC721Asset,
        ZeroAddress,
        ERC20Asset,
        1,
        0,
        0
      );
      orderRight = await OrderDefault(
        taker,
        ERC20Asset,
        ZeroAddress,
        ERC721Asset,
        1,
        0,
        0
      );
      makerSig = await signOrder(orderLeft, maker, OrderValidatorAsAdmin);
      takerSig = await signOrder(orderRight, taker, OrderValidatorAsAdmin);

      expect(
        await ExchangeContractAsUser.fills(hashKey(orderLeft))
      ).to.be.equal(0);
      expect(
        await ExchangeContractAsUser.fills(hashKey(orderRight))
      ).to.be.equal(0);
      expect(await ERC721WithRoyaltyV2981.ownerOf(1)).to.be.equal(
        await maker.getAddress()
      );
      expect(await ERC20Contract.balanceOf(taker.getAddress())).to.be.equal(
        10000000000
      );

      await ExchangeContractAsUser.matchOrders([
        {
          orderLeft,
          signatureLeft: makerSig,
          orderRight,
          signatureRight: takerSig,
        },
      ]);

      expect(
        await ExchangeContractAsUser.fills(hashKey(orderLeft))
      ).to.be.equal(10000000000);
      expect(
        await ExchangeContractAsUser.fills(hashKey(orderRight))
      ).to.be.equal(1);
      expect(await ERC721WithRoyaltyV2981.ownerOf(1)).to.be.equal(
        await taker.getAddress()
      );

      // check protocol fee
      expect(
        await ERC20Contract.balanceOf(defaultFeeReceiver.getAddress())
      ).to.be.equal(250000000); // 250 * 10000000000 / 10000 = 250000000

      expect(await ERC20Contract.balanceOf(receiver1.getAddress())).to.be.equal(
        1500000000 // 1500 * 10000000000 / 10000 = 1500000000
      );

      expect(await ERC20Contract.balanceOf(receiver2.getAddress())).to.be.equal(
        3500000000 // 3500 * 10000000000 / 10000 = 3500000000
      );

      expect(await ERC20Contract.balanceOf(maker.getAddress())).to.be.equal(
        4750000000 // 10000000000 - royalty - protocolFee
      );
    });

    it('should execute a complete match order without fee and royalties for privileged seller', async function () {
      await ERC721WithRoyaltyV2981.mint(maker.getAddress(), 1, [
        await FeeRecipientsData(maker.getAddress(), 10000),
      ]);

      await ERC721WithRoyaltyV2981.connect(maker).approve(
        await ExchangeContractAsUser.getAddress(),
        1
      );

      // set up receiver
      await ERC721WithRoyaltyV2981.setRoyaltiesReceiver(
        1,
        deployer.getAddress()
      );

      // grant exchange admin role to seller
      await ExchangeContractAsDeployer.connect(admin).grantRole(
        EXCHANGE_ADMIN_ROLE,
        taker.getAddress()
      );

      ERC721Asset = await AssetERC721(ERC721WithRoyaltyV2981, 1);
      orderLeft = await OrderDefault(
        maker,
        ERC721Asset,
        ZeroAddress,
        ERC20Asset,
        1,
        0,
        0
      );
      orderRight = await OrderDefault(
        taker,
        ERC20Asset,
        ZeroAddress,
        ERC721Asset,
        1,
        0,
        0
      );
      makerSig = await signOrder(orderLeft, maker, OrderValidatorAsAdmin);
      takerSig = await signOrder(orderRight, taker, OrderValidatorAsAdmin);

      expect(
        await ExchangeContractAsUser.fills(hashKey(orderLeft))
      ).to.be.equal(0);
      expect(
        await ExchangeContractAsUser.fills(hashKey(orderRight))
      ).to.be.equal(0);
      expect(await ERC721WithRoyaltyV2981.ownerOf(1)).to.be.equal(
        await maker.getAddress()
      );
      expect(await ERC20Contract.balanceOf(taker.getAddress())).to.be.equal(
        10000000000
      );

      await ExchangeContractAsUser.matchOrders([
        {
          orderLeft,
          signatureLeft: makerSig,
          orderRight,
          signatureRight: takerSig,
        },
      ]);
      expect(
        await ExchangeContractAsUser.fills(hashKey(orderLeft))
      ).to.be.equal(10000000000);
      expect(
        await ExchangeContractAsUser.fills(hashKey(orderRight))
      ).to.be.equal(1);
      expect(await ERC721WithRoyaltyV2981.ownerOf(1)).to.be.equal(
        await taker.getAddress()
      );

      // no protocol fee paid
      expect(
        await ERC20Contract.balanceOf(defaultFeeReceiver.getAddress())
      ).to.be.equal(0);

      // no royalties paid
      expect(await ERC20Contract.balanceOf(deployer.getAddress())).to.be.equal(
        0
      );

      expect(await ERC20Contract.balanceOf(maker.getAddress())).to.be.equal(
        10000000000
      );
    });

    describe('token without IROYALTYUGC support', function () {
      beforeEach(async function () {
        await ERC721WithRoyaltyWithoutIROYALTYUGC.mint(maker.getAddress(), 1, [
          await FeeRecipientsData(maker.getAddress(), 10000),
        ]);
        await ERC721WithRoyaltyWithoutIROYALTYUGC.connect(maker).approve(
          await ExchangeContractAsUser.getAddress(),
          1
        );

        ERC721Asset = await AssetERC721(ERC721WithRoyaltyWithoutIROYALTYUGC, 1);
        orderLeft = await OrderDefault(
          maker,
          ERC721Asset,
          ZeroAddress,
          ERC20Asset,
          1,
          0,
          0
        );
        orderRight = await OrderDefault(
          taker,
          ERC20Asset,
          ZeroAddress,
          ERC721Asset,
          1,
          0,
          0
        );
        makerSig = await signOrder(orderLeft, maker, OrderValidatorAsAdmin);
        takerSig = await signOrder(orderRight, taker, OrderValidatorAsAdmin);
      });

      it('should not execute match orders when royalties exceed 50% for token without IROYALTYUGC support', async function () {
        // set royalty greater than 50%
        await ERC721WithRoyaltyWithoutIROYALTYUGC.setRoyalties(1000000);

        expect(
          await ExchangeContractAsUser.fills(hashKey(orderLeft))
        ).to.be.equal(0);
        expect(
          await ExchangeContractAsUser.fills(hashKey(orderRight))
        ).to.be.equal(0);
        expect(
          await ERC721WithRoyaltyWithoutIROYALTYUGC.ownerOf(1)
        ).to.be.equal(await maker.getAddress());
        expect(await ERC20Contract.balanceOf(taker.getAddress())).to.be.equal(
          10000000000
        );

        await expect(
          ExchangeContractAsUser.matchOrders([
            {
              orderLeft,
              signatureLeft: makerSig,
              orderRight,
              signatureRight: takerSig,
            },
          ])
        ).to.be.revertedWith('royalties are too high (>50%)');
      });

      it('should not execute match orders when royalties exceed 50% for token without IROYALTYUGC and royalty.length != 1', async function () {
        // set royalty greater than 50%
        await ERC721WithRoyaltyWithoutIROYALTYUGC.setRoyalties(1000000);

        await ERC721WithRoyaltyWithoutIROYALTYUGC.mint(maker.getAddress(), 2, [
          await FeeRecipientsData(receiver1.getAddress(), 3000),
          await FeeRecipientsData(receiver2.getAddress(), 7000),
        ]);

        await ERC721WithRoyaltyWithoutIROYALTYUGC.connect(maker).approve(
          await ExchangeContractAsUser.getAddress(),
          2
        );

        ERC721Asset = await AssetERC721(ERC721WithRoyaltyWithoutIROYALTYUGC, 2);
        orderLeft = await OrderDefault(
          maker,
          ERC721Asset,
          ZeroAddress,
          ERC20Asset,
          1,
          0,
          0
        );
        orderRight = await OrderDefault(
          taker,
          ERC20Asset,
          ZeroAddress,
          ERC721Asset,
          1,
          0,
          0
        );
        makerSig = await signOrder(orderLeft, maker, OrderValidatorAsAdmin);
        takerSig = await signOrder(orderRight, taker, OrderValidatorAsAdmin);

        expect(
          await ExchangeContractAsUser.fills(hashKey(orderLeft))
        ).to.be.equal(0);
        expect(
          await ExchangeContractAsUser.fills(hashKey(orderRight))
        ).to.be.equal(0);
        expect(
          await ERC721WithRoyaltyWithoutIROYALTYUGC.ownerOf(2)
        ).to.be.equal(await maker.getAddress());
        expect(await ERC20Contract.balanceOf(taker.getAddress())).to.be.equal(
          10000000000
        );

        await expect(
          ExchangeContractAsUser.matchOrders([
            {
              orderLeft,
              signatureLeft: makerSig,
              orderRight,
              signatureRight: takerSig,
            },
          ])
        ).to.be.revertedWith('royalties are too high (>50%)');
      });

      it('should execute match orders for token without IROYALTYUGC support', async function () {
        expect(
          await ExchangeContractAsUser.fills(hashKey(orderLeft))
        ).to.be.equal(0);
        expect(
          await ExchangeContractAsUser.fills(hashKey(orderRight))
        ).to.be.equal(0);
        expect(
          await ERC721WithRoyaltyWithoutIROYALTYUGC.ownerOf(1)
        ).to.be.equal(await maker.getAddress());
        expect(await ERC20Contract.balanceOf(taker.getAddress())).to.be.equal(
          10000000000
        );

        await ExchangeContractAsUser.matchOrders([
          {
            orderLeft,
            signatureLeft: makerSig,
            orderRight,
            signatureRight: takerSig,
          },
        ]);

        expect(
          await ExchangeContractAsUser.fills(hashKey(orderLeft))
        ).to.be.equal(10000000000);
        expect(
          await ExchangeContractAsUser.fills(hashKey(orderRight))
        ).to.be.equal(1);
        expect(
          await ERC721WithRoyaltyWithoutIROYALTYUGC.ownerOf(1)
        ).to.be.equal(await taker.getAddress());
        expect(await ERC20Contract.balanceOf(maker.getAddress())).to.be.equal(
          9750000000
        );
        // check protocol fee
        expect(
          await ERC20Contract.balanceOf(defaultFeeReceiver.getAddress())
        ).to.be.equal(250000000); // 250 * 10000000000 / 10000 = 250000000
      });
    });
  });
}
