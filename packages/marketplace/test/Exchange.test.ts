import {expect} from 'chai';
import {deployFixtures} from './fixtures.ts';
import {loadFixture, mine} from '@nomicfoundation/hardhat-network-helpers';
import {
  AssetERC20,
  AssetERC721,
  AssetERC1155,
  FeeRecipientsData,
  LibPartData,
  Asset,
} from './utils/assets.ts';

import {
  getSymmetricOrder,
  hashKey,
  hashOrder,
  OrderDefault,
  signOrder,
  Order,
  isOrderEqual,
  UINT256_MAX_VALUE,
} from './utils/order.ts';
import {ZeroAddress, Contract, Signer} from 'ethers';

describe('Exchange.sol', function () {
  let ExchangeContractAsDeployer: Contract,
    ExchangeContractAsUser: Contract,
    ExchangeContractAsAdmin: Contract,
    OrderValidatorAsAdmin: Contract,
    RoyaltiesRegistryAsDeployer: Contract,
    ERC20Contract: Contract,
    ERC20Contract2: Contract,
    ERC721Contract: Contract,
    ERC721WithRoyalty: Contract,
    ERC721WithRoyaltyV2981: Contract,
    ERC721WithRoyaltyWithoutIROYALTYUGC: Contract,
    ERC1155Contract: Contract,
    RoyaltiesProvider: Contract,
    protocolFeePrimary: number,
    protocolFeeSecondary: number,
    defaultFeeReceiver: Signer,
    maker: Signer,
    taker: Signer,
    admin: Signer,
    user: Signer,
    deployer: Signer,
    makerAsset: Asset,
    takerAsset: Asset,
    orderLeft: Order,
    orderRight: Order,
    makerSig: string,
    takerSig: string,
    EXCHANGE_ADMIN_ROLE: string,
    PAUSER_ROLE: string,
    ERC1776_OPERATOR_ROLE: string;

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
      ERC721WithRoyalty,
      ERC721WithRoyaltyV2981,
      ERC721WithRoyaltyWithoutIROYALTYUGC,
      ERC1155Contract,
      protocolFeePrimary,
      protocolFeeSecondary,
      defaultFeeReceiver,
      RoyaltiesProvider,
      user1: maker,
      user2: taker,
      admin,
      user,
      deployer,
      EXCHANGE_ADMIN_ROLE,
      PAUSER_ROLE,
      ERC1776_OPERATOR_ROLE,
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

  describe('mixed matchorder test', function () {
    beforeEach(async function () {
      await ERC20Contract.mint(maker.getAddress(), 123000000);
      await ERC20Contract.connect(maker).approve(
        await ExchangeContractAsUser.getAddress(),
        123000000
      );

      await ERC20Contract2.mint(taker.getAddress(), 456000000);
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
          [123000000, 456000000],
          456000000,
          123000000
        );

      expect(await ERC20Contract.balanceOf(maker)).to.be.equal(0);
      expect(await ERC20Contract.balanceOf(taker)).to.be.equal(123000000);
      expect(await ERC20Contract2.balanceOf(maker)).to.be.equal(456000000);
      expect(await ERC20Contract2.balanceOf(taker)).to.be.equal(0);
    });

    it('should revert for matching a cancelled order', async function () {
      await ERC721Contract.mint(maker.getAddress(), 1);
      await ERC721Contract.connect(maker).approve(
        await ExchangeContractAsUser.getAddress(),
        1
      );
      await ERC20Contract.mint(taker.getAddress(), 100);
      await ERC20Contract.connect(taker).approve(
        await ExchangeContractAsUser.getAddress(),
        100
      );

      expect(await ERC721Contract.ownerOf(1)).to.be.equal(
        await maker.getAddress()
      );
      expect(await ERC20Contract.balanceOf(taker.getAddress())).to.be.equal(
        100
      );
      const makerAsset = await AssetERC721(ERC721Contract, 1);
      const takerAsset = await AssetERC20(ERC20Contract, 100);
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
      await ExchangeContractAsUser.matchOrders([
        {
          orderLeft,
          signatureLeft: makerSig,
          orderRight,
          signatureRight: takerSig,
        },
      ]);

      expect(await ERC20Contract.balanceOf(maker)).to.be.equal(0);
      expect(await ERC20Contract.balanceOf(taker)).to.be.equal(123000000);
      expect(await ERC20Contract2.balanceOf(maker)).to.be.equal(456000000);
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
      await ExchangeContractAsUser.matchOrders([
        {
          orderLeft,
          signatureLeft: makerSig,
          orderRight,
          signatureRight: takerSig,
        },
      ]);

      expect(await ERC20Contract.balanceOf(maker)).to.be.equal(0);
      expect(await ERC20Contract.balanceOf(taker)).to.be.equal(123000000);
      expect(await ERC20Contract2.balanceOf(maker)).to.be.equal(456000000);
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
      await ExchangeContractAsUser.matchOrders([
        {
          orderLeft,
          signatureLeft: makerSig,
          orderRight,
          signatureRight: takerSig,
        },
      ]);

      expect(await ERC20Contract.balanceOf(maker)).to.be.equal(0);
      expect(await ERC20Contract.balanceOf(taker)).to.be.equal(123000000);
      expect(await ERC20Contract2.balanceOf(maker)).to.be.equal(456000000);
      expect(await ERC20Contract2.balanceOf(taker)).to.be.equal(0);
    });
  });

  it('should not execute match order with makerValue greater than rightMakeValue', async function () {
    await ERC20Contract.mint(maker.getAddress(), 100);
    await ERC20Contract.connect(maker).approve(
      await ExchangeContractAsUser.getAddress(),
      100
    );

    await ERC20Contract2.mint(taker.getAddress(), 200);
    await ERC20Contract2.connect(taker).approve(
      await ExchangeContractAsUser.getAddress(),
      200
    );

    expect(await ERC20Contract.balanceOf(maker)).to.be.equal(100);
    expect(await ERC20Contract.balanceOf(taker)).to.be.equal(0);
    expect(await ERC20Contract2.balanceOf(maker)).to.be.equal(0);
    expect(await ERC20Contract2.balanceOf(taker)).to.be.equal(200);

    const makerAssetForLeftOrder = await AssetERC20(ERC20Contract, 200);
    const takerAssetForLeftOrder = await AssetERC20(ERC20Contract2, 400);
    const takerAssetForRightOrder = await AssetERC20(ERC20Contract2, 100);
    const makerAssetForRightOrder = await AssetERC20(ERC20Contract, 100);

    const orderLeft = await OrderDefault(
      maker,
      makerAssetForLeftOrder,
      ZeroAddress,
      takerAssetForLeftOrder,
      1,
      0,
      0
    );
    const orderRight = await OrderDefault(
      taker,
      takerAssetForRightOrder,
      ZeroAddress,
      makerAssetForRightOrder,
      1,
      0,
      0
    );

    const makerSig = await signOrder(orderLeft, maker, OrderValidatorAsAdmin);
    const takerSig = await signOrder(orderRight, taker, OrderValidatorAsAdmin);
    expect(await ExchangeContractAsUser.fills(hashKey(orderLeft))).to.be.equal(
      0
    );
    expect(await ExchangeContractAsUser.fills(hashKey(orderRight))).to.be.equal(
      0
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
    ).to.be.revertedWith('fillRight: unable to fill');
  });

  it('should not execute match order with zero make value', async function () {
    await ERC20Contract.mint(maker.getAddress(), 100);
    await ERC20Contract.connect(maker).approve(
      await ExchangeContractAsUser.getAddress(),
      100
    );

    await ERC20Contract2.mint(taker.getAddress(), 200);
    await ERC20Contract2.connect(taker).approve(
      await ExchangeContractAsUser.getAddress(),
      200
    );

    expect(await ERC20Contract.balanceOf(maker)).to.be.equal(100);
    expect(await ERC20Contract.balanceOf(taker)).to.be.equal(0);
    expect(await ERC20Contract2.balanceOf(maker)).to.be.equal(0);
    expect(await ERC20Contract2.balanceOf(taker)).to.be.equal(200);

    const makerAssetForLeftOrder = await AssetERC20(ERC20Contract, 100);
    const takerAssetForLeftOrder = await AssetERC20(ERC20Contract2, 300);
    const takerAssetForRightOrder = await AssetERC20(ERC20Contract2, 400);
    const makerAssetForRightOrder = await AssetERC20(ERC20Contract, 0);

    const orderLeft = await OrderDefault(
      maker,
      makerAssetForLeftOrder,
      ZeroAddress,
      takerAssetForLeftOrder,
      1,
      0,
      0
    );
    const orderRight = await OrderDefault(
      taker,
      takerAssetForRightOrder,
      ZeroAddress,
      makerAssetForRightOrder,
      1,
      0,
      0
    );

    const makerSig = await signOrder(orderLeft, maker, OrderValidatorAsAdmin);
    const takerSig = await signOrder(orderRight, taker, OrderValidatorAsAdmin);
    expect(await ExchangeContractAsUser.fills(hashKey(orderLeft))).to.be.equal(
      0
    );
    expect(await ExchangeContractAsUser.fills(hashKey(orderRight))).to.be.equal(
      0
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
    ).to.be.revertedWith('division by zero');
  });

  it('should not execute match order with significant rounding error', async function () {
    await ERC20Contract.mint(maker.getAddress(), 100);
    await ERC20Contract.connect(maker).approve(
      await ExchangeContractAsUser.getAddress(),
      100
    );

    await ERC20Contract2.mint(taker.getAddress(), 200);
    await ERC20Contract2.connect(taker).approve(
      await ExchangeContractAsUser.getAddress(),
      200
    );

    expect(await ERC20Contract.balanceOf(maker)).to.be.equal(100);
    expect(await ERC20Contract.balanceOf(taker)).to.be.equal(0);
    expect(await ERC20Contract2.balanceOf(maker)).to.be.equal(0);
    expect(await ERC20Contract2.balanceOf(taker)).to.be.equal(200);

    const makerAssetForLeftOrder = await AssetERC20(ERC20Contract, 100);
    const takerAssetForLeftOrder = await AssetERC20(ERC20Contract2, 100);
    const takerAssetForRightOrder = await AssetERC20(ERC20Contract2, 1000);
    const makerAssetForRightOrder = await AssetERC20(ERC20Contract, 999);

    const orderLeft = await OrderDefault(
      maker,
      makerAssetForLeftOrder,
      ZeroAddress,
      takerAssetForLeftOrder,
      1,
      0,
      0
    );
    const orderRight = await OrderDefault(
      taker,
      takerAssetForRightOrder,
      ZeroAddress,
      makerAssetForRightOrder,
      1,
      0,
      0
    );

    const makerSig = await signOrder(orderLeft, maker, OrderValidatorAsAdmin);
    const takerSig = await signOrder(orderRight, taker, OrderValidatorAsAdmin);
    expect(await ExchangeContractAsUser.fills(hashKey(orderLeft))).to.be.equal(
      0
    );
    expect(await ExchangeContractAsUser.fills(hashKey(orderRight))).to.be.equal(
      0
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
    ).to.be.revertedWith('rounding error');
  });

  it('should not execute match order with rightTake greater than leftMakerValue', async function () {
    await ERC20Contract.mint(maker.getAddress(), 100);
    await ERC20Contract.connect(maker).approve(
      await ExchangeContractAsUser.getAddress(),
      100
    );

    await ERC20Contract2.mint(taker.getAddress(), 200);
    await ERC20Contract2.connect(taker).approve(
      await ExchangeContractAsUser.getAddress(),
      200
    );

    expect(await ERC20Contract.balanceOf(maker)).to.be.equal(100);
    expect(await ERC20Contract.balanceOf(taker)).to.be.equal(0);
    expect(await ERC20Contract2.balanceOf(maker)).to.be.equal(0);
    expect(await ERC20Contract2.balanceOf(taker)).to.be.equal(200);

    const makerAssetForLeftOrder = await AssetERC20(ERC20Contract, 100);
    const takerAssetForLeftOrder = await AssetERC20(ERC20Contract2, 300);
    const takerAssetForRightOrder = await AssetERC20(ERC20Contract2, 400);
    const makerAssetForRightOrder = await AssetERC20(ERC20Contract, 200);

    const orderLeft = await OrderDefault(
      maker,
      makerAssetForLeftOrder,
      ZeroAddress,
      takerAssetForLeftOrder,
      1,
      0,
      0
    );
    const orderRight = await OrderDefault(
      taker,
      takerAssetForRightOrder,
      ZeroAddress,
      makerAssetForRightOrder,
      1,
      0,
      0
    );

    const makerSig = await signOrder(orderLeft, maker, OrderValidatorAsAdmin);
    const takerSig = await signOrder(orderRight, taker, OrderValidatorAsAdmin);
    expect(await ExchangeContractAsUser.fills(hashKey(orderLeft))).to.be.equal(
      0
    );
    expect(await ExchangeContractAsUser.fills(hashKey(orderRight))).to.be.equal(
      0
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
    ).to.be.revertedWith('fillLeft: unable to fill');
  });

  it('should execute match order with rightTake less than leftMakerValue', async function () {
    await ERC20Contract.mint(maker.getAddress(), 100);
    await ERC20Contract.connect(maker).approve(
      await ExchangeContractAsUser.getAddress(),
      100
    );

    await ERC20Contract2.mint(taker.getAddress(), 200);
    await ERC20Contract2.connect(taker).approve(
      await ExchangeContractAsUser.getAddress(),
      200
    );

    expect(await ERC20Contract.balanceOf(maker)).to.be.equal(100);
    expect(await ERC20Contract.balanceOf(taker)).to.be.equal(0);
    expect(await ERC20Contract2.balanceOf(maker)).to.be.equal(0);
    expect(await ERC20Contract2.balanceOf(taker)).to.be.equal(200);

    const makerAssetForLeftOrder = await AssetERC20(ERC20Contract, 100);
    const takerAssetForLeftOrder = await AssetERC20(ERC20Contract2, 200);
    const takerAssetForRightOrder = await AssetERC20(ERC20Contract2, 400);
    const makerAssetForRightOrder = await AssetERC20(ERC20Contract, 200);

    const orderLeft = await OrderDefault(
      maker,
      makerAssetForLeftOrder,
      ZeroAddress,
      takerAssetForLeftOrder,
      1,
      0,
      0
    );
    const orderRight = await OrderDefault(
      taker,
      takerAssetForRightOrder,
      ZeroAddress,
      makerAssetForRightOrder,
      1,
      0,
      0
    );

    const makerSig = await signOrder(orderLeft, maker, OrderValidatorAsAdmin);
    const takerSig = await signOrder(orderRight, taker, OrderValidatorAsAdmin);
    expect(await ExchangeContractAsUser.fills(hashKey(orderLeft))).to.be.equal(
      0
    );
    expect(await ExchangeContractAsUser.fills(hashKey(orderRight))).to.be.equal(
      0
    );
    await ExchangeContractAsUser.matchOrders([
      {
        orderLeft,
        signatureLeft: makerSig,
        orderRight,
        signatureRight: takerSig,
      },
    ]);
    expect(await ExchangeContractAsUser.fills(hashKey(orderLeft))).to.be.equal(
      200
    );
    expect(await ExchangeContractAsUser.fills(hashKey(orderRight))).to.be.equal(
      100
    );
    expect(await ERC20Contract.balanceOf(maker)).to.be.equal(0);
    expect(await ERC20Contract.balanceOf(taker)).to.be.equal(100);
    expect(await ERC20Contract2.balanceOf(maker)).to.be.equal(200);
    expect(await ERC20Contract2.balanceOf(taker)).to.be.equal(0);
  });

  it('should require the message sender to be the maker for a zero-salt left order', async function () {
    await ERC20Contract.mint(maker.getAddress(), 200);
    await ERC20Contract.connect(maker).approve(
      await ExchangeContractAsUser.getAddress(),
      200
    );

    await ERC20Contract2.mint(taker.getAddress(), 100);
    await ERC20Contract2.connect(taker).approve(
      await ExchangeContractAsUser.getAddress(),
      100
    );

    expect(await ERC20Contract.balanceOf(maker)).to.be.equal(200);
    expect(await ERC20Contract.balanceOf(taker)).to.be.equal(0);
    expect(await ERC20Contract2.balanceOf(maker)).to.be.equal(0);
    expect(await ERC20Contract2.balanceOf(taker)).to.be.equal(100);

    const makerAsset = await AssetERC20(ERC20Contract, 200);
    const takerAsset = await AssetERC20(ERC20Contract2, 100);
    const orderLeft = await OrderDefault(
      maker,
      makerAsset,
      ZeroAddress,
      takerAsset,
      0,
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
    const takerSig = await signOrder(orderRight, taker, OrderValidatorAsAdmin);
    await ExchangeContractAsUser.connect(maker).matchOrders([
      {
        orderLeft,
        signatureLeft: makerSig,
        orderRight,
        signatureRight: takerSig,
      },
    ]);

    expect(await ERC20Contract.balanceOf(maker)).to.be.equal(0);
    expect(await ERC20Contract.balanceOf(taker)).to.be.equal(200);
    expect(await ERC20Contract2.balanceOf(maker)).to.be.equal(100);
    expect(await ERC20Contract2.balanceOf(taker)).to.be.equal(0);
  });

  it('should require the message sender to be the maker for a zero-salt right order', async function () {
    await ERC20Contract.mint(maker.getAddress(), 200);
    await ERC20Contract.connect(maker).approve(
      await ExchangeContractAsUser.getAddress(),
      200
    );

    await ERC20Contract2.mint(taker.getAddress(), 100);
    await ERC20Contract2.connect(taker).approve(
      await ExchangeContractAsUser.getAddress(),
      100
    );

    expect(await ERC20Contract.balanceOf(maker)).to.be.equal(200);
    expect(await ERC20Contract.balanceOf(taker)).to.be.equal(0);
    expect(await ERC20Contract2.balanceOf(maker)).to.be.equal(0);
    expect(await ERC20Contract2.balanceOf(taker)).to.be.equal(100);

    const makerAsset = await AssetERC20(ERC20Contract, 200);
    const takerAsset = await AssetERC20(ERC20Contract2, 100);
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
      0,
      0,
      0
    );

    const makerSig = await signOrder(orderLeft, maker, OrderValidatorAsAdmin);
    const takerSig = await signOrder(orderRight, taker, OrderValidatorAsAdmin);
    await ExchangeContractAsUser.connect(taker).matchOrders([
      {
        orderLeft,
        signatureLeft: makerSig,
        orderRight,
        signatureRight: takerSig,
      },
    ]);

    expect(await ERC20Contract.balanceOf(maker)).to.be.equal(0);
    expect(await ERC20Contract.balanceOf(taker)).to.be.equal(200);
    expect(await ERC20Contract2.balanceOf(maker)).to.be.equal(100);
    expect(await ERC20Contract2.balanceOf(taker)).to.be.equal(0);
  });

  it('should revert matchOrders on mismatched make asset types', async function () {
    await ERC721Contract.mint(maker.getAddress(), 1);
    await ERC721Contract.connect(maker).approve(
      await ExchangeContractAsUser.getAddress(),
      1
    );
    await ERC20Contract.mint(taker.getAddress(), 100);
    await ERC20Contract.connect(taker).approve(
      await ExchangeContractAsUser.getAddress(),
      100
    );

    expect(await ERC721Contract.ownerOf(1)).to.be.equal(
      await maker.getAddress()
    );
    expect(await ERC20Contract.balanceOf(taker.getAddress())).to.be.equal(100);

    const makerAssetForLeftOrder = await AssetERC721(ERC721Contract, 1);
    const takerAssetForLeftOrder = await AssetERC20(ERC20Contract, 100);
    const takerAssetForRightOrder = await AssetERC20(ERC20Contract, 50);
    const makerAssetForRightOrder = await AssetERC1155(ERC1155Contract, 1, 5);
    const orderLeft = await OrderDefault(
      maker,
      makerAssetForLeftOrder,
      ZeroAddress,
      takerAssetForLeftOrder,
      1,
      0,
      0
    );
    const orderRight = await OrderDefault(
      taker,
      takerAssetForRightOrder,
      ZeroAddress,
      makerAssetForRightOrder,
      1,
      0,
      0
    );
    const makerSig = await signOrder(orderLeft, maker, OrderValidatorAsAdmin);
    const takerSig = await signOrder(orderRight, taker, OrderValidatorAsAdmin);

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
    await ERC20Contract.mint(taker.getAddress(), 100);
    await ERC20Contract.connect(taker).approve(
      await ExchangeContractAsUser.getAddress(),
      100
    );

    expect(await ERC721Contract.ownerOf(1)).to.be.equal(
      await maker.getAddress()
    );
    expect(await ERC20Contract.balanceOf(taker.getAddress())).to.be.equal(100);

    const makerAssetForLeftOrder = await AssetERC721(ERC721Contract, 1);
    const takerAssetForLeftOrder = await AssetERC20(ERC20Contract, 100);
    const takerAssetForRightOrder = await AssetERC1155(ERC1155Contract, 1, 50);
    const makerAssetForRightOrder = await AssetERC721(ERC721Contract, 1);
    const orderLeft = await OrderDefault(
      maker,
      makerAssetForLeftOrder,
      ZeroAddress,
      takerAssetForLeftOrder,
      1,
      0,
      0
    );
    const orderRight = await OrderDefault(
      taker,
      takerAssetForRightOrder,
      ZeroAddress,
      makerAssetForRightOrder,
      1,
      0,
      0
    );
    const makerSig = await signOrder(orderLeft, maker, OrderValidatorAsAdmin);
    const takerSig = await signOrder(orderRight, taker, OrderValidatorAsAdmin);

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

  describe('matchOrderFrom', function () {
    beforeEach(async function () {
      await ERC20Contract.mint(maker.getAddress(), 123000000);
      await ERC20Contract.connect(maker).approve(
        await ExchangeContractAsUser.getAddress(),
        123000000
      );

      await ERC20Contract2.mint(taker.getAddress(), 456000000);
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

    it('should not execute matchOrdersFrom if Exchange Contract is paused', async function () {
      await ExchangeContractAsAdmin.grantRole(PAUSER_ROLE, user.getAddress());
      await ExchangeContractAsAdmin.connect(user).pause();
      expect(await ExchangeContractAsAdmin.paused()).to.be.true;

      await ExchangeContractAsAdmin.grantRole(
        ERC1776_OPERATOR_ROLE,
        maker.getAddress()
      );

      expect(
        await ExchangeContractAsUser.hasRole(
          ERC1776_OPERATOR_ROLE,
          maker.getAddress()
        )
      ).to.be.equal(true);

      await expect(
        ExchangeContractAsUser.connect(maker).matchOrdersFrom(
          maker.getAddress(),
          [
            {
              orderLeft,
              signatureLeft: makerSig,
              orderRight,
              signatureRight: takerSig,
            },
          ]
        )
      ).to.be.revertedWith('Pausable: paused');
    });

    it('should not execute matchOrdersFrom if caller do not have ERC1776 operator role', async function () {
      await expect(
        ExchangeContractAsUser.matchOrdersFrom(maker.getAddress(), [
          {
            orderLeft,
            signatureLeft: makerSig,
            orderRight,
            signatureRight: takerSig,
          },
        ])
      ).to.be.revertedWith(
        `AccessControl: account ${(
          await user.getAddress()
        ).toLowerCase()} is missing role ${ERC1776_OPERATOR_ROLE}`
      );
    });

    it('should not execute matchOrdersFrom if sender is zero address', async function () {
      await ExchangeContractAsAdmin.grantRole(
        ERC1776_OPERATOR_ROLE,
        maker.getAddress()
      );

      expect(
        await ExchangeContractAsUser.hasRole(
          ERC1776_OPERATOR_ROLE,
          maker.getAddress()
        )
      ).to.be.equal(true);

      await expect(
        ExchangeContractAsUser.connect(maker).matchOrdersFrom(ZeroAddress, [
          {
            orderLeft,
            signatureLeft: makerSig,
            orderRight,
            signatureRight: takerSig,
          },
        ])
      ).to.be.revertedWith('invalid sender');
    });

    it('should execute matchOrdersFrom', async function () {
      await ExchangeContractAsAdmin.grantRole(
        ERC1776_OPERATOR_ROLE,
        maker.getAddress()
      );

      expect(
        await ExchangeContractAsUser.hasRole(
          ERC1776_OPERATOR_ROLE,
          maker.getAddress()
        )
      ).to.be.equal(true);

      await ExchangeContractAsUser.connect(maker).matchOrdersFrom(
        maker.getAddress(),
        [
          {
            orderLeft,
            signatureLeft: makerSig,
            orderRight,
            signatureRight: takerSig,
          },
        ]
      );

      expect(await ERC20Contract.balanceOf(maker)).to.be.equal(0);
      expect(await ERC20Contract.balanceOf(taker)).to.be.equal(123000000);
      expect(await ERC20Contract2.balanceOf(maker)).to.be.equal(456000000);
      expect(await ERC20Contract2.balanceOf(taker)).to.be.equal(0);
    });
  });

  describe('matchOrders with royalties', function () {
    it('should execute a complete match order between ERC721 and ERC20 tokens in primary market', async function () {
      const {
        deployer: maker, // making deployer the maker to sell in primary market
      } = await loadFixture(deployFixtures);

      await ERC721WithRoyaltyV2981.mint(maker.getAddress(), 1, [
        await FeeRecipientsData(maker.getAddress(), 10000),
      ]);

      await ERC721WithRoyaltyV2981.connect(maker).approve(
        await ExchangeContractAsUser.getAddress(),
        1
      );
      await ERC20Contract.mint(taker.getAddress(), 100000000000);
      await ERC20Contract.connect(taker).approve(
        await ExchangeContractAsUser.getAddress(),
        100000000000
      );

      expect(await ERC721WithRoyaltyV2981.ownerOf(1)).to.be.equal(
        await maker.getAddress()
      );
      expect(await ERC20Contract.balanceOf(taker.getAddress())).to.be.equal(
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
      ).to.be.equal(100000000000);
      expect(
        await ExchangeContractAsUser.fills(hashKey(orderRight))
      ).to.be.equal(1);
      expect(await ERC721WithRoyaltyV2981.ownerOf(1)).to.be.equal(
        await taker.getAddress()
      );
      expect(await ERC20Contract.balanceOf(maker.getAddress())).to.be.equal(
        98770000000
      );

      // check primary market protocol fee
      expect(
        await ERC20Contract.balanceOf(defaultFeeReceiver.getAddress())
      ).to.be.equal(1230000000); // 123 * 100000000000 / 10000 = 1230000000
    });

    it('should not execute match order when royalties exceed 50%', async function () {
      const {deployer: creator} = await loadFixture(deployFixtures);

      // set royalty greater than 50%
      await ERC721WithRoyaltyV2981.setRoyalties(1000000);

      await ERC721WithRoyaltyV2981.mint(creator.getAddress(), 1, [
        await FeeRecipientsData(creator.getAddress(), 10000),
      ]);
      await ERC721WithRoyaltyV2981.connect(creator).transferFrom(
        creator.getAddress(),
        maker.getAddress(),
        1
      );
      await ERC721WithRoyaltyV2981.connect(maker).approve(
        await ExchangeContractAsUser.getAddress(),
        1
      );
      await ERC20Contract.mint(taker.getAddress(), 1000);
      await ERC20Contract.connect(taker).approve(
        await ExchangeContractAsUser.getAddress(),
        1000
      );

      expect(await ERC721WithRoyaltyV2981.ownerOf(1)).to.be.equal(
        await maker.getAddress()
      );
      expect(await ERC20Contract.balanceOf(taker.getAddress())).to.be.equal(
        1000
      );
      const makerAsset = await AssetERC721(ERC721WithRoyaltyV2981, 1);
      const takerAsset = await AssetERC20(ERC20Contract, 1000);
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

      await expect(
        ExchangeContractAsUser.matchOrders([
          {
            orderLeft,
            signatureLeft: makerSig,
            orderRight,
            signatureRight: takerSig,
          },
        ])
      ).to.be.revertedWith('Royalties are too high (>50%)');
    });

    it('should not execute match orders when royalties exceed 50% for token without IROYALTYUGC support', async function () {
      // set royalty greater than 50%
      await ERC721WithRoyaltyWithoutIROYALTYUGC.setRoyalties(1000000);

      await ERC721WithRoyaltyWithoutIROYALTYUGC.mint(maker.getAddress(), 1, [
        await FeeRecipientsData(maker.getAddress(), 10000),
      ]);

      await ERC721WithRoyaltyWithoutIROYALTYUGC.connect(maker).approve(
        await ExchangeContractAsUser.getAddress(),
        1
      );
      await ERC20Contract.mint(taker.getAddress(), 1000);
      await ERC20Contract.connect(taker).approve(
        await ExchangeContractAsUser.getAddress(),
        1000
      );

      expect(await ERC721WithRoyaltyWithoutIROYALTYUGC.ownerOf(1)).to.be.equal(
        await maker.getAddress()
      );
      expect(await ERC20Contract.balanceOf(taker.getAddress())).to.be.equal(
        1000
      );
      const makerAsset = await AssetERC721(
        ERC721WithRoyaltyWithoutIROYALTYUGC,
        1
      );
      const takerAsset = await AssetERC20(ERC20Contract, 1000);
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

      await expect(
        ExchangeContractAsUser.matchOrders([
          {
            orderLeft,
            signatureLeft: makerSig,
            orderRight,
            signatureRight: takerSig,
          },
        ])
      ).to.be.revertedWith('Royalties are too high (>50%)');
    });

    it('should not execute match orders when royalties exceed 50% for token without IROYALTYUGC and royalty.length != 1', async function () {
      const {admin: receiver1, user: receiver2} = await loadFixture(
        deployFixtures
      );

      // set royalty greater than 50%
      await ERC721WithRoyaltyWithoutIROYALTYUGC.setRoyalties(1000000);

      await ERC721WithRoyaltyWithoutIROYALTYUGC.mint(maker.getAddress(), 1, [
        await FeeRecipientsData(receiver1.getAddress(), 3000),
        await FeeRecipientsData(receiver2.getAddress(), 7000),
      ]);

      await ERC721WithRoyaltyWithoutIROYALTYUGC.connect(maker).approve(
        await ExchangeContractAsUser.getAddress(),
        1
      );
      await ERC20Contract.mint(taker.getAddress(), 1000);
      await ERC20Contract.connect(taker).approve(
        await ExchangeContractAsUser.getAddress(),
        1000
      );

      expect(await ERC721WithRoyaltyWithoutIROYALTYUGC.ownerOf(1)).to.be.equal(
        await maker.getAddress()
      );
      expect(await ERC20Contract.balanceOf(taker.getAddress())).to.be.equal(
        1000
      );
      const makerAsset = await AssetERC721(
        ERC721WithRoyaltyWithoutIROYALTYUGC,
        1
      );
      const takerAsset = await AssetERC20(ERC20Contract, 1000);
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

      await expect(
        ExchangeContractAsUser.matchOrders([
          {
            orderLeft,
            signatureLeft: makerSig,
            orderRight,
            signatureRight: takerSig,
          },
        ])
      ).to.be.revertedWith('Royalties are too high (>50%)');
    });

    it('should execute match orders for token without IROYALTYUGC support', async function () {
      await ERC721WithRoyaltyWithoutIROYALTYUGC.mint(maker.getAddress(), 1, [
        await FeeRecipientsData(maker.getAddress(), 10000),
      ]);

      await ERC721WithRoyaltyWithoutIROYALTYUGC.connect(maker).approve(
        await ExchangeContractAsUser.getAddress(),
        1
      );
      await ERC20Contract.mint(taker.getAddress(), 100000000000);
      await ERC20Contract.connect(taker).approve(
        await ExchangeContractAsUser.getAddress(),
        100000000000
      );

      expect(await ERC721WithRoyaltyWithoutIROYALTYUGC.ownerOf(1)).to.be.equal(
        await maker.getAddress()
      );
      expect(await ERC20Contract.balanceOf(taker.getAddress())).to.be.equal(
        100000000000
      );
      const makerAsset = await AssetERC721(
        ERC721WithRoyaltyWithoutIROYALTYUGC,
        1
      );
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
      ).to.be.equal(100000000000);
      expect(
        await ExchangeContractAsUser.fills(hashKey(orderRight))
      ).to.be.equal(1);
      expect(await ERC721WithRoyaltyWithoutIROYALTYUGC.ownerOf(1)).to.be.equal(
        await taker.getAddress()
      );
      expect(await ERC20Contract.balanceOf(maker.getAddress())).to.be.equal(
        97500000000
      );

      // check protocol fee
      expect(
        await ERC20Contract.balanceOf(defaultFeeReceiver.getAddress())
      ).to.be.equal(2500000000); // 250 * 10000000000 / 10000 = 2500000000
    });

    it('should execute a complete match order with external royalties provider(type 1)', async function () {
      const {deployer: royaltyReceiver} = await loadFixture(deployFixtures);

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

      await ERC20Contract.mint(taker.getAddress(), 100000000000);
      await ERC20Contract.connect(taker).approve(
        await ExchangeContractAsUser.getAddress(),
        100000000000
      );

      expect(await ERC721Contract.ownerOf(1)).to.be.equal(
        await maker.getAddress()
      );
      expect(await ERC20Contract.balanceOf(taker.getAddress())).to.be.equal(
        100000000000
      );
      const makerAsset = await AssetERC721(ERC721Contract, 1);
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
      ).to.be.equal(100000000000);
      expect(
        await ExchangeContractAsUser.fills(hashKey(orderRight))
      ).to.be.equal(1);
      expect(await ERC721Contract.ownerOf(1)).to.be.equal(
        await taker.getAddress()
      );

      // check protocol fee
      expect(
        await ERC20Contract.balanceOf(defaultFeeReceiver.getAddress())
      ).to.be.equal(2500000000); // 250 * 10000000000 / 10000 = 2500000000

      // check paid royalty
      expect(
        await ERC20Contract.balanceOf(royaltyReceiver.getAddress())
      ).to.be.equal(20000000000); // 20% of the amount

      expect(await ERC20Contract.balanceOf(maker.getAddress())).to.be.equal(
        77500000000 // 100000000000 - royalty - protocolFee
      );
    });

    it('should execute a complete match order with external royalties provider(type 2)', async function () {
      const {deployer: royaltyReceiver} = await loadFixture(deployFixtures);

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

      await ERC20Contract.mint(taker.getAddress(), 100000000000);
      await ERC20Contract.connect(taker).approve(
        await ExchangeContractAsUser.getAddress(),
        100000000000
      );

      expect(await ERC721Contract.ownerOf(1)).to.be.equal(
        await maker.getAddress()
      );
      expect(await ERC20Contract.balanceOf(taker.getAddress())).to.be.equal(
        100000000000
      );
      const makerAsset = await AssetERC721(ERC721Contract, 1);
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
      ).to.be.equal(100000000000);
      expect(
        await ExchangeContractAsUser.fills(hashKey(orderRight))
      ).to.be.equal(1);
      expect(await ERC721Contract.ownerOf(1)).to.be.equal(
        await taker.getAddress()
      );

      // check protocol fee
      expect(
        await ERC20Contract.balanceOf(defaultFeeReceiver.getAddress())
      ).to.be.equal(2500000000); // 250 * 10000000000 / 10000 = 2500000000

      // check paid royalty
      expect(
        await ERC20Contract.balanceOf(royaltyReceiver.getAddress())
      ).to.be.equal(10000000000); // 10% of the amount

      expect(await ERC20Contract.balanceOf(maker.getAddress())).to.be.equal(
        87500000000 // 100000000000 - royalty - protocolFee
      );
    });

    it('should execute a complete match order with royalties 2981(type 3) transferred to royaltyReceiver', async function () {
      const {
        deployer: royaltyReceiver,

        admin: receiver1,
        user: receiver2,
      } = await loadFixture(deployFixtures);

      // set royalty
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

      await ERC20Contract.mint(taker.getAddress(), 100000000000);
      await ERC20Contract.connect(taker).approve(
        await ExchangeContractAsUser.getAddress(),
        100000000000
      );

      expect(await ERC721WithRoyalty.ownerOf(1)).to.be.equal(
        await maker.getAddress()
      );
      expect(await ERC20Contract.balanceOf(taker.getAddress())).to.be.equal(
        100000000000
      );
      const makerAsset = await AssetERC721(ERC721WithRoyalty, 1);
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
      ).to.be.equal(100000000000);
      expect(
        await ExchangeContractAsUser.fills(hashKey(orderRight))
      ).to.be.equal(1);
      expect(await ERC721WithRoyalty.ownerOf(1)).to.be.equal(
        await taker.getAddress()
      );

      // check primary market protocol fee
      expect(
        await ERC20Contract.balanceOf(defaultFeeReceiver.getAddress())
      ).to.be.equal(2500000000); // 250 * 100000000000 / 10000 = 2500000000

      expect(await ERC20Contract.balanceOf(receiver1.getAddress())).to.be.equal(
        0
      );

      expect(await ERC20Contract.balanceOf(receiver2.getAddress())).to.be.equal(
        0
      );

      expect(
        await ERC20Contract.balanceOf(royaltyReceiver.getAddress())
      ).to.be.equal(
        50000000000 // 5000 * 100000000000 / 10000 = 50000000000
      );

      expect(await ERC20Contract.balanceOf(maker.getAddress())).to.be.equal(
        47500000000 // 100000000000 - royalty - protocolFee
      );
    });

    it('should execute a complete match order with royalties 2981(type 3) transferred to fee recipients', async function () {
      const {
        deployer: royaltyReceiver,

        admin: receiver1,
        user: receiver2,
      } = await loadFixture(deployFixtures);

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

      await ERC20Contract.mint(taker.getAddress(), 100000000000);
      await ERC20Contract.connect(taker).approve(
        await ExchangeContractAsUser.getAddress(),
        100000000000
      );

      expect(await ERC721WithRoyaltyV2981.ownerOf(1)).to.be.equal(
        await maker.getAddress()
      );
      expect(await ERC20Contract.balanceOf(taker.getAddress())).to.be.equal(
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
      ).to.be.equal(100000000000);
      expect(
        await ExchangeContractAsUser.fills(hashKey(orderRight))
      ).to.be.equal(1);
      expect(await ERC721WithRoyaltyV2981.ownerOf(1)).to.be.equal(
        await taker.getAddress()
      );

      // check protocol fee
      expect(
        await ERC20Contract.balanceOf(defaultFeeReceiver.getAddress())
      ).to.be.equal(2500000000); // 250 * 100000000000 / 10000 = 2500000000

      expect(await ERC20Contract.balanceOf(receiver1.getAddress())).to.be.equal(
        15000000000 // 1500 * 100000000000 / 10000 = 15000000000
      );

      expect(await ERC20Contract.balanceOf(receiver2.getAddress())).to.be.equal(
        35000000000 // 3500 * 100000000000 / 10000 = 35000000000
      );

      expect(await ERC20Contract.balanceOf(maker.getAddress())).to.be.equal(
        47500000000 // 100000000000 - royalty - protocolFee
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

      await ERC20Contract.mint(taker.getAddress(), 100000000000);
      await ERC20Contract.connect(taker).approve(
        await ExchangeContractAsUser.getAddress(),
        100000000000
      );

      expect(await ERC721WithRoyaltyV2981.ownerOf(1)).to.be.equal(
        await maker.getAddress()
      );
      expect(await ERC20Contract.balanceOf(taker.getAddress())).to.be.equal(
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
      ).to.be.equal(100000000000);
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
        100000000000
      );
    });
  });

  describe('batching', function () {
    beforeEach(async function () {
      ({user: taker, user2: maker} = await loadFixture(deployFixtures));
    });
    it('should be able to buy 2 tokens from different orders in one txs', async function () {
      const totalPayment = 200;
      await ERC20Contract.mint(taker.getAddress(), totalPayment);
      await ERC20Contract.connect(taker).approve(
        await ExchangeContractAsUser.getAddress(),
        totalPayment
      );
      await ERC721Contract.mint(maker.getAddress(), 123);
      await ERC721Contract.connect(maker).approve(
        await ExchangeContractAsUser.getAddress(),
        123
      );
      await ERC721Contract.mint(maker.getAddress(), 345);
      await ERC721Contract.connect(maker).approve(
        await ExchangeContractAsUser.getAddress(),
        345
      );

      expect(await ERC20Contract.balanceOf(taker)).to.be.equal(totalPayment);
      expect(await ERC20Contract.balanceOf(maker)).to.be.equal(0);

      expect(await ERC721Contract.ownerOf(123)).to.be.equal(
        await maker.getAddress()
      );
      expect(await ERC721Contract.ownerOf(345)).to.be.equal(
        await maker.getAddress()
      );

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

      expect(await ERC721Contract.ownerOf(123)).to.be.equal(
        await taker.getAddress()
      );
      expect(await ERC721Contract.ownerOf(345)).to.be.equal(
        await taker.getAddress()
      );
    });

    it('should be able to buy 3 tokens from different orders in one txs', async function () {
      const totalPayment = 300;
      await ERC20Contract.mint(taker.getAddress(), totalPayment);
      await ERC20Contract.connect(taker).approve(
        await ExchangeContractAsUser.getAddress(),
        totalPayment
      );

      for (let i = 0; i < 3; i++) {
        await ERC721Contract.mint(maker.getAddress(), i);
        await ERC721Contract.connect(maker).approve(
          await ExchangeContractAsUser.getAddress(),
          i
        );
      }

      expect(await ERC20Contract.balanceOf(taker)).to.be.equal(totalPayment);
      expect(await ERC20Contract.balanceOf(maker)).to.be.equal(0);

      for (let i = 0; i < 3; i++) {
        expect(await ERC721Contract.ownerOf(i)).to.be.equal(
          await maker.getAddress()
        );
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
        expect(await ERC721Contract.ownerOf(i)).to.be.equal(
          await taker.getAddress()
        );
      }
    });

    // eslint-disable-next-line mocha/no-skipped-tests
    it.skip('@slow should be able to buy 20 tokens from different orders in one txs', async function () {
      const totalPayment = 2000;
      await ERC20Contract.mint(taker.getAddress(), totalPayment);
      await ERC20Contract.connect(taker).approve(
        await ExchangeContractAsUser.getAddress(),
        totalPayment
      );

      for (let i = 0; i < 20; i++) {
        await ERC721Contract.mint(maker.getAddress(), i);
        await ERC721Contract.connect(maker).approve(
          await ExchangeContractAsUser.getAddress(),
          i
        );
      }

      expect(await ERC20Contract.balanceOf(taker)).to.be.equal(totalPayment);
      expect(await ERC20Contract.balanceOf(maker)).to.be.equal(0);

      for (let i = 0; i < 20; i++) {
        expect(await ERC721Contract.ownerOf(i)).to.be.equal(
          await maker.getAddress()
        );
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
        expect(await ERC721Contract.ownerOf(i)).to.be.equal(
          await taker.getAddress()
        );
      }
    });

    // eslint-disable-next-line mocha/no-skipped-tests
    it.skip('@slow should be able to buy 50 tokens from different orders in one txs', async function () {
      const totalPayment = 5000;
      await ERC20Contract.mint(taker.getAddress(), totalPayment);
      await ERC20Contract.connect(taker).approve(
        await ExchangeContractAsUser.getAddress(),
        totalPayment
      );

      for (let i = 0; i < 50; i++) {
        await ERC721Contract.mint(maker.getAddress(), i);
        await ERC721Contract.connect(maker).approve(
          await ExchangeContractAsUser.getAddress(),
          i
        );
      }

      expect(await ERC20Contract.balanceOf(taker)).to.be.equal(totalPayment);
      expect(await ERC20Contract.balanceOf(maker)).to.be.equal(0);

      for (let i = 0; i < 50; i++) {
        expect(await ERC721Contract.ownerOf(i)).to.be.equal(
          await maker.getAddress()
        );
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
        expect(await ERC721Contract.ownerOf(i)).to.be.equal(
          await taker.getAddress()
        );
      }
    });

    it('should not be able to buy 51 tokens from different orders in one txs, match orders limit = 50', async function () {
      const totalPayment = 5100;
      await ERC20Contract.mint(taker.getAddress(), totalPayment);
      await ERC20Contract.connect(taker).approve(
        await ExchangeContractAsUser.getAddress(),
        totalPayment
      );

      for (let i = 0; i < 51; i++) {
        await ERC721Contract.mint(maker.getAddress(), i);
        await ERC721Contract.connect(maker).approve(
          await ExchangeContractAsUser.getAddress(),
          i
        );
      }

      expect(await ERC20Contract.balanceOf(taker)).to.be.equal(totalPayment);
      expect(await ERC20Contract.balanceOf(maker)).to.be.equal(0);

      for (let i = 0; i < 51; i++) {
        expect(await ERC721Contract.ownerOf(i)).to.be.equal(
          await maker.getAddress()
        );
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
    describe('ERC20-ERC20', function () {
      beforeEach(async function () {
        await ERC20Contract.mint(maker.getAddress(), 123000000);
        await ERC20Contract.connect(maker).approve(
          await ExchangeContractAsUser.getAddress(),
          123000000
        );

        await ERC20Contract2.mint(taker.getAddress(), 456000000);
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
    });
    describe('ERC721-ERC20', function () {
      beforeEach(async function () {
        ({
          deployer: maker, // making deployer the maker to sell in primary market
          user2: taker,
        } = await loadFixture(deployFixtures));
        await ERC721WithRoyaltyV2981.mint(maker.getAddress(), 1, [
          await FeeRecipientsData(maker.getAddress(), 10000),
        ]);
        await ERC721WithRoyaltyV2981.connect(maker).approve(
          await ExchangeContractAsUser.getAddress(),
          1
        );
        await ERC20Contract.mint(taker.getAddress(), 100000000000);
        await ERC20Contract.connect(taker).approve(
          await ExchangeContractAsUser.getAddress(),
          100000000000
        );
        makerAsset = await AssetERC721(ERC721WithRoyaltyV2981, 1);
        takerAsset = await AssetERC20(ERC20Contract, 100000000000);
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
      it('should NOT allow ERC721 tokens exchange if TSB_ROLE is activated and token is not whitelisted', async function () {
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
});
