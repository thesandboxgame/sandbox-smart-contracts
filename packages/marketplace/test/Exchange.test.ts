import {expect} from 'chai';
import {deployFixtures} from './fixtures/index.ts';
import {loadFixture, mine} from '@nomicfoundation/hardhat-network-helpers';
import {
  AssetERC20,
  AssetERC721,
  AssetERC1155,
  Asset,
  AssetClassType,
} from './utils/assets.ts';

import {
  hashKey,
  hashOrder,
  OrderDefault,
  signOrder,
  Order,
  UINT256_MAX_VALUE,
} from './utils/order.ts';
import {ZeroAddress, Contract, Signer} from 'ethers';
import {upgrades} from 'hardhat';

import {exchangeConfig} from './exchange/Config.behavior.ts';
import {shouldMatchOrders} from './exchange/MatchOrders.behavior.ts';
import {shouldMatchOrderForBatching} from './exchange/Batching.behavior.ts';
import {shouldSupportInterfaces} from './common/SupportsInterface.behavior.ts';
import {shouldCheckForWhitelisting} from './exchange/WhitelistingTokens.behavior.ts';
import {shouldMatchOrdersWithRoyalty} from './exchange/MatchOrdersWithRoyalties.behavior.ts';
import {shouldMatchOrdersForBundle} from './exchange/Bundle.behavior.ts';
import {shouldMatchOrdersForBundleWithRoyalty} from './exchange/BundleWithRoyalties.behaviour.ts';

