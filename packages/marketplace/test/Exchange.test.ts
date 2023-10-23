import {expect} from 'chai';
import {deployFixtures} from './fixtures.ts';
import {loadFixture, mine} from '@nomicfoundation/hardhat-network-helpers';
import {AssetERC20, AssetERC721, AssetERC1155, Asset} from './utils/assets.ts';

import {
  hashKey,
  hashOrder,
  OrderDefault,
  signOrder,
  Order,
  isOrderEqual,
  UINT256_MAX_VALUE,
} from './utils/order.ts';
import {ZeroAddress, Contract, Signer} from 'ethers';
import {shouldMatchOrderForBatching} from './exchange/batching.behavior.ts';
import {shouldMatchOrders} from './exchange/matchOrders.behavior.ts';
import {shouldMatchOrdersWithRoyalty} from './exchange/matchOrdersWithRoyalty.behavior.ts';
import {shouldCheckForWhitelisting} from './exchange/whitelistingTokens.behavior.ts';

describe('Exchange.sol', function () {
  let ExchangeContractAsDeployer: Contract,
    ExchangeContractAsUser: Contract,
    ExchangeContractAsAdmin: Contract,
    OrderValidatorAsAdmin: Contract,
    RoyaltiesRegistryAsDeployer: Contract,
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
      ExchangeContractAsDeployer,
      ExchangeContractAsUser,
      ExchangeContractAsAdmin,
      OrderValidatorAsAdmin,
      RoyaltiesRegistryAsDeployer,
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
    
  it('shouldMatchOrders', async function () {
    await shouldMatchOrders().then();
  });

  it('shouldMatchOrdersWithRoyalty', async function () {
    await shouldMatchOrdersWithRoyalty().then();
  });

  it('shouldMatchOrderForWhitelistingToken', async function () {
    await shouldCheckForWhitelisting().then();
  });

  it('shouldMatchOrderForBatching', async function () {
    await shouldMatchOrderForBatching().then();
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

    it('should not cancel an order if Exchange Contract is paused', async function () {
      await ExchangeContractAsAdmin.grantRole(PAUSER_ROLE, user.getAddress());
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

  describe('comprehensive matchOrders test', function () {
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
        'ExchangeMatch cant be empty'
      );
    });

    it('should emit a Match event', async function () {
      expect(await ERC20Contract.balanceOf(maker)).to.be.equal(10000000000);
      expect(await ERC20Contract.balanceOf(taker)).to.be.equal(0);
      expect(await ERC20Contract2.balanceOf(maker)).to.be.equal(0);
      expect(await ERC20Contract2.balanceOf(taker)).to.be.equal(20000000000);

      const tx = await ExchangeContractAsUser.matchOrders([
        {
          orderLeft,
          signatureLeft: makerSig,
          orderRight,
          signatureRight: takerSig,
        },
      ]);

      function verifyOrderLeft(eventOrder: Order): boolean {
        return isOrderEqual(eventOrder, orderLeft);
      }

      function verifyOrderRight(eventOrder: Order): boolean {
        return isOrderEqual(eventOrder, orderRight);
      }

      await expect(tx)
        .to.emit(ExchangeContractAsUser, 'Match')
        .withArgs(
          await user.getAddress(),
          hashKey(orderLeft),
          hashKey(orderRight),
          verifyOrderLeft,
          verifyOrderRight,
          [10000000000, 20000000000],
          20000000000,
          10000000000
        );

      expect(await ERC20Contract.balanceOf(maker)).to.be.equal(0);
      expect(await ERC20Contract.balanceOf(taker)).to.be.equal(10000000000);
      expect(await ERC20Contract2.balanceOf(maker)).to.be.equal(20000000000);
      expect(await ERC20Contract2.balanceOf(taker)).to.be.equal(0);
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

    it('should execute complete match when left order taker is right order maker', async function () {
      // left order taker is right order maker
      orderLeft = await OrderDefault(
        maker,
        makerAsset,
        taker,
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

    it('should execute match order with rightTake less than leftMakerValue', async function () {
      const makerAssetForLeftOrder = await AssetERC20(
        ERC20Contract,
        10000000000
      );
      const takerAssetForLeftOrder = await AssetERC20(
        ERC20Contract2,
        20000000000
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
      ).to.be.equal(20000000000);
      expect(
        await ExchangeContractAsUser.fills(hashKey(orderRight))
      ).to.be.equal(10000000000);
      expect(await ERC20Contract.balanceOf(maker)).to.be.equal(0);
      expect(await ERC20Contract.balanceOf(taker)).to.be.equal(10000000000);
      expect(await ERC20Contract2.balanceOf(maker)).to.be.equal(20000000000);
      expect(await ERC20Contract2.balanceOf(taker)).to.be.equal(0);
    });

    it('should require the message sender to be the maker for a zero-salt left order', async function () {
      orderLeft = await OrderDefault(
        maker,
        makerAsset,
        ZeroAddress,
        takerAsset,
        0,
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

      expect(await ERC20Contract.balanceOf(maker)).to.be.equal(10000000000);
      expect(await ERC20Contract.balanceOf(taker)).to.be.equal(0);
      expect(await ERC20Contract2.balanceOf(maker)).to.be.equal(0);
      expect(await ERC20Contract2.balanceOf(taker)).to.be.equal(20000000000);

      await ExchangeContractAsUser.connect(maker).matchOrders([
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

    it('should require the message sender to be the maker for a zero-salt right order', async function () {
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
        0,
        0,
        0
      );

      makerSig = await signOrder(orderLeft, maker, OrderValidatorAsAdmin);
      takerSig = await signOrder(orderRight, taker, OrderValidatorAsAdmin);

      expect(await ERC20Contract.balanceOf(maker)).to.be.equal(10000000000);
      expect(await ERC20Contract.balanceOf(taker)).to.be.equal(0);
      expect(await ERC20Contract2.balanceOf(maker)).to.be.equal(0);
      expect(await ERC20Contract2.balanceOf(taker)).to.be.equal(20000000000);

      await ExchangeContractAsUser.connect(taker).matchOrders([
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
  });
});
