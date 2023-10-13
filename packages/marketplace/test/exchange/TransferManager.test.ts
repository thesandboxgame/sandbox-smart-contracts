import {expect} from 'chai';
import {deployFixtures} from '../fixtures';
import {loadFixture} from '@nomicfoundation/hardhat-network-helpers';
import {AssetERC20, AssetERC721, FeeRecipientsData} from '../utils/assets.ts';

import {hashKey, OrderDefault, signOrder} from '../utils/order.ts';
import {ZeroAddress, AbiCoder} from 'ethers';

describe('TransferManager.sol', function () {
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

  it('should not allow setting protocol primary fee greater than or equal to 5000', async function () {
    const {
      ExchangeContractAsUser,
      ExchangeContractAsDeployer,
      EXCHANGE_ADMIN_ROLE,
      admin,
      user,
    } = await loadFixture(deployFixtures);

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
    const {
      ExchangeContractAsUser,
      ExchangeContractAsDeployer,
      EXCHANGE_ADMIN_ROLE,
      admin,
      user,
    } = await loadFixture(deployFixtures);

    // grant exchange admin role to user
    await ExchangeContractAsDeployer.connect(admin).grantRole(
      EXCHANGE_ADMIN_ROLE,
      user.address
    );

    await expect(
      ExchangeContractAsUser.connect(user).setProtocolFee(1000, 5000)
    ).to.be.revertedWith('invalid secondary fee');
  });

  it('should not execute match order when royalties exceed 50%', async function () {
    const {
      ExchangeContractAsUser,
      OrderValidatorAsAdmin,
      ERC20Contract,
      ERC721WithRoyaltyV2981,
      deployer: creator,
      user1: maker,
      user2: taker,
    } = await loadFixture(deployFixtures);

    // set royalty greater than 50%
    await ERC721WithRoyaltyV2981.setRoyalties(1000000);

    await ERC721WithRoyaltyV2981.mint(creator.address, 1, [
      await FeeRecipientsData(creator.address, 10000),
    ]);
    await ERC721WithRoyaltyV2981.connect(creator).transferFrom(
      creator.address,
      maker.address,
      1
    );
    await ERC721WithRoyaltyV2981.connect(maker).approve(
      await ExchangeContractAsUser.getAddress(),
      1
    );
    await ERC20Contract.mint(taker.address, 1000);
    await ERC20Contract.connect(taker).approve(
      await ExchangeContractAsUser.getAddress(),
      1000
    );

    expect(await ERC721WithRoyaltyV2981.ownerOf(1)).to.be.equal(maker.address);
    expect(await ERC20Contract.balanceOf(taker.address)).to.be.equal(1000);
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
    ).to.be.revertedWith('Royalties are too high (>50%)');
  });

  it('should not execute match orders when royalties exceed 50% for token without IROYALTYUGC support', async function () {
    const {
      ExchangeContractAsUser,
      OrderValidatorAsAdmin,
      ERC20Contract,
      ERC721WithRoyaltyWithoutIROYALTYUGC,
      user1: maker,
      user2: taker,
    } = await loadFixture(deployFixtures);

    // set royalty greater than 50%
    await ERC721WithRoyaltyWithoutIROYALTYUGC.setRoyalties(1000000);

    await ERC721WithRoyaltyWithoutIROYALTYUGC.mint(maker.address, 1, [
      await FeeRecipientsData(maker.address, 10000),
    ]);

    await ERC721WithRoyaltyWithoutIROYALTYUGC.connect(maker).approve(
      await ExchangeContractAsUser.getAddress(),
      1
    );
    await ERC20Contract.mint(taker.address, 1000);
    await ERC20Contract.connect(taker).approve(
      await ExchangeContractAsUser.getAddress(),
      1000
    );

    expect(await ERC721WithRoyaltyWithoutIROYALTYUGC.ownerOf(1)).to.be.equal(
      maker.address
    );
    expect(await ERC20Contract.balanceOf(taker.address)).to.be.equal(1000);
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
    ).to.be.revertedWith('Royalties are too high (>50%)');
  });

  it('should not execute match orders when royalties exceed 50% for token without IROYALTYUGC and royalty.length != 1', async function () {
    const {
      ExchangeContractAsUser,
      OrderValidatorAsAdmin,
      ERC20Contract,
      ERC721WithRoyaltyWithoutIROYALTYUGC,
      user1: maker,
      user2: taker,
      admin: receiver1,
      user: receiver2,
    } = await loadFixture(deployFixtures);

    // set royalty greater than 50%
    await ERC721WithRoyaltyWithoutIROYALTYUGC.setRoyalties(1000000);

    await ERC721WithRoyaltyWithoutIROYALTYUGC.mint(maker.address, 1, [
      await FeeRecipientsData(receiver1.address, 3000),
      await FeeRecipientsData(receiver2.address, 7000),
    ]);

    await ERC721WithRoyaltyWithoutIROYALTYUGC.connect(maker).approve(
      await ExchangeContractAsUser.getAddress(),
      1
    );
    await ERC20Contract.mint(taker.address, 1000);
    await ERC20Contract.connect(taker).approve(
      await ExchangeContractAsUser.getAddress(),
      1000
    );

    expect(await ERC721WithRoyaltyWithoutIROYALTYUGC.ownerOf(1)).to.be.equal(
      maker.address
    );
    expect(await ERC20Contract.balanceOf(taker.address)).to.be.equal(1000);
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
    ).to.be.revertedWith('Royalties are too high (>50%)');
  });

  it('should not execute match order with non-one value for ERC721 asset class', async function () {
    const {
      ExchangeContractAsUser,
      OrderValidatorAsAdmin,
      ERC20Contract,
      ERC721Contract,
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
    const takerAsset = {
      assetType: {
        assetClass: '0x2', // ERC721_ASSET_CLASS = '0x2',
        data: AbiCoder.defaultAbiCoder().encode(
          ['address', 'uint256'],
          [await ERC721Contract.getAddress(), 1]
        ),
      },
      value: 2,
    };
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
    ).to.be.revertedWith('erc721 value error');
  });
});
