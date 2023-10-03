import {expect} from 'chai';
import {deployFixtures} from '../fixtures';
import {loadFixture} from '@nomicfoundation/hardhat-network-helpers';
import {
  AssetERC1155,
  AssetERC20,
  AssetERC721,
  FeeRecipientsData,
  LibPartData,
} from '../utils/assets.ts';

import {
  getSymmetricOrder,
  hashKey,
  hashOrder,
  OrderDefault,
  signOrder,
  UINT256_MAX_VALUE,
} from '../utils/order.ts';
import {ZeroAddress} from 'ethers';

describe('Exchange.sol', function () {
  it('should return the correct value of protocol fee', async function () {
    const {
      ExchangeContractAsDeployer,
      protocolFeePrimary,
      protocolFeeSecondary,
    } = await loadFixture(deployFixtures);

    expect(await ExchangeContractAsDeployer.protocolFeePrimary()).to.be.equal(
      protocolFeePrimary
    );
    expect(await ExchangeContractAsDeployer.protocolFeeSecondary()).to.be.equal(
      protocolFeeSecondary
    );
  });

  it('should return the correct fee receiver address', async function () {
    const {ExchangeContractAsDeployer, defaultFeeReceiver} = await loadFixture(
      deployFixtures
    );

    expect(await ExchangeContractAsDeployer.defaultFeeReceiver()).to.be.equal(
      defaultFeeReceiver.address
    );
  });

  it('should return the correct royalty registry address', async function () {
    const {ExchangeContractAsDeployer, RoyaltiesRegistryAsDeployer} =
      await loadFixture(deployFixtures);

    expect(await ExchangeContractAsDeployer.royaltiesRegistry()).to.be.equal(
      await RoyaltiesRegistryAsDeployer.getAddress()
    );
  });

  it('should not cancel the order if caller is not maker', async function () {
    const {
      ExchangeContractAsDeployer,
      user1,
      user2,
      ERC20Contract,
      ERC721Contract,
    } = await loadFixture(deployFixtures);

    const makerAsset = await AssetERC20(ERC20Contract, 100);
    const takerAsset = await AssetERC721(ERC721Contract, 100);

    const leftOrder = await OrderDefault(
      user1,
      makerAsset,
      ZeroAddress,
      takerAsset,
      1,
      0,
      0
    );
    await expect(
      ExchangeContractAsDeployer.connect(user2).cancel(
        leftOrder,
        hashOrder(leftOrder)
      )
    ).to.be.revertedWith('ExchangeCore: not maker');
  });

  it('should not cancel order with zero salt', async function () {
    const {ExchangeContractAsUser, user, ERC20Contract, ERC721Contract} =
      await loadFixture(deployFixtures);

    const makerAsset = await AssetERC20(ERC20Contract, 100);
    const takerAsset = await AssetERC721(ERC721Contract, 100);

    const leftOrder = await OrderDefault(
      user,
      makerAsset,
      ZeroAddress,
      takerAsset,
      0, // setting salt value to 0
      0,
      0
    );
    await expect(
      ExchangeContractAsUser.cancel(leftOrder, hashKey(leftOrder))
    ).to.be.revertedWith("ExchangeCore: 0 salt can't be used");
  });

  it('should not cancel the order with invalid order hash', async function () {
    const {ExchangeContractAsUser, user1, ERC20Contract, ERC721Contract} =
      await loadFixture(deployFixtures);

    const makerAsset = await AssetERC20(ERC20Contract, 100);
    const takerAsset = await AssetERC721(ERC721Contract, 100);

    const leftOrder = await OrderDefault(
      user1,
      makerAsset,
      ZeroAddress,
      takerAsset,
      1,
      0,
      0
    );

    const invalidOrderHash =
      '0x1234567890123456789012345678901234567890123456789012345678901234';
    await expect(
      ExchangeContractAsUser.connect(user1).cancel(leftOrder, invalidOrderHash)
    ).to.be.revertedWith('ExchangeCore: Invalid orderHash');
  });

  it('should cancel an order and update fills mapping', async function () {
    const {ExchangeContractAsUser, user, ERC20Contract, ERC721Contract} =
      await loadFixture(deployFixtures);

    const makerAsset = await AssetERC20(ERC20Contract, 100);
    const takerAsset = await AssetERC721(ERC721Contract, 100);

    const leftOrder = await OrderDefault(
      user,
      makerAsset,
      ZeroAddress,
      takerAsset,
      1,
      0,
      0
    );

    await ExchangeContractAsUser.cancel(leftOrder, hashKey(leftOrder));

    expect(await ExchangeContractAsUser.fills(hashKey(leftOrder))).to.be.equal(
      UINT256_MAX_VALUE
    );
  });

  it('should execute a complete match order between ERC20 tokens', async function () {
    const {
      ExchangeContractAsUser,
      OrderValidatorAsDeployer,
      ERC20Contract,
      ERC20Contract2,
      defaultFeeReceiver,
      protocolFeeSecondary,
      user1: maker,
      user2: taker,
    } = await loadFixture(deployFixtures);

    await ERC20Contract.mint(maker.address, 200);
    await ERC20Contract.connect(maker).approve(
      await ExchangeContractAsUser.getAddress(),
      200
    );

    await ERC20Contract2.mint(taker.address, 100);
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
      1,
      0,
      0
    );

    const makerSig = await signOrder(
      orderLeft,
      maker,
      OrderValidatorAsDeployer
    );
    const takerSig = await signOrder(
      orderRight,
      taker,
      OrderValidatorAsDeployer
    );
    await ExchangeContractAsUser.matchOrders([
      {
        orderLeft,
        signatureLeft: makerSig,
        orderRight,
        signatureRight: takerSig,
      },
    ]);

    expect(await ERC20Contract.balanceOf(maker)).to.be.equal(0);
    expect(await ERC20Contract.balanceOf(taker)).to.be.equal(195); // 200 - protocolFee
    expect(await ERC20Contract2.balanceOf(maker)).to.be.equal(100);
    expect(await ERC20Contract2.balanceOf(taker)).to.be.equal(0);

    // check protocol fee -> 250 * 200 / 10000 = 5
    expect(
      await ERC20Contract.balanceOf(defaultFeeReceiver.address)
    ).to.be.equal(
      (Number(protocolFeeSecondary) * Number(makerAsset.value)) / 10000
    );
  });

  it('should execute a complete match order between ERC20 and ERC721 tokens', async function () {
    const {
      ExchangeContractAsUser,
      OrderValidatorAsDeployer,
      ERC20Contract,
      ERC721Contract,
      defaultFeeReceiver,
      protocolFeeSecondary,
      user1: maker,
      user2: taker,
    } = await loadFixture(deployFixtures);

    await ERC20Contract.mint(maker.address, 10000000000);
    await ERC20Contract.connect(maker).approve(
      await ExchangeContractAsUser.getAddress(),
      10000000000
    );
    await ERC721Contract.mint(taker.address, 1);
    await ERC721Contract.connect(taker).approve(
      await ExchangeContractAsUser.getAddress(),
      1
    );

    expect(await ERC20Contract.balanceOf(maker.address)).to.be.equal(
      10000000000
    );
    expect(await ERC721Contract.ownerOf(1)).to.be.equal(taker.address);
    const makerAsset = await AssetERC20(ERC20Contract, 10000000000);
    const takerAsset = await AssetERC721(ERC721Contract, 1);
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
    const makerSig = await signOrder(
      orderLeft,
      maker,
      OrderValidatorAsDeployer
    );
    const takerSig = await signOrder(
      orderRight,
      taker,
      OrderValidatorAsDeployer
    );

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
      1
    );
    expect(await ExchangeContractAsUser.fills(hashKey(orderRight))).to.be.equal(
      10000000000
    );
    expect(await ERC721Contract.ownerOf(1)).to.be.equal(maker.address);
    expect(await ERC20Contract.balanceOf(taker.address)).to.be.equal(
      9750000000
    );

    // check protocol fee -> 250 * 10000000000 / 10000 = 250000000
    expect(
      await ERC20Contract.balanceOf(defaultFeeReceiver.address)
    ).to.be.equal(
      (Number(protocolFeeSecondary) * Number(makerAsset.value)) / 10000
    );
  });

  it('should execute a complete match order between ERC20 and ERC1155 tokens', async function () {
    const {
      ExchangeContractAsUser,
      OrderValidatorAsDeployer,
      ERC20Contract,
      ERC1155Contract,
      defaultFeeReceiver,
      protocolFeeSecondary,
      user1: maker,
      user2: taker,
    } = await loadFixture(deployFixtures);

    await ERC20Contract.mint(maker.address, 10000000000);
    await ERC20Contract.connect(maker).approve(
      await ExchangeContractAsUser.getAddress(),
      10000000000
    );

    await ERC1155Contract.mint(taker.address, 1, 10);
    await ERC1155Contract.connect(taker).setApprovalForAll(
      await ExchangeContractAsUser.getAddress(),
      true
    );

    expect(await ERC20Contract.balanceOf(maker.address)).to.be.equal(
      10000000000
    );
    expect(await ERC1155Contract.balanceOf(taker.address, 1)).to.be.equal(10);

    const makerAsset = await AssetERC20(ERC20Contract, 10000000000);
    const takerAsset = await AssetERC1155(ERC1155Contract, 1, 10);

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
    const makerSig = await signOrder(
      orderLeft,
      maker,
      OrderValidatorAsDeployer
    );
    const takerSig = await signOrder(
      orderRight,
      taker,
      OrderValidatorAsDeployer
    );
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
      10
    );
    expect(await ExchangeContractAsUser.fills(hashKey(orderRight))).to.be.equal(
      10000000000
    );
    expect(await ERC1155Contract.balanceOf(maker.address, 1)).to.be.equal(10);
    expect(await ERC1155Contract.balanceOf(taker.address, 1)).to.be.equal(0);
    expect(await ERC20Contract.balanceOf(maker.address)).to.be.equal(0);
    expect(await ERC20Contract.balanceOf(taker.address)).to.be.equal(
      9750000000
    );

    // check protocol fee -> 250 * 10000000000 / 10000 = 250000000
    expect(
      await ERC20Contract.balanceOf(defaultFeeReceiver.address)
    ).to.be.equal(
      (Number(protocolFeeSecondary) * Number(makerAsset.value)) / 10000
    );
  });

  it('should execute a complete match order between ERC721 and ERC20 tokens in primary market', async function () {
    const {
      ExchangeContractAsUser,
      OrderValidatorAsDeployer,
      ERC20Contract,
      ERC721WithRoyaltyV2981,
      defaultFeeReceiver,
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

    expect(await ERC721WithRoyaltyV2981.ownerOf(1)).to.be.equal(maker.address);
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
    const makerSig = await signOrder(
      orderLeft,
      maker,
      OrderValidatorAsDeployer
    );
    const takerSig = await signOrder(
      orderRight,
      taker,
      OrderValidatorAsDeployer
    );

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
      100000000000
    );
    expect(await ExchangeContractAsUser.fills(hashKey(orderRight))).to.be.equal(
      1
    );
    expect(await ERC721WithRoyaltyV2981.ownerOf(1)).to.be.equal(taker.address);
    expect(await ERC20Contract.balanceOf(maker.address)).to.be.equal(
      98770000000
    );

    // check primary market protocol fee
    expect(
      await ERC20Contract.balanceOf(defaultFeeReceiver.address)
    ).to.be.equal(1230000000); // 123 * 100000000000 / 10000 = 1230000000
  });

  it('should execute a complete match order with external royalties provider(type 1)', async function () {
    const {
      ExchangeContractAsUser,
      OrderValidatorAsDeployer,
      ERC20Contract,
      ERC721Contract,
      RoyaltiesRegistryAsDeployer,
      defaultFeeReceiver,
      deployer: royaltyReceiver,
      user1: maker,
      user2: taker,
    } = await loadFixture(deployFixtures);

    await ERC721Contract.mint(maker.address, 1);

    await ERC721Contract.connect(maker).approve(
      await ExchangeContractAsUser.getAddress(),
      1
    );

    // set up royalties by token
    await RoyaltiesRegistryAsDeployer.setRoyaltiesByToken(
      await ERC721Contract.getAddress(),
      [await LibPartData(royaltyReceiver, 2000)]
    );

    await ERC20Contract.mint(taker.address, 100000000000);
    await ERC20Contract.connect(taker).approve(
      await ExchangeContractAsUser.getAddress(),
      100000000000
    );

    expect(await ERC721Contract.ownerOf(1)).to.be.equal(maker.address);
    expect(await ERC20Contract.balanceOf(taker.address)).to.be.equal(
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
    const makerSig = await signOrder(
      orderLeft,
      maker,
      OrderValidatorAsDeployer
    );
    const takerSig = await signOrder(
      orderRight,
      taker,
      OrderValidatorAsDeployer
    );

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
      100000000000
    );
    expect(await ExchangeContractAsUser.fills(hashKey(orderRight))).to.be.equal(
      1
    );
    expect(await ERC721Contract.ownerOf(1)).to.be.equal(taker.address);

    // check protocol fee
    expect(
      await ERC20Contract.balanceOf(defaultFeeReceiver.address)
    ).to.be.equal(2500000000); // 250 * 10000000000 / 10000 = 250000000

    // check paid royalty
    expect(await ERC20Contract.balanceOf(royaltyReceiver.address)).to.be.equal(
      20000000000
    ); // 20% of the amount

    expect(await ERC20Contract.balanceOf(maker.address)).to.be.equal(
      77500000000 // 100000000000 - royalty - protocolFee
    );
  });

  it('should execute a complete match order with external royalties provider(type 2)', async function () {
    const {
      ExchangeContractAsUser,
      OrderValidatorAsDeployer,
      ERC20Contract,
      ERC721Contract,
      RoyaltiesRegistryAsDeployer,
      RoyaltiesProvider,
      defaultFeeReceiver,
      deployer: royaltyReceiver,
      user1: maker,
      user2: taker,
    } = await loadFixture(deployFixtures);

    await ERC721Contract.mint(maker.address, 1);

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

    await ERC20Contract.mint(taker.address, 100000000000);
    await ERC20Contract.connect(taker).approve(
      await ExchangeContractAsUser.getAddress(),
      100000000000
    );

    expect(await ERC721Contract.ownerOf(1)).to.be.equal(maker.address);
    expect(await ERC20Contract.balanceOf(taker.address)).to.be.equal(
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
    const makerSig = await signOrder(
      orderLeft,
      maker,
      OrderValidatorAsDeployer
    );
    const takerSig = await signOrder(
      orderRight,
      taker,
      OrderValidatorAsDeployer
    );

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
      100000000000
    );
    expect(await ExchangeContractAsUser.fills(hashKey(orderRight))).to.be.equal(
      1
    );
    expect(await ERC721Contract.ownerOf(1)).to.be.equal(taker.address);

    // check protocol fee
    expect(
      await ERC20Contract.balanceOf(defaultFeeReceiver.address)
    ).to.be.equal(2500000000); // 250 * 10000000000 / 10000 = 250000000

    // check paid royalty
    expect(await ERC20Contract.balanceOf(royaltyReceiver.address)).to.be.equal(
      10000000000
    ); // 10% of the amount

    expect(await ERC20Contract.balanceOf(maker.address)).to.be.equal(
      87500000000 // 100000000000 - royalty - protocolFee
    );
  });

  it('should execute a complete match order with royalties 2981(type 3)', async function () {
    const {
      ExchangeContractAsUser,
      OrderValidatorAsDeployer,
      ERC20Contract,
      ERC721WithRoyaltyV2981,
      defaultFeeReceiver,
      deployer: royaltyReceiver,
      user1: maker,
      user2: taker,
    } = await loadFixture(deployFixtures);

    await ERC721WithRoyaltyV2981.mint(maker.address, 1, [
      await FeeRecipientsData(maker.address, 10000),
    ]);

    await ERC721WithRoyaltyV2981.connect(maker).approve(
      await ExchangeContractAsUser.getAddress(),
      1
    );

    // set up receiver
    await ERC721WithRoyaltyV2981.setRoyaltiesReceiver(
      1,
      royaltyReceiver.address
    );

    await ERC20Contract.mint(taker.address, 100000000000);
    await ERC20Contract.connect(taker).approve(
      await ExchangeContractAsUser.getAddress(),
      100000000000
    );

    expect(await ERC721WithRoyaltyV2981.ownerOf(1)).to.be.equal(maker.address);
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
    const makerSig = await signOrder(
      orderLeft,
      maker,
      OrderValidatorAsDeployer
    );
    const takerSig = await signOrder(
      orderRight,
      taker,
      OrderValidatorAsDeployer
    );

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
      100000000000
    );
    expect(await ExchangeContractAsUser.fills(hashKey(orderRight))).to.be.equal(
      1
    );
    expect(await ERC721WithRoyaltyV2981.ownerOf(1)).to.be.equal(taker.address);

    // check protocol fee
    expect(
      await ERC20Contract.balanceOf(defaultFeeReceiver.address)
    ).to.be.equal(2500000000); // 250 * 10000000000 / 10000 = 250000000

    // check paid royalty
    expect(await ERC20Contract.balanceOf(royaltyReceiver.address)).to.be.equal(
      50000000000
    ); // 50% of the amount

    expect(await ERC20Contract.balanceOf(maker.address)).to.be.equal(
      47500000000 // 100000000000 - royalty - protocolFee
    );
  });

  it('should execute a complete match order without fee and royalties for privileged seller', async function () {
    const {
      ExchangeContractAsUser,
      ExchangeContractAsDeployer,
      OrderValidatorAsDeployer,
      ERC20Contract,
      ERC721WithRoyaltyV2981,
      defaultFeeReceiver,
      deployer,
      admin,
      user1: maker,
      user2: taker,
    } = await loadFixture(deployFixtures);

    await ERC721WithRoyaltyV2981.mint(maker.address, 1, [
      await FeeRecipientsData(maker.address, 10000),
    ]);

    await ERC721WithRoyaltyV2981.connect(maker).approve(
      await ExchangeContractAsUser.getAddress(),
      1
    );

    // set up receiver
    await ERC721WithRoyaltyV2981.setRoyaltiesReceiver(1, deployer.address);

    // grant exchange admin role to seller
    const EXCHANGE_ADMIN_ROLE =
      '0x541943c4a49765b7940b4b1392c4b1f8ede6efd4e23572572987ae02e569a786'; // keccak256("EXCHANGE_ADMIN_ROLE")
    await ExchangeContractAsDeployer.connect(admin).grantRole(
      EXCHANGE_ADMIN_ROLE,
      taker.address
    );

    await ERC20Contract.mint(taker.address, 100000000000);
    await ERC20Contract.connect(taker).approve(
      await ExchangeContractAsUser.getAddress(),
      100000000000
    );

    expect(await ERC721WithRoyaltyV2981.ownerOf(1)).to.be.equal(maker.address);
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
    const makerSig = await signOrder(
      orderLeft,
      maker,
      OrderValidatorAsDeployer
    );
    const takerSig = await signOrder(
      orderRight,
      taker,
      OrderValidatorAsDeployer
    );

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
      100000000000
    );
    expect(await ExchangeContractAsUser.fills(hashKey(orderRight))).to.be.equal(
      1
    );
    expect(await ERC721WithRoyaltyV2981.ownerOf(1)).to.be.equal(taker.address);

    // no protocol fee paid
    expect(
      await ERC20Contract.balanceOf(defaultFeeReceiver.address)
    ).to.be.equal(0);

    // no royalties paid
    expect(await ERC20Contract.balanceOf(deployer.address)).to.be.equal(0);

    expect(await ERC20Contract.balanceOf(maker.address)).to.be.equal(
      100000000000
    );
  });

  it('should execute a complete match order between ERC721 and ERC20 tokens', async function () {
    const {
      ExchangeContractAsUser,
      OrderValidatorAsDeployer,
      ERC20Contract,
      ERC721Contract,
      user1: maker,
      user2: taker,
    } = await loadFixture(deployFixtures);
    await ERC721Contract.mint(maker.address, 1);
    await ERC721Contract.connect(maker).approve(
      await ExchangeContractAsUser.getAddress(),
      1
    );
    await ERC20Contract.mint(taker.address, 100);
    await ERC20Contract.connect(taker).approve(
      await ExchangeContractAsUser.getAddress(),
      100
    );

    expect(await ERC721Contract.ownerOf(1)).to.be.equal(maker.address);
    expect(await ERC20Contract.balanceOf(taker.address)).to.be.equal(100);
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
    const makerSig = await signOrder(
      orderLeft,
      maker,
      OrderValidatorAsDeployer
    );
    const takerSig = await signOrder(
      orderRight,
      taker,
      OrderValidatorAsDeployer
    );

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
      100
    );
    expect(await ExchangeContractAsUser.fills(hashKey(orderRight))).to.be.equal(
      1
    );
    expect(await ERC721Contract.ownerOf(1)).to.be.equal(taker.address);
    expect(await ERC20Contract.balanceOf(maker.address)).to.be.equal(98);
  });

  it('should execute a complete match order between ERC1155 and ERC20 tokens', async function () {
    const {
      ExchangeContractAsUser,
      OrderValidatorAsDeployer,
      ERC20Contract,
      ERC1155Contract,
      user1: maker,
      user2: taker,
    } = await loadFixture(deployFixtures);

    await ERC1155Contract.mint(maker.address, 1, 10);
    await ERC1155Contract.connect(maker).setApprovalForAll(
      await ExchangeContractAsUser.getAddress(),
      true
    );

    await ERC20Contract.mint(taker.address, 100);
    await ERC20Contract.connect(taker).approve(
      await ExchangeContractAsUser.getAddress(),
      100
    );

    expect(await ERC1155Contract.balanceOf(maker.address, 1)).to.be.equal(10);
    expect(await ERC20Contract.balanceOf(taker.address)).to.be.equal(100);

    const makerAsset = await AssetERC1155(ERC1155Contract, 1, 10);
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
    const makerSig = await signOrder(
      orderLeft,
      maker,
      OrderValidatorAsDeployer
    );
    const takerSig = await signOrder(
      orderRight,
      taker,
      OrderValidatorAsDeployer
    );
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
      100
    );
    expect(await ExchangeContractAsUser.fills(hashKey(orderRight))).to.be.equal(
      10
    );
    expect(await ERC1155Contract.balanceOf(maker.address, 1)).to.be.equal(0);
    expect(await ERC1155Contract.balanceOf(taker.address, 1)).to.be.equal(10);
    expect(await ERC20Contract.balanceOf(taker.address)).to.be.equal(0);
    expect(await ERC20Contract.balanceOf(maker.address)).to.be.equal(98);
  });

  it('should partially fill orders using matchOrders between ERC20 tokens', async function () {
    const {
      ExchangeContractAsUser,
      OrderValidatorAsDeployer,
      ERC20Contract,
      ERC20Contract2,
      user1: maker,
      user2: taker,
    } = await loadFixture(deployFixtures);

    await ERC20Contract.mint(maker.address, 100);
    await ERC20Contract.connect(maker).approve(
      await ExchangeContractAsUser.getAddress(),
      100
    );

    await ERC20Contract2.mint(taker.address, 200);
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
    const takerAssetForRighttOrder = await AssetERC20(ERC20Contract2, 100);
    const makerAssetForRightOrder = await AssetERC20(ERC20Contract, 50);

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
      takerAssetForRighttOrder,
      ZeroAddress,
      makerAssetForRightOrder,
      1,
      0,
      0
    );

    const makerSig = await signOrder(
      orderLeft,
      maker,
      OrderValidatorAsDeployer
    );
    const takerSig = await signOrder(
      orderRight,
      taker,
      OrderValidatorAsDeployer
    );
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
      100
    );
    expect(await ExchangeContractAsUser.fills(hashKey(orderRight))).to.be.equal(
      50
    );
    expect(await ERC20Contract.balanceOf(maker)).to.be.equal(50);
    expect(await ERC20Contract.balanceOf(taker)).to.be.equal(49);
    expect(await ERC20Contract2.balanceOf(maker)).to.be.equal(100);
    expect(await ERC20Contract2.balanceOf(taker)).to.be.equal(100);
  });

  it('should partially fill orders using matchOrders between ERC1155 and ERC20 tokens', async function () {
    const {
      ExchangeContractAsUser,
      OrderValidatorAsDeployer,
      ERC20Contract,
      ERC1155Contract,
      user1: maker,
      user2: taker,
    } = await loadFixture(deployFixtures);

    await ERC1155Contract.mint(maker.address, 1, 10);
    await ERC1155Contract.connect(maker).setApprovalForAll(
      await ExchangeContractAsUser.getAddress(),
      true
    );

    await ERC20Contract.mint(taker.address, 100);
    await ERC20Contract.connect(taker).approve(
      await ExchangeContractAsUser.getAddress(),
      100
    );

    expect(await ERC1155Contract.balanceOf(maker.address, 1)).to.be.equal(10);
    expect(await ERC20Contract.balanceOf(taker.address)).to.be.equal(100);

    const makerAssetForLeftOrder = await AssetERC1155(ERC1155Contract, 1, 10);
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
    const makerSig = await signOrder(
      orderLeft,
      maker,
      OrderValidatorAsDeployer
    );
    const takerSig = await signOrder(
      orderRight,
      taker,
      OrderValidatorAsDeployer
    );
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
      50
    );
    expect(await ExchangeContractAsUser.fills(hashKey(orderRight))).to.be.equal(
      5
    );
    expect(await ERC1155Contract.balanceOf(maker.address, 1)).to.be.equal(5);
    expect(await ERC1155Contract.balanceOf(taker.address, 1)).to.be.equal(5);
    expect(await ERC20Contract.balanceOf(taker.address)).to.be.equal(50);
    expect(await ERC20Contract.balanceOf(maker.address)).to.be.equal(49);
  });

  it('should fully fill a order using partial matches between ERC20 tokens', async function () {
    const {
      ExchangeContractAsUser,
      OrderValidatorAsDeployer,
      ERC20Contract,
      ERC20Contract2,
      user1: maker,
      user2: taker,
    } = await loadFixture(deployFixtures);

    await ERC20Contract.mint(maker.address, 100);
    await ERC20Contract.connect(maker).approve(
      await ExchangeContractAsUser.getAddress(),
      100
    );

    await ERC20Contract2.mint(taker.address, 200);
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
    const takerAssetForRighttOrder = await AssetERC20(ERC20Contract2, 100);
    const makerAssetForRightOrder = await AssetERC20(ERC20Contract, 50);

    const orderLeft = await OrderDefault(
      maker,
      makerAssetForLeftOrder,
      ZeroAddress,
      takerAssetForLeftOrder,
      1,
      0,
      0
    );
    const rightOrderForFirstMatch = await OrderDefault(
      taker,
      takerAssetForRighttOrder,
      ZeroAddress,
      makerAssetForRightOrder,
      1,
      0,
      0
    );

    const makerSig = await signOrder(
      orderLeft,
      maker,
      OrderValidatorAsDeployer
    );
    const takerSigForFirstMatch = await signOrder(
      rightOrderForFirstMatch,
      taker,
      OrderValidatorAsDeployer
    );
    expect(await ExchangeContractAsUser.fills(hashKey(orderLeft))).to.be.equal(
      0
    );
    expect(
      await ExchangeContractAsUser.fills(hashKey(rightOrderForFirstMatch))
    ).to.be.equal(0);
    await ExchangeContractAsUser.matchOrders([
      {
        orderLeft,
        signatureLeft: makerSig,
        orderRight: rightOrderForFirstMatch,
        signatureRight: takerSigForFirstMatch,
      },
    ]);
    expect(await ExchangeContractAsUser.fills(hashKey(orderLeft))).to.be.equal(
      100
    );
    expect(
      await ExchangeContractAsUser.fills(hashKey(rightOrderForFirstMatch))
    ).to.be.equal(50);
    expect(await ERC20Contract.balanceOf(maker)).to.be.equal(50);
    expect(await ERC20Contract.balanceOf(taker)).to.be.equal(49);
    expect(await ERC20Contract2.balanceOf(maker)).to.be.equal(100);
    expect(await ERC20Contract2.balanceOf(taker)).to.be.equal(100);

    const rightOrderForSecondMatch = await OrderDefault(
      taker,
      takerAssetForRighttOrder,
      ZeroAddress,
      makerAssetForRightOrder,
      2,
      0,
      0
    );
    const takerSigForSecondMatch = await signOrder(
      rightOrderForSecondMatch,
      taker,
      OrderValidatorAsDeployer
    );
    await ExchangeContractAsUser.matchOrders([
      {
        orderLeft,
        signatureLeft: makerSig,
        orderRight: rightOrderForSecondMatch,
        signatureRight: takerSigForSecondMatch,
      },
    ]);
    expect(await ExchangeContractAsUser.fills(hashKey(orderLeft))).to.be.equal(
      200
    );
    expect(
      await ExchangeContractAsUser.fills(hashKey(rightOrderForSecondMatch))
    ).to.be.equal(50);
    expect(await ERC20Contract.balanceOf(maker)).to.be.equal(0);
    expect(await ERC20Contract.balanceOf(taker)).to.be.equal(98);
    expect(await ERC20Contract2.balanceOf(maker)).to.be.equal(200);
    expect(await ERC20Contract2.balanceOf(taker)).to.be.equal(0);
  });

  it('should fully fill a order using partial matches between ERC20 and ERC1155 tokens', async function () {
    const {
      ExchangeContractAsUser,
      OrderValidatorAsDeployer,
      ERC20Contract,
      ERC1155Contract,
      user1: maker,
      user2: taker,
    } = await loadFixture(deployFixtures);

    await ERC20Contract.mint(maker.address, 100);
    await ERC20Contract.connect(maker).approve(
      await ExchangeContractAsUser.getAddress(),
      100
    );

    await ERC1155Contract.mint(taker.address, 1, 10);
    await ERC1155Contract.connect(taker).setApprovalForAll(
      await ExchangeContractAsUser.getAddress(),
      true
    );

    expect(await ERC20Contract.balanceOf(maker.address)).to.be.equal(100);
    expect(await ERC1155Contract.balanceOf(taker.address, 1)).to.be.equal(10);

    const makerAssetForLeftOrder = await AssetERC20(ERC20Contract, 100);
    const takerAssetForLeftOrder = await AssetERC1155(ERC1155Contract, 1, 10);
    const takerAssetForRightOrder = await AssetERC1155(ERC1155Contract, 1, 5);
    const makerAssetForRightOrder = await AssetERC20(ERC20Contract, 50);

    const orderLeft = await OrderDefault(
      maker,
      makerAssetForLeftOrder,
      ZeroAddress,
      takerAssetForLeftOrder,
      1,
      0,
      0
    );
    const rightOrderForFirstMatch = await OrderDefault(
      taker,
      takerAssetForRightOrder,
      ZeroAddress,
      makerAssetForRightOrder,
      1,
      0,
      0
    );
    const makerSig = await signOrder(
      orderLeft,
      maker,
      OrderValidatorAsDeployer
    );
    const takerSigForFirstMatch = await signOrder(
      rightOrderForFirstMatch,
      taker,
      OrderValidatorAsDeployer
    );
    expect(await ExchangeContractAsUser.fills(hashKey(orderLeft))).to.be.equal(
      0
    );
    expect(
      await ExchangeContractAsUser.fills(hashKey(rightOrderForFirstMatch))
    ).to.be.equal(0);
    await ExchangeContractAsUser.matchOrders([
      {
        orderLeft,
        signatureLeft: makerSig,
        orderRight: rightOrderForFirstMatch,
        signatureRight: takerSigForFirstMatch,
      },
    ]);
    expect(await ExchangeContractAsUser.fills(hashKey(orderLeft))).to.be.equal(
      5
    );
    expect(
      await ExchangeContractAsUser.fills(hashKey(rightOrderForFirstMatch))
    ).to.be.equal(50);
    expect(await ERC1155Contract.balanceOf(maker.address, 1)).to.be.equal(5);
    expect(await ERC1155Contract.balanceOf(taker.address, 1)).to.be.equal(5);
    expect(await ERC20Contract.balanceOf(maker.address)).to.be.equal(50);
    expect(await ERC20Contract.balanceOf(taker.address)).to.be.equal(49);
    const rightOrderForSecondMatch = await OrderDefault(
      taker,
      takerAssetForRightOrder,
      ZeroAddress,
      makerAssetForRightOrder,
      2,
      0,
      0
    );
    const takerSigForSecondMatch = await signOrder(
      rightOrderForSecondMatch,
      taker,
      OrderValidatorAsDeployer
    );
    await ExchangeContractAsUser.matchOrders([
      {
        orderLeft,
        signatureLeft: makerSig,
        orderRight: rightOrderForSecondMatch,
        signatureRight: takerSigForSecondMatch,
      },
    ]);
    expect(await ExchangeContractAsUser.fills(hashKey(orderLeft))).to.be.equal(
      10
    );
    expect(
      await ExchangeContractAsUser.fills(hashKey(rightOrderForSecondMatch))
    ).to.be.equal(50);
    expect(await ERC1155Contract.balanceOf(maker.address, 1)).to.be.equal(10);
    expect(await ERC1155Contract.balanceOf(taker.address, 1)).to.be.equal(0);
    expect(await ERC20Contract.balanceOf(maker.address)).to.be.equal(0);
    expect(await ERC20Contract.balanceOf(taker.address)).to.be.equal(98);
  });

  it('should revert matchOrders on mismatched asset types', async function () {
    const {
      ExchangeContractAsUser,
      OrderValidatorAsDeployer,
      ERC20Contract,
      ERC721Contract,
      ERC1155Contract,
      user1: maker,
      user2: taker,
    } = await loadFixture(deployFixtures);
    await ERC721Contract.mint(maker.address, 1);
    await ERC721Contract.connect(maker).approve(
      await ExchangeContractAsUser.getAddress(),
      1
    );
    await ERC20Contract.mint(taker.address, 100);
    await ERC20Contract.connect(taker).approve(
      await ExchangeContractAsUser.getAddress(),
      100
    );

    expect(await ERC721Contract.ownerOf(1)).to.be.equal(maker.address);
    expect(await ERC20Contract.balanceOf(taker.address)).to.be.equal(100);

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
    const makerSig = await signOrder(
      orderLeft,
      maker,
      OrderValidatorAsDeployer
    );
    const takerSig = await signOrder(
      orderRight,
      taker,
      OrderValidatorAsDeployer
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
    ).to.be.revertedWith("assets don't match");
  });

  it('should revert for matching a cancelled order', async function () {
    const {
      ExchangeContractAsUser,
      OrderValidatorAsDeployer,
      ERC20Contract,
      ERC721Contract,
      user1: maker,
      user2: taker,
    } = await loadFixture(deployFixtures);
    await ERC721Contract.mint(maker.address, 1);
    await ERC721Contract.connect(maker).approve(
      await ExchangeContractAsUser.getAddress(),
      1
    );
    await ERC20Contract.mint(taker.address, 100);
    await ERC20Contract.connect(taker).approve(
      await ExchangeContractAsUser.getAddress(),
      100
    );

    expect(await ERC721Contract.ownerOf(1)).to.be.equal(maker.address);
    expect(await ERC20Contract.balanceOf(taker.address)).to.be.equal(100);
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
    const makerSig = await signOrder(
      orderLeft,
      maker,
      OrderValidatorAsDeployer
    );
    const takerSig = await signOrder(
      orderRight,
      taker,
      OrderValidatorAsDeployer
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
  describe('batching', function () {
    // TODO: Add a lot more tests on batches.
    it('should be able to buy two tokens from different orders in one txs', async function () {
      const {
        ExchangeContractAsUser,
        OrderValidatorAsDeployer,
        ERC20Contract,
        ERC721Contract,
        user: taker,
        user2: maker,
      } = await loadFixture(deployFixtures);
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
          signatureLeft: await signOrder(
            left1,
            maker,
            OrderValidatorAsDeployer
          ),
          orderRight: await getSymmetricOrder(left1, taker),
          signatureRight: '0x',
        },
        {
          orderLeft: left2,
          signatureLeft: await signOrder(
            left2,
            maker,
            OrderValidatorAsDeployer
          ),
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
  });
  // TODO
  // describe("test match from", function () {});
  // describe("test on pause", function () {});
});
