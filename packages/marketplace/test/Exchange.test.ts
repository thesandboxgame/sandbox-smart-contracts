import {expect} from 'chai';
import {deployFixtures} from './fixtures.ts';
import {loadFixture} from '@nomicfoundation/hardhat-network-helpers';
import {AssetERC20, AssetERC721, FeeRecipientsData} from './utils/assets.ts';

import {
  getSymmetricOrder,
  hashKey,
  hashOrder,
  OrderDefault,
  signOrder,
  UINT256_MAX_VALUE,
} from './utils/order.ts';
import {ZeroAddress} from 'ethers';

describe('Exchange.sol', function () {
  let ExchangeContractAsDeployer,
    ExchangeContractAsUser,
    ExchangeContractAsAdmin,
    OrderValidatorAsAdmin,
    RoyaltiesRegistryAsDeployer,
    ERC20Contract,
    ERC20Contract2,
    ERC721Contract,
    ERC721WithRoyaltyV2981,
    protocolFeePrimary,
    protocolFeeSecondary,
    defaultFeeReceiver,
    maker,
    taker,
    admin,
    user,
    EXCHANGE_ADMIN_ROLE,
    PAUSER_ROLE;
  let makerAsset, takerAsset, orderLeft, orderRight, makerSig, takerSig;
  beforeEach(async function () {
    ({
      ExchangeContractAsDeployer,
      ExchangeContractAsUser,
      ExchangeContractAsAdmin,
      OrderValidatorAsAdmin,
      RoyaltiesRegistryAsDeployer,
      ERC20Contract,
      ERC20Contract2,
      ERC721Contract,
      ERC721WithRoyaltyV2981,
      protocolFeePrimary,
      protocolFeeSecondary,
      defaultFeeReceiver,
      user1: maker,
      user2: taker,
      admin,
      user,
      EXCHANGE_ADMIN_ROLE,
      PAUSER_ROLE,
    } = await loadFixture(deployFixtures));
  });

  it('should upgrade the contract successfully', async function () {
    const {ExchangeContractAsDeployer, ExchangeUpgradeMock} = await loadFixture(
      deployFixtures
    );
    const protocolFeePrimary =
      await ExchangeContractAsDeployer.protocolFeePrimary();
    const protocolFeeSec =
      await ExchangeContractAsDeployer.protocolFeeSecondary();
    const feeReceiver = await ExchangeContractAsDeployer.defaultFeeReceiver();

    const upgraded = await upgrades.upgradeProxy(
      await ExchangeContractAsDeployer.getAddress(),
      ExchangeUpgradeMock
    );

    expect(await upgraded.protocolFeePrimary()).to.be.equal(protocolFeePrimary);
    expect(await upgraded.protocolFeeSecondary()).to.be.equal(protocolFeeSec);
    expect(await upgraded.defaultFeeReceiver()).to.be.equal(feeReceiver);
  });

  it('should return the correct value of protocol fee', async function () {
    expect(await ExchangeContractAsDeployer.protocolFeePrimary()).to.be.equal(
      protocolFeePrimary
    );
    expect(await ExchangeContractAsDeployer.protocolFeeSecondary()).to.be.equal(
      protocolFeeSecondary
    );
  });

  it('should return the correct fee receiver address', async function () {
    expect(await ExchangeContractAsDeployer.defaultFeeReceiver()).to.be.equal(
      defaultFeeReceiver.address
    );
  });

  it('should return the correct royalty registry address', async function () {
    expect(await ExchangeContractAsDeployer.royaltiesRegistry()).to.be.equal(
      await RoyaltiesRegistryAsDeployer.getAddress()
    );
  });

  it('should not allow setting protocol primary fee greater than or equal to 5000', async function () {
    // grant exchange admin role to user
    await ExchangeContractAsDeployer.connect(admin).grantRole(
      EXCHANGE_ADMIN_ROLE,
      user.address
    );

    await expect(
      ExchangeContractAsUser.connect(user).setProtocolFee(5000, 100)
    ).to.be.revertedWith('invalid primary fee');
  });

  it('should not allow setting protocol secondry fee greater than or equal to 5000', async function () {
    // grant exchange admin role to user
    await ExchangeContractAsDeployer.connect(admin).grantRole(
      EXCHANGE_ADMIN_ROLE,
      user.address
    );

    await expect(
      ExchangeContractAsUser.connect(user).setProtocolFee(1000, 5000)
    ).to.be.revertedWith('invalid secondary fee');
  });

  describe('cancel order', function () {
    beforeEach(async function () {
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
    });

    it('should not cancel an order if Exchange Contract is paused', async function () {
      await ExchangeContractAsAdmin.grantRole(PAUSER_ROLE, user.address);
      await ExchangeContractAsAdmin.connect(user).pause();
      expect(await ExchangeContractAsAdmin.paused()).to.be.true;

      await expect(
        ExchangeContractAsUser.cancel(orderLeft, hashKey(orderLeft))
      ).to.be.revertedWith('Pausable: paused');
    });

    it('should not cancel the order if caller is not maker', async function () {
      await expect(
        ExchangeContractAsDeployer.connect(taker).cancel(
          orderLeft,
          hashOrder(orderLeft)
        )
      ).to.be.revertedWith('not maker');
    });

    it('should not cancel order with zero salt', async function () {
      const leftOrder = await OrderDefault(
        maker,
        makerAsset,
        ZeroAddress,
        takerAsset,
        0, // setting salt value to 0
        0,
        0
      );
      await expect(
        ExchangeContractAsUser.connect(maker).cancel(
          leftOrder,
          hashKey(leftOrder)
        )
      ).to.be.revertedWith("0 salt can't be used");
    });

    it('should not cancel the order with invalid order hash', async function () {
      const invalidOrderHash =
        '0x1234567890123456789012345678901234567890123456789012345678901234';
      await expect(
        ExchangeContractAsUser.connect(maker).cancel(
          orderLeft,
          invalidOrderHash
        )
      ).to.be.revertedWith('Invalid orderHash');
    });

    it('should cancel an order and update fills mapping', async function () {
      await ExchangeContractAsUser.connect(maker).cancel(
        orderLeft,
        hashKey(orderLeft)
      );

      expect(
        await ExchangeContractAsUser.fills(hashKey(orderLeft))
      ).to.be.equal(UINT256_MAX_VALUE);
    });
  });

  describe('batching', function () {
    beforeEach(async function () {
      ({user: taker, user2: maker} = await loadFixture(deployFixtures));
    });
    it('should be able to buy 2 tokens from different orders in one txs', async function () {
      const totalPayment = 200;
      await ERC20Contract.mint(taker.address, totalPayment);
      await ERC20Contract.connect(taker).approve(
        await ExchangeContractAsUser.getAddress(),
        totalPayment
      );
      await ERC721Contract.mint(maker.address, 123);
      await ERC721Contract.connect(maker).approve(
        await ExchangeContractAsUser.getAddress(),
        123
      );
      await ERC721Contract.mint(maker.address, 345);
      await ERC721Contract.connect(maker).approve(
        await ExchangeContractAsUser.getAddress(),
        345
      );

      expect(await ERC20Contract.balanceOf(taker)).to.be.equal(totalPayment);
      expect(await ERC20Contract.balanceOf(maker)).to.be.equal(0);

      expect(await ERC721Contract.ownerOf(123)).to.be.equal(maker.address);
      expect(await ERC721Contract.ownerOf(345)).to.be.equal(maker.address);

      const takerAsset = await AssetERC20(ERC20Contract, totalPayment / 2);
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
      // 4 == fees?
      expect(await ERC20Contract.balanceOf(maker)).to.be.equal(
        totalPayment - 4
      );

      expect(await ERC721Contract.ownerOf(123)).to.be.equal(taker.address);
      expect(await ERC721Contract.ownerOf(345)).to.be.equal(taker.address);
    });

    it('should be able to buy 3 tokens from different orders in one txs', async function () {
      const totalPayment = 300;
      await ERC20Contract.mint(taker.address, totalPayment);
      await ERC20Contract.connect(taker).approve(
        await ExchangeContractAsUser.getAddress(),
        totalPayment
      );

      for (let i = 0; i < 3; i++) {
        await ERC721Contract.mint(maker.address, i);
        await ERC721Contract.connect(maker).approve(
          await ExchangeContractAsUser.getAddress(),
          i
        );
      }

      expect(await ERC20Contract.balanceOf(taker)).to.be.equal(totalPayment);
      expect(await ERC20Contract.balanceOf(maker)).to.be.equal(0);

      for (let i = 0; i < 3; i++) {
        expect(await ERC721Contract.ownerOf(i)).to.be.equal(maker.address);
      }

      const takerAsset = await AssetERC20(ERC20Contract, totalPayment / 3);

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
        expect(await ERC721Contract.ownerOf(i)).to.be.equal(taker.address);
      }
    });

    // eslint-disable-next-line mocha/no-skipped-tests
    it.skip('@slow should be able to buy 20 tokens from different orders in one txs', async function () {
      const totalPayment = 2000;
      await ERC20Contract.mint(taker.address, totalPayment);
      await ERC20Contract.connect(taker).approve(
        await ExchangeContractAsUser.getAddress(),
        totalPayment
      );

      for (let i = 0; i < 20; i++) {
        await ERC721Contract.mint(maker.address, i);
        await ERC721Contract.connect(maker).approve(
          await ExchangeContractAsUser.getAddress(),
          i
        );
      }

      expect(await ERC20Contract.balanceOf(taker)).to.be.equal(totalPayment);
      expect(await ERC20Contract.balanceOf(maker)).to.be.equal(0);

      for (let i = 0; i < 20; i++) {
        expect(await ERC721Contract.ownerOf(i)).to.be.equal(maker.address);
      }

      const takerAsset = await AssetERC20(ERC20Contract, totalPayment / 20);

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
        expect(await ERC721Contract.ownerOf(i)).to.be.equal(taker.address);
      }
    });

    // eslint-disable-next-line mocha/no-skipped-tests
    it.skip('@slow should be able to buy 50 tokens from different orders in one txs', async function () {
      const totalPayment = 5000;
      await ERC20Contract.mint(taker.address, totalPayment);
      await ERC20Contract.connect(taker).approve(
        await ExchangeContractAsUser.getAddress(),
        totalPayment
      );

      for (let i = 0; i < 50; i++) {
        await ERC721Contract.mint(maker.address, i);
        await ERC721Contract.connect(maker).approve(
          await ExchangeContractAsUser.getAddress(),
          i
        );
      }

      expect(await ERC20Contract.balanceOf(taker)).to.be.equal(totalPayment);
      expect(await ERC20Contract.balanceOf(maker)).to.be.equal(0);

      for (let i = 0; i < 50; i++) {
        expect(await ERC721Contract.ownerOf(i)).to.be.equal(maker.address);
      }

      const takerAsset = await AssetERC20(ERC20Contract, totalPayment / 50);

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
        expect(await ERC721Contract.ownerOf(i)).to.be.equal(taker.address);
      }
    });

    it('should not be able to buy 51 tokens from different orders in one txs, match orders limit = 50', async function () {
      const totalPayment = 5100;
      await ERC20Contract.mint(taker.address, totalPayment);
      await ERC20Contract.connect(taker).approve(
        await ExchangeContractAsUser.getAddress(),
        totalPayment
      );

      for (let i = 0; i < 51; i++) {
        await ERC721Contract.mint(maker.address, i);
        await ERC721Contract.connect(maker).approve(
          await ExchangeContractAsUser.getAddress(),
          i
        );
      }

      expect(await ERC20Contract.balanceOf(taker)).to.be.equal(totalPayment);
      expect(await ERC20Contract.balanceOf(maker)).to.be.equal(0);

      for (let i = 0; i < 51; i++) {
        expect(await ERC721Contract.ownerOf(i)).to.be.equal(maker.address);
      }

      const takerAsset = await AssetERC20(ERC20Contract, totalPayment / 51);

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

  describe('Whitelisting tokens', function () {
    beforeEach(async function () {
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

      makerSig = await signOrder(orderLeft, maker, OrderValidatorAsAdmin);
      takerSig = await signOrder(orderRight, taker, OrderValidatorAsAdmin);
    });
    it('should NOT execute a complete match order between ERC20 tokens if whitelisting for ERC20 is ON', async function () {
      const ERC20_ROLE = await OrderValidatorAsAdmin.ERC20_ROLE();
      await OrderValidatorAsAdmin.enableRole(ERC20_ROLE);
      await expect(
        ExchangeContractAsUser.matchOrders([
          {
            orderLeft,
            signatureLeft: makerSig,
            orderRight,
            signatureRight: takerSig,
          },
        ])
      ).to.be.revertedWith('payment token not allowed');
    });

    it('should execute a complete match order between ERC20 tokens if added to whitelist and ERC20 is ON', async function () {
      const ERC20_ROLE = await OrderValidatorAsAdmin.ERC20_ROLE();
      await OrderValidatorAsAdmin.enableRole(ERC20_ROLE);
      await OrderValidatorAsAdmin.grantRole(ERC20_ROLE, ERC20Contract);
      await OrderValidatorAsAdmin.grantRole(ERC20_ROLE, ERC20Contract2);

      await ExchangeContractAsUser.matchOrders([
        {
          orderLeft,
          signatureLeft: makerSig,
          orderRight,
          signatureRight: takerSig,
        },
      ]);
    });

    it('should NOT allow ERC721 tokens exchange if TSB_ROLE is activated and token is not whitelisted', async function () {
      const {
        deployer: maker, // making deployer the maker to sell in primary market
        user2: taker,
      } = await loadFixture(deployFixtures);

      await ERC721WithRoyaltyV2981.mint(maker.address, 1, [
        await FeeRecipientsData(maker.address, 10000),
      ]);

      await ERC721WithRoyaltyV2981.connect(maker).approve(
        await ExchangeContractAsUser.getAddress(),
        1
      );
      await ERC20Contract.mint(taker.address, 100000000000);
      await ERC20Contract.connect(taker).approve(
        await ExchangeContractAsUser.getAddress(),
        100000000000
      );

      expect(await ERC721WithRoyaltyV2981.ownerOf(1)).to.be.equal(
        maker.address
      );
      expect(await ERC20Contract.balanceOf(taker.address)).to.be.equal(
        100000000000
      );
      const makerAsset = await AssetERC721(ERC721WithRoyaltyV2981, 1);
      const takerAsset = await AssetERC20(ERC20Contract, 100000000000);
      const orderLeft = await OrderDefault(
        maker,
        makerAsset,
        ZeroAddress,
        takerAsset,
        1,
        0,
        0
      );
      const orderRight = await OrderDefault(
        taker,
        takerAsset,
        ZeroAddress,
        makerAsset,
        1,
        0,
        0
      );
      const makerSig = await signOrder(orderLeft, maker, OrderValidatorAsAdmin);
      const takerSig = await signOrder(
        orderRight,
        taker,
        OrderValidatorAsAdmin
      );

      expect(
        await ExchangeContractAsUser.fills(hashKey(orderLeft))
      ).to.be.equal(0);
      expect(
        await ExchangeContractAsUser.fills(hashKey(orderRight))
      ).to.be.equal(0);

      await OrderValidatorAsAdmin.disableWhitelists();
      const TSB_ROLE = await OrderValidatorAsAdmin.TSB_ROLE();
      await OrderValidatorAsAdmin.enableRole(TSB_ROLE);

      await expect(
        ExchangeContractAsUser.matchOrders([
          {
            orderLeft,
            signatureLeft: makerSig,
            orderRight,
            signatureRight: takerSig,
          },
        ])
      ).to.be.revertedWith('not allowed');
    });

    it('should allow ERC721 tokens exchange if TSB_ROLE is activated and token is whitelisted', async function () {
      const {
        deployer: maker, // making deployer the maker to sell in primary market
        user2: taker,
      } = await loadFixture(deployFixtures);

      await ERC721WithRoyaltyV2981.mint(maker.address, 1, [
        await FeeRecipientsData(maker.address, 10000),
      ]);

      await ERC721WithRoyaltyV2981.connect(maker).approve(
        await ExchangeContractAsUser.getAddress(),
        1
      );
      await ERC20Contract.mint(taker.address, 100000000000);
      await ERC20Contract.connect(taker).approve(
        await ExchangeContractAsUser.getAddress(),
        100000000000
      );

      expect(await ERC721WithRoyaltyV2981.ownerOf(1)).to.be.equal(
        maker.address
      );
      expect(await ERC20Contract.balanceOf(taker.address)).to.be.equal(
        100000000000
      );
      const makerAsset = await AssetERC721(ERC721WithRoyaltyV2981, 1);
      const takerAsset = await AssetERC20(ERC20Contract, 100000000000);
      const orderLeft = await OrderDefault(
        maker,
        makerAsset,
        ZeroAddress,
        takerAsset,
        1,
        0,
        0
      );
      const orderRight = await OrderDefault(
        taker,
        takerAsset,
        ZeroAddress,
        makerAsset,
        1,
        0,
        0
      );
      const makerSig = await signOrder(orderLeft, maker, OrderValidatorAsAdmin);
      const takerSig = await signOrder(
        orderRight,
        taker,
        OrderValidatorAsAdmin
      );

      expect(
        await ExchangeContractAsUser.fills(hashKey(orderLeft))
      ).to.be.equal(0);
      expect(
        await ExchangeContractAsUser.fills(hashKey(orderRight))
      ).to.be.equal(0);

      await OrderValidatorAsAdmin.disableWhitelists();
      const TSB_ROLE = await OrderValidatorAsAdmin.TSB_ROLE();
      await OrderValidatorAsAdmin.enableRole(TSB_ROLE);
      await OrderValidatorAsAdmin.grantRole(TSB_ROLE, ERC721WithRoyaltyV2981);

      await ExchangeContractAsUser.matchOrders([
        {
          orderLeft,
          signatureLeft: makerSig,
          orderRight,
          signatureRight: takerSig,
        },
      ]);
    });

    it('should NOT allow ERC721 tokens exchange if PARTNER_ROLE is activated and token is not whitelisted', async function () {
      const {
        deployer: maker, // making deployer the maker to sell in primary market
        user2: taker,
      } = await loadFixture(deployFixtures);

      await ERC721WithRoyaltyV2981.mint(maker.address, 1, [
        await FeeRecipientsData(maker.address, 10000),
      ]);

      await ERC721WithRoyaltyV2981.connect(maker).approve(
        await ExchangeContractAsUser.getAddress(),
        1
      );
      await ERC20Contract.mint(taker.address, 100000000000);
      await ERC20Contract.connect(taker).approve(
        await ExchangeContractAsUser.getAddress(),
        100000000000
      );

      expect(await ERC721WithRoyaltyV2981.ownerOf(1)).to.be.equal(
        maker.address
      );
      expect(await ERC20Contract.balanceOf(taker.address)).to.be.equal(
        100000000000
      );
      const makerAsset = await AssetERC721(ERC721WithRoyaltyV2981, 1);
      const takerAsset = await AssetERC20(ERC20Contract, 100000000000);
      const orderLeft = await OrderDefault(
        maker,
        makerAsset,
        ZeroAddress,
        takerAsset,
        1,
        0,
        0
      );
      const orderRight = await OrderDefault(
        taker,
        takerAsset,
        ZeroAddress,
        makerAsset,
        1,
        0,
        0
      );
      const makerSig = await signOrder(orderLeft, maker, OrderValidatorAsAdmin);
      const takerSig = await signOrder(
        orderRight,
        taker,
        OrderValidatorAsAdmin
      );

      expect(
        await ExchangeContractAsUser.fills(hashKey(orderLeft))
      ).to.be.equal(0);
      expect(
        await ExchangeContractAsUser.fills(hashKey(orderRight))
      ).to.be.equal(0);

      await OrderValidatorAsAdmin.disableWhitelists();
      const PARTNER_ROLE = await OrderValidatorAsAdmin.PARTNER_ROLE();
      await OrderValidatorAsAdmin.enableRole(PARTNER_ROLE);

      await expect(
        ExchangeContractAsUser.matchOrders([
          {
            orderLeft,
            signatureLeft: makerSig,
            orderRight,
            signatureRight: takerSig,
          },
        ])
      ).to.be.revertedWith('not allowed');
    });

    it('should allow ERC721 tokens exchange if PARTNERS is activated and token is whitelisted', async function () {
      const {
        deployer: maker, // making deployer the maker to sell in primary market
        user2: taker,
      } = await loadFixture(deployFixtures);

      await ERC721WithRoyaltyV2981.mint(maker.address, 1, [
        await FeeRecipientsData(maker.address, 10000),
      ]);

      await ERC721WithRoyaltyV2981.connect(maker).approve(
        await ExchangeContractAsUser.getAddress(),
        1
      );
      await ERC20Contract.mint(taker.address, 100000000000);
      await ERC20Contract.connect(taker).approve(
        await ExchangeContractAsUser.getAddress(),
        100000000000
      );

      expect(await ERC721WithRoyaltyV2981.ownerOf(1)).to.be.equal(
        maker.address
      );
      expect(await ERC20Contract.balanceOf(taker.address)).to.be.equal(
        100000000000
      );
      const makerAsset = await AssetERC721(ERC721WithRoyaltyV2981, 1);
      const takerAsset = await AssetERC20(ERC20Contract, 100000000000);
      const orderLeft = await OrderDefault(
        maker,
        makerAsset,
        ZeroAddress,
        takerAsset,
        1,
        0,
        0
      );
      const orderRight = await OrderDefault(
        taker,
        takerAsset,
        ZeroAddress,
        makerAsset,
        1,
        0,
        0
      );
      const makerSig = await signOrder(orderLeft, maker, OrderValidatorAsAdmin);
      const takerSig = await signOrder(
        orderRight,
        taker,
        OrderValidatorAsAdmin
      );

      expect(
        await ExchangeContractAsUser.fills(hashKey(orderLeft))
      ).to.be.equal(0);
      expect(
        await ExchangeContractAsUser.fills(hashKey(orderRight))
      ).to.be.equal(0);

      await OrderValidatorAsAdmin.disableWhitelists();
      const PARTNER_ROLE = await OrderValidatorAsAdmin.PARTNER_ROLE();
      await OrderValidatorAsAdmin.enableRole(PARTNER_ROLE);
      await OrderValidatorAsAdmin.grantRole(
        PARTNER_ROLE,
        ERC721WithRoyaltyV2981
      );

      await ExchangeContractAsUser.matchOrders([
        {
          orderLeft,
          signatureLeft: makerSig,
          orderRight,
          signatureRight: takerSig,
        },
      ]);
    });

    it('should allow ERC721 tokens exchange if TSB_ROLE and PARTNER_ROLE are activated but so is open', async function () {
      const {
        deployer: maker, // making deployer the maker to sell in primary market
        user2: taker,
      } = await loadFixture(deployFixtures);

      await ERC721WithRoyaltyV2981.mint(maker.address, 1, [
        await FeeRecipientsData(maker.address, 10000),
      ]);

      await ERC721WithRoyaltyV2981.connect(maker).approve(
        await ExchangeContractAsUser.getAddress(),
        1
      );
      await ERC20Contract.mint(taker.address, 100000000000);
      await ERC20Contract.connect(taker).approve(
        await ExchangeContractAsUser.getAddress(),
        100000000000
      );

      expect(await ERC721WithRoyaltyV2981.ownerOf(1)).to.be.equal(
        maker.address
      );
      expect(await ERC20Contract.balanceOf(taker.address)).to.be.equal(
        100000000000
      );
      const makerAsset = await AssetERC721(ERC721WithRoyaltyV2981, 1);
      const takerAsset = await AssetERC20(ERC20Contract, 100000000000);
      const orderLeft = await OrderDefault(
        maker,
        makerAsset,
        ZeroAddress,
        takerAsset,
        1,
        0,
        0
      );
      const orderRight = await OrderDefault(
        taker,
        takerAsset,
        ZeroAddress,
        makerAsset,
        1,
        0,
        0
      );
      const makerSig = await signOrder(orderLeft, maker, OrderValidatorAsAdmin);
      const takerSig = await signOrder(
        orderRight,
        taker,
        OrderValidatorAsAdmin
      );

      expect(
        await ExchangeContractAsUser.fills(hashKey(orderLeft))
      ).to.be.equal(0);
      expect(
        await ExchangeContractAsUser.fills(hashKey(orderRight))
      ).to.be.equal(0);

      const PARTNER_ROLE = await OrderValidatorAsAdmin.PARTNER_ROLE();
      const TSB_ROLE = await OrderValidatorAsAdmin.PARTNER_ROLE();
      await OrderValidatorAsAdmin.setRolesEnabled(
        [PARTNER_ROLE, TSB_ROLE],
        [true, true]
      );

      await ExchangeContractAsUser.matchOrders([
        {
          orderLeft,
          signatureLeft: makerSig,
          orderRight,
          signatureRight: takerSig,
        },
      ]);
    });
  });
});