describe('Exchange.sol', function () {
  let AssetMatcherAsUser: Contract,
    ExchangeContractAsDeployer: Contract,
    ExchangeContractAsUser: Contract,
    ExchangeContractAsAdmin: Contract,
    ExchangeUpgradeMock: Contract,
    OrderValidatorAsAdmin: Contract,
    RoyaltiesRegistryAsDeployer: Contract,
    TrustedForwarder: Contract,
    ERC20Contract: Contract,
    ERC20Contract2: Contract,
    ERC721Contract: Contract,
    ERC1155Contract: Contract,
    protocolFeePrimary: number,
    protocolFeeSecondary: number,
    defaultFeeReceiver: Signer,
    maker: Signer,
    taker: Signer,
    admin: Signer,
    user: Signer,
    makerAsset: Asset,
    takerAsset: Asset,
    orderLeft: Order,
    orderRight: Order,
    makerSig: string,
    takerSig: string,
    EXCHANGE_ADMIN_ROLE: string,
    PAUSER_ROLE: string;

  beforeEach(async function () {
    ({
      AssetMatcherAsUser,
      ExchangeContractAsDeployer,
      ExchangeContractAsUser,
      ExchangeContractAsAdmin,
      ExchangeUpgradeMock,
      OrderValidatorAsAdmin,
      RoyaltiesRegistryAsDeployer,
      TrustedForwarder,
      ERC20Contract,
      ERC20Contract2,
      ERC721Contract,
      ERC1155Contract,
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

  // eslint-disable-next-line mocha/no-setup-in-describe
  shouldSupportInterfaces(
    function (interfaceId: string) {
      return ExchangeContractAsAdmin.supportsInterface(interfaceId);
    },
    {
      IERC165: '0x01ffc9a7',
      IAccessControl: '0x7965db0b',
      IAccessControlEnumerable: '0x5a05180f',
    }
  );

  // eslint-disable-next-line mocha/no-setup-in-describe
  shouldMatchOrders();

  // eslint-disable-next-line mocha/no-setup-in-describe
  shouldMatchOrdersWithRoyalty();

  // eslint-disable-next-line mocha/no-setup-in-describe
  shouldCheckForWhitelisting();

  // eslint-disable-next-line mocha/no-setup-in-describe
  shouldMatchOrderForBatching();

  // eslint-disable-next-line mocha/no-setup-in-describe
  shouldMatchOrdersForBundle();

  // eslint-disable-next-line mocha/no-setup-in-describe
  shouldMatchOrdersForBundleWithRoyalty();

  // eslint-disable-next-line mocha/no-setup-in-describe
  exchangeConfig();

  it('should upgrade the contract successfully', async function () {
    const upgraded = await upgrades.upgradeProxy(
      await ExchangeContractAsDeployer.getAddress(),
      ExchangeUpgradeMock
    );

    expect(await upgraded.protocolFeePrimary()).to.be.equal(protocolFeePrimary);
    expect(await upgraded.protocolFeeSecondary()).to.be.equal(
      protocolFeeSecondary
    );
    expect(await upgraded.defaultFeeReceiver()).to.be.equal(
      await defaultFeeReceiver.getAddress()
    );
  });

  it('should initialize the values correctly', async function () {
    expect(await ExchangeContractAsAdmin.royaltiesRegistry()).to.be.equal(
      await RoyaltiesRegistryAsDeployer.getAddress()
    );
    expect(await ExchangeContractAsAdmin.orderValidator()).to.be.equal(
      await OrderValidatorAsAdmin.getAddress()
    );
    expect(await ExchangeContractAsAdmin.getTrustedForwarder()).to.be.equal(
      await TrustedForwarder.getAddress()
    );
    expect(await ExchangeContractAsAdmin.protocolFeePrimary()).to.be.equal(
      protocolFeePrimary
    );
    expect(await ExchangeContractAsAdmin.protocolFeeSecondary()).to.be.equal(
      protocolFeeSecondary
    );
    expect(await ExchangeContractAsAdmin.defaultFeeReceiver()).to.be.equal(
      await defaultFeeReceiver.getAddress()
    );
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
      await defaultFeeReceiver.getAddress()
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
      user.getAddress()
    );

    await expect(
      ExchangeContractAsUser.connect(user).setProtocolFee(5000, 100)
    ).to.be.revertedWith('invalid primary fee');
  });

  it('should not allow setting protocol secondry fee greater than or equal to 5000', async function () {
    // grant exchange admin role to user
    await ExchangeContractAsDeployer.connect(admin).grantRole(
      EXCHANGE_ADMIN_ROLE,
      user.getAddress()
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
      ).to.be.revertedWith('invalid orderHash');
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

  describe('matchOrders validation', function () {
    beforeEach(async function () {
      await ERC20Contract.mint(maker.getAddress(), 10000000000);
      await ERC20Contract.connect(maker).approve(
        await ExchangeContractAsUser.getAddress(),
        10000000000
      );

      await ERC20Contract2.mint(taker.getAddress(), 20000000000);
      await ERC20Contract2.connect(taker).approve(
        await ExchangeContractAsUser.getAddress(),
        20000000000
      );
      makerAsset = await AssetERC20(ERC20Contract, 10000000000);
      takerAsset = await AssetERC20(ERC20Contract2, 20000000000);
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

    it('should not execute match order if Exchange Contract is paused', async function () {
      await ExchangeContractAsAdmin.grantRole(PAUSER_ROLE, user.getAddress());
      await ExchangeContractAsAdmin.connect(user).pause();
      expect(await ExchangeContractAsAdmin.paused()).to.be.true;

      await expect(
        ExchangeContractAsUser.matchOrders([
          {
            orderLeft,
            signatureLeft: makerSig,
            orderRight,
            signatureRight: takerSig,
          },
        ])
      ).to.be.revertedWith('Pausable: paused');
    });

    it('should not execute match order with an empty order array', async function () {
      await expect(ExchangeContractAsUser.matchOrders([])).to.be.revertedWith(
        'ExchangeMatch cannot be empty'
      );
    });

    it('should revert for matching a cancelled order', async function () {
      await ERC721Contract.mint(maker.getAddress(), 1);
      await ERC721Contract.connect(maker).approve(
        await ExchangeContractAsUser.getAddress(),
        1
      );

      expect(await ERC721Contract.ownerOf(1)).to.be.equal(
        await maker.getAddress()
      );
      expect(await ERC20Contract2.balanceOf(taker.getAddress())).to.be.equal(
        20000000000
      );
      makerAsset = await AssetERC721(ERC721Contract, 1);
      takerAsset = await AssetERC20(ERC20Contract2, 20000000000);
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
      await ExchangeContractAsUser.connect(maker).cancel(
        orderLeft,
        hashKey(orderLeft)
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
      ).to.be.reverted;
    });

    it('should not execute match order when left order taker is not equal to right order maker', async function () {
      orderLeft = await OrderDefault(
        maker,
        makerAsset,
        user,
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

      await expect(
        ExchangeContractAsUser.matchOrders([
          {
            orderLeft,
            signatureLeft: makerSig,
            orderRight,
            signatureRight: takerSig,
          },
        ])
      ).to.be.revertedWith('leftOrder.taker failed');
    });

    it('should not execute match order when right order taker is not equal to left order maker', async function () {
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
        user,
        makerAsset,
        1,
        0,
        0
      );

      makerSig = await signOrder(orderLeft, maker, OrderValidatorAsAdmin);
      takerSig = await signOrder(orderRight, taker, OrderValidatorAsAdmin);
      await expect(
        ExchangeContractAsUser.matchOrders([
          {
            orderLeft,
            signatureLeft: makerSig,
            orderRight,
            signatureRight: takerSig,
          },
        ])
      ).to.be.revertedWith('rightOrder.taker failed');
    });

    it('should not execute match order when order start time is in the future', async function () {
      orderLeft = await OrderDefault(
        maker,
        makerAsset,
        ZeroAddress,
        takerAsset,
        1,
        (await ethers.provider.getBlock('latest')).timestamp + 100,
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

      await expect(
        ExchangeContractAsUser.matchOrders([
          {
            orderLeft,
            signatureLeft: makerSig,
            orderRight,
            signatureRight: takerSig,
          },
        ])
      ).to.be.revertedWith('Order start validation failed');
    });

    it('should not execute match order when order end time is in the past', async function () {
      orderLeft = await OrderDefault(
        maker,
        makerAsset,
        ZeroAddress,
        takerAsset,
        1,
        0,
        (await ethers.provider.getBlock('latest')).timestamp - 100
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

      await expect(
        ExchangeContractAsUser.matchOrders([
          {
            orderLeft,
            signatureLeft: makerSig,
            orderRight,
            signatureRight: takerSig,
          },
        ])
      ).to.be.revertedWith('Order end validation failed');
    });

    it('should execute match order when order start time is non zero and less than current timestamp', async function () {
      orderLeft = await OrderDefault(
        maker,
        makerAsset,
        ZeroAddress,
        takerAsset,
        1,
        (await ethers.provider.getBlock('latest')).timestamp + 100,
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
      // advance timestamp 100 second ahead of left order start time
      await mine(200);

      expect(await ERC20Contract.balanceOf(maker)).to.be.equal(10000000000);
      expect(await ERC20Contract.balanceOf(taker)).to.be.equal(0);
      expect(await ERC20Contract2.balanceOf(maker)).to.be.equal(0);
      expect(await ERC20Contract2.balanceOf(taker)).to.be.equal(20000000000);

      await ExchangeContractAsUser.matchOrders([
        {
          orderLeft,
          signatureLeft: makerSig,
          orderRight,
          signatureRight: takerSig,
        },
      ]);

      expect(await ERC20Contract.balanceOf(maker)).to.be.equal(0);
      expect(await ERC20Contract.balanceOf(taker)).to.be.equal(10000000000);
      expect(await ERC20Contract2.balanceOf(maker)).to.be.equal(20000000000);
      expect(await ERC20Contract2.balanceOf(taker)).to.be.equal(0);
    });

    it('should execute match order when order end time is non zero and more than current timestamp', async function () {
      orderLeft = await OrderDefault(
        maker,
        makerAsset,
        ZeroAddress,
        takerAsset,
        1,
        0,
        (await ethers.provider.getBlock('latest')).timestamp + 100
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

      expect(await ERC20Contract.balanceOf(maker)).to.be.equal(10000000000);
      expect(await ERC20Contract.balanceOf(taker)).to.be.equal(0);
      expect(await ERC20Contract2.balanceOf(maker)).to.be.equal(0);
      expect(await ERC20Contract2.balanceOf(taker)).to.be.equal(20000000000);

      await ExchangeContractAsUser.matchOrders([
        {
          orderLeft,
          signatureLeft: makerSig,
          orderRight,
          signatureRight: takerSig,
        },
      ]);

      expect(await ERC20Contract.balanceOf(maker)).to.be.equal(0);
      expect(await ERC20Contract.balanceOf(taker)).to.be.equal(10000000000);
      expect(await ERC20Contract2.balanceOf(maker)).to.be.equal(20000000000);
      expect(await ERC20Contract2.balanceOf(taker)).to.be.equal(0);
    });

    it('should not execute match order with makerValue greater than rightMakeValue', async function () {
      const makerAssetForLeftOrder = await AssetERC20(
        ERC20Contract,
        20000000000
      );
      const takerAssetForLeftOrder = await AssetERC20(
        ERC20Contract2,
        40000000000
      );
      const takerAssetForRightOrder = await AssetERC20(
        ERC20Contract2,
        10000000000
      );
      const makerAssetForRightOrder = await AssetERC20(
        ERC20Contract,
        10000000000
      );

      orderLeft = await OrderDefault(
        maker,
        makerAssetForLeftOrder,
        ZeroAddress,
        takerAssetForLeftOrder,
        1,
        0,
        0
      );
      orderRight = await OrderDefault(
        taker,
        takerAssetForRightOrder,
        ZeroAddress,
        makerAssetForRightOrder,
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
      expect(await ERC20Contract.balanceOf(maker)).to.be.equal(10000000000);
      expect(await ERC20Contract.balanceOf(taker)).to.be.equal(0);
      expect(await ERC20Contract2.balanceOf(maker)).to.be.equal(0);
      expect(await ERC20Contract2.balanceOf(taker)).to.be.equal(20000000000);

      await expect(
        ExchangeContractAsUser.matchOrders([
          {
            orderLeft,
            signatureLeft: makerSig,
            orderRight,
            signatureRight: takerSig,
          },
        ])
      ).to.be.revertedWith('fillRight: unable to fill');
    });

    it('should not execute match order with zero make value', async function () {
      const makerAssetForLeftOrder = await AssetERC20(
        ERC20Contract,
        10000000000
      );
      const takerAssetForLeftOrder = await AssetERC20(
        ERC20Contract2,
        30000000000
      );
      const takerAssetForRightOrder = await AssetERC20(
        ERC20Contract2,
        40000000000
      );
      const makerAssetForRightOrder = await AssetERC20(ERC20Contract, 0);

      orderLeft = await OrderDefault(
        maker,
        makerAssetForLeftOrder,
        ZeroAddress,
        takerAssetForLeftOrder,
        1,
        0,
        0
      );
      orderRight = await OrderDefault(
        taker,
        takerAssetForRightOrder,
        ZeroAddress,
        makerAssetForRightOrder,
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
      expect(await ERC20Contract.balanceOf(maker)).to.be.equal(10000000000);
      expect(await ERC20Contract.balanceOf(taker)).to.be.equal(0);
      expect(await ERC20Contract2.balanceOf(maker)).to.be.equal(0);
      expect(await ERC20Contract2.balanceOf(taker)).to.be.equal(20000000000);

      await expect(
        ExchangeContractAsUser.matchOrders([
          {
            orderLeft,
            signatureLeft: makerSig,
            orderRight,
            signatureRight: takerSig,
          },
        ])
      ).to.be.revertedWith('division by zero');
    });

    it('should not execute match order with significant rounding error', async function () {
      const makerAssetForLeftOrder = await AssetERC20(ERC20Contract, 100);
      const takerAssetForLeftOrder = await AssetERC20(ERC20Contract2, 100);
      const takerAssetForRightOrder = await AssetERC20(ERC20Contract2, 1000);
      const makerAssetForRightOrder = await AssetERC20(ERC20Contract, 999);

      orderLeft = await OrderDefault(
        maker,
        makerAssetForLeftOrder,
        ZeroAddress,
        takerAssetForLeftOrder,
        1,
        0,
        0
      );
      orderRight = await OrderDefault(
        taker,
        takerAssetForRightOrder,
        ZeroAddress,
        makerAssetForRightOrder,
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
      expect(await ERC20Contract.balanceOf(maker)).to.be.equal(10000000000);
      expect(await ERC20Contract.balanceOf(taker)).to.be.equal(0);
      expect(await ERC20Contract2.balanceOf(maker)).to.be.equal(0);
      expect(await ERC20Contract2.balanceOf(taker)).to.be.equal(20000000000);

      await expect(
        ExchangeContractAsUser.matchOrders([
          {
            orderLeft,
            signatureLeft: makerSig,
            orderRight,
            signatureRight: takerSig,
          },
        ])
      ).to.be.revertedWith('rounding error');
    });

    it('should not execute match order with rightTake greater than leftMakerValue', async function () {
      const makerAssetForLeftOrder = await AssetERC20(
        ERC20Contract,
        10000000000
      );
      const takerAssetForLeftOrder = await AssetERC20(
        ERC20Contract2,
        30000000000
      );
      const takerAssetForRightOrder = await AssetERC20(
        ERC20Contract2,
        40000000000
      );
      const makerAssetForRightOrder = await AssetERC20(
        ERC20Contract,
        20000000000
      );

      orderLeft = await OrderDefault(
        maker,
        makerAssetForLeftOrder,
        ZeroAddress,
        takerAssetForLeftOrder,
        1,
        0,
        0
      );
      orderRight = await OrderDefault(
        taker,
        takerAssetForRightOrder,
        ZeroAddress,
        makerAssetForRightOrder,
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
      expect(await ERC20Contract.balanceOf(maker)).to.be.equal(10000000000);
      expect(await ERC20Contract.balanceOf(taker)).to.be.equal(0);
      expect(await ERC20Contract2.balanceOf(maker)).to.be.equal(0);
      expect(await ERC20Contract2.balanceOf(taker)).to.be.equal(20000000000);

      await expect(
        ExchangeContractAsUser.matchOrders([
          {
            orderLeft,
            signatureLeft: makerSig,
            orderRight,
            signatureRight: takerSig,
          },
        ])
      ).to.be.revertedWith('fillLeft: unable to fill');
    });

    it('should revert matchOrders on mismatched make asset types', async function () {
      await ERC721Contract.mint(maker.getAddress(), 1);
      await ERC721Contract.connect(maker).approve(
        await ExchangeContractAsUser.getAddress(),
        1
      );

      expect(await ERC721Contract.ownerOf(1)).to.be.equal(
        await maker.getAddress()
      );
      expect(await ERC20Contract2.balanceOf(taker.getAddress())).to.be.equal(
        20000000000
      );

      const makerAssetForLeftOrder = await AssetERC721(ERC721Contract, 1);
      const takerAssetForLeftOrder = await AssetERC20(
        ERC20Contract2,
        20000000000
      );
      const takerAssetForRightOrder = await AssetERC20(
        ERC20Contract2,
        10000000000
      );
      const makerAssetForRightOrder = await AssetERC1155(ERC1155Contract, 1, 5);
      orderLeft = await OrderDefault(
        maker,
        makerAssetForLeftOrder,
        ZeroAddress,
        takerAssetForLeftOrder,
        1,
        0,
        0
      );
      orderRight = await OrderDefault(
        taker,
        takerAssetForRightOrder,
        ZeroAddress,
        makerAssetForRightOrder,
        1,
        0,
        0
      );
      makerSig = await signOrder(orderLeft, maker, OrderValidatorAsAdmin);
      takerSig = await signOrder(orderRight, taker, OrderValidatorAsAdmin);

      await expect(
        ExchangeContractAsUser.matchOrders([
          {
            orderLeft,
            signatureLeft: makerSig,
            orderRight,
            signatureRight: takerSig,
          },
        ])
      ).to.be.revertedWith("assets don't match");
    });

    it('should revert matchOrders on mismatched take asset types', async function () {
      await ERC721Contract.mint(maker.getAddress(), 1);
      await ERC721Contract.connect(maker).approve(
        await ExchangeContractAsUser.getAddress(),
        1
      );

      expect(await ERC721Contract.ownerOf(1)).to.be.equal(
        await maker.getAddress()
      );
      expect(await ERC20Contract2.balanceOf(taker.getAddress())).to.be.equal(
        20000000000
      );

      const makerAssetForLeftOrder = await AssetERC721(ERC721Contract, 1);
      const takerAssetForLeftOrder = await AssetERC20(
        ERC20Contract2,
        20000000000
      );
      const takerAssetForRightOrder = await AssetERC1155(
        ERC1155Contract,
        1,
        50
      );
      const makerAssetForRightOrder = await AssetERC721(ERC721Contract, 1);
      orderLeft = await OrderDefault(
        maker,
        makerAssetForLeftOrder,
        ZeroAddress,
        takerAssetForLeftOrder,
        1,
        0,
        0
      );
      orderRight = await OrderDefault(
        taker,
        takerAssetForRightOrder,
        ZeroAddress,
        makerAssetForRightOrder,
        1,
        0,
        0
      );
      makerSig = await signOrder(orderLeft, maker, OrderValidatorAsAdmin);
      takerSig = await signOrder(orderRight, taker, OrderValidatorAsAdmin);

      await expect(
        ExchangeContractAsUser.matchOrders([
          {
            orderLeft,
            signatureLeft: makerSig,
            orderRight,
            signatureRight: takerSig,
          },
        ])
      ).to.be.revertedWith("assets don't match");
    });

    it('should revert matchAsset call if asset class is invalid', async function () {
      const leftAssetType = {
        assetClass: AssetClassType.INVALID_ASSET_CLASS,
        data: '0x1234',
      };

      const rightAssetType = {
        assetClass: AssetClassType.ERC721_ASSET_CLASS,
        data: '0x1234',
      };

      await expect(
        AssetMatcherAsUser.matchAssets(leftAssetType, rightAssetType)
      ).to.be.revertedWith('invalid left asset class');
      await expect(
        AssetMatcherAsUser.matchAssets(rightAssetType, leftAssetType)
      ).to.be.revertedWith('invalid right asset class');
    });

    it('should call return the expected AssetType', async function () {
      const leftAssetType = {
        assetClass: AssetClassType.ERC721_ASSET_CLASS,
        data: '0x1234',
      };

      const rightAssetType = {
        assetClass: AssetClassType.ERC721_ASSET_CLASS,
        data: '0x1234',
      };
      const result = await AssetMatcherAsUser.matchAssets(
        leftAssetType,
        rightAssetType
      );

      expect(result[0]).to.be.equal(leftAssetType.assetClass);
      expect(result[1]).to.be.equal(leftAssetType.data);
    });

    it('should revert when asset class does not match', async function () {
      const leftAssetType = {
        assetClass: AssetClassType.ERC721_ASSET_CLASS,
        data: '0x1234',
      };

      const rightAssetType = {
        assetClass: AssetClassType.ERC20_ASSET_CLASS,
        data: '0x1234',
      };

      await expect(
        AssetMatcherAsUser.matchAssets(leftAssetType, rightAssetType)
      ).to.revertedWith("assets don't match");
    });

    it('should revert when data does not match', async function () {
      const leftAssetType = {
        assetClass: AssetClassType.ERC721_ASSET_CLASS,
        data: '0x1234',
      };

      const rightAssetType = {
        assetClass: AssetClassType.ERC721_ASSET_CLASS,
        data: '0xFFFF',
      };

      await expect(
        AssetMatcherAsUser.matchAssets(leftAssetType, rightAssetType)
      ).to.revertedWith("assets don't match");
    });
  });
});
