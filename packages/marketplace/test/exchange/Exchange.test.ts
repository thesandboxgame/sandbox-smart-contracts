import {expect} from 'chai';
import {deployFixtures} from '../fixtures';
import {loadFixture} from '@nomicfoundation/hardhat-network-helpers';

import {ETH_ASSET_CLASS, ERC20_ASSET_CLASS, enc} from '../utils/assets.ts';
import {createOrder, createAsset} from '../utils/order.ts';

describe('Exchange.sol', function () {
  it('should not set trusted forwarder if caller is not owner', async function () {
    const {ExchangeContractAsUser, user} = await loadFixture(deployFixtures);
    await expect(
      ExchangeContractAsUser.setTrustedForwarder(user.address)
    ).to.be.revertedWith('Ownable: caller is not the owner');
  });

  it('should set trusted forwarder', async function () {
    const {ExchangeContractAsDeployer, user, TrustedForwarder} =
      await loadFixture(deployFixtures);
    expect(await ExchangeContractAsDeployer.getTrustedForwarder()).to.be.equal(
      await TrustedForwarder.getAddress()
    );
    await ExchangeContractAsDeployer.setTrustedForwarder(user.address);
    expect(await ExchangeContractAsDeployer.getTrustedForwarder()).to.be.equal(
      user.address
    );
  });

  it('should not be able to set trusted forwarder as zero address', async function () {
    const {ExchangeContractAsDeployer, ZERO_ADDRESS} = await loadFixture(
      deployFixtures
    );
    await expect(
      ExchangeContractAsDeployer.setTrustedForwarder(ZERO_ADDRESS)
    ).to.be.revertedWith('address must be different from 0');
  });

  it('should not set OrderValidator if caller is not owner', async function () {
    const {ExchangeContractAsUser, user} = await loadFixture(deployFixtures);
    await expect(
      ExchangeContractAsUser.setOrderValidatorContract(user.address)
    ).to.be.revertedWith('Ownable: caller is not the owner');
  });

  it('should be able to set Order Validator', async function () {
    const {ExchangeContractAsDeployer, user} = await loadFixture(
      deployFixtures
    );
    await expect(
      ExchangeContractAsDeployer.setOrderValidatorContract(user.address)
    )
      .to.emit(ExchangeContractAsDeployer, 'OrderValidatorSetted')
      .withArgs(user.address);
  });

  it('should not update native order if caller is not owner', async function () {
    const {ExchangeContractAsUser} = await loadFixture(deployFixtures);

    await expect(
      ExchangeContractAsUser.updateNative(false, false)
    ).to.be.revertedWith('Ownable: caller is not the owner');
  });

  it('should update native order', async function () {
    const {ExchangeContractAsDeployer} = await loadFixture(deployFixtures);
    expect(await ExchangeContractAsDeployer.nativeMeta()).to.be.equal(true);
    expect(await ExchangeContractAsDeployer.nativeOrder()).to.be.equal(true);
    await ExchangeContractAsDeployer.updateNative(false, false);
    expect(await ExchangeContractAsDeployer.nativeMeta()).to.be.equal(false);
    expect(await ExchangeContractAsDeployer.nativeOrder()).to.be.equal(false);
  });

  it('should not cancel the order if caller is not maker', async function () {
    const {
      ExchangeContractAsDeployer,
      user1,
      user2,
      ZERO_ADDRESS,
      ERC20Contract,
    } = await loadFixture(deployFixtures);

    const makeAsset = createAsset(
      ERC20_ASSET_CLASS,
      await enc(await ERC20Contract.getAddress(), 1),
      100
    );
    const takeAsset = createAsset(
      ETH_ASSET_CLASS,
      await enc(await ERC20Contract.getAddress(), 1),
      100
    );

    const leftOrder = createOrder(
      user1.address,
      makeAsset,
      ZERO_ADDRESS,
      takeAsset,
      1,
      0,
      0,
      '0xffffffff',
      '0x'
    );

    await expect(
      ExchangeContractAsDeployer.connect(user2).cancel(
        leftOrder,
        await ExchangeContractAsDeployer.getHashKey(leftOrder)
      )
    ).to.be.revertedWith('ExchangeCore: not maker');
  });

  it('should not cancel order with zero salt', async function () {
    const {ExchangeContractAsDeployer, user1, ZERO_ADDRESS} = await loadFixture(
      deployFixtures
    );
    const leftOrder = {
      maker: user1.address,
      makeAsset: {
        assetType: {
          assetClass: '0x00000000',
          data: '0x',
        },
        value: 100,
      },
      taker: ZERO_ADDRESS,
      takeAsset: {
        assetType: {
          assetClass: '0x00000000',
          data: '0x',
        },
        value: 200,
      },
      salt: 0,
      start: 0,
      end: 0,
      dataType: '0xffffffff',
      data: '0x',
    };
    await expect(
      ExchangeContractAsDeployer.connect(user1).cancel(
        leftOrder,
        await ExchangeContractAsDeployer.getHashKey(leftOrder)
      )
    ).to.be.revertedWith("ExchangeCore: 0 salt can't be used");
  });

  it('should not cancel the order with invalid order hash', async function () {
    const {ExchangeContractAsDeployer, user1, ZERO_ADDRESS} = await loadFixture(
      deployFixtures
    );
    const leftOrder = {
      maker: user1.address,
      makeAsset: {
        assetType: {
          assetClass: '0x00000000',
          data: '0x',
        },
        value: 100,
      },
      taker: ZERO_ADDRESS,
      takeAsset: {
        assetType: {
          assetClass: '0x00000000',
          data: '0x',
        },
        value: 200,
      },
      salt: 1,
      start: 0,
      end: 0,
      dataType: '0xffffffff',
      data: '0x',
    };
    const invalidOrderHash =
      '0x1234567890123456789012345678901234567890123456789012345678901234';
    await expect(
      ExchangeContractAsDeployer.connect(user1).cancel(
        leftOrder,
        invalidOrderHash
      )
    ).to.be.revertedWith('ExchangeCore: Invalid orderHash');
  });

  it('should cancel an order and update fills mapping', async function () {
    const {ExchangeContractAsDeployer, user1, ZERO_ADDRESS} = await loadFixture(
      deployFixtures
    );
    const UINT256_MAX_VALUE =
      115792089237316195423570985008687907853269984665640564039457584007913129639935n;
    const leftOrder = {
      maker: user1.address,
      makeAsset: {
        assetType: {
          assetClass: '0x00000000',
          data: '0x',
        },
        value: 100,
      },
      taker: ZERO_ADDRESS,
      takeAsset: {
        assetType: {
          assetClass: '0x00000000',
          data: '0x',
        },
        value: 200,
      },
      salt: 1,
      start: 0,
      end: 0,
      dataType: '0xffffffff',
      data: '0x',
    };
    await ExchangeContractAsDeployer.connect(user1).cancel(
      leftOrder,
      await ExchangeContractAsDeployer.getHashKey(leftOrder)
    );

    expect(
      await ExchangeContractAsDeployer.fills(
        await ExchangeContractAsDeployer.getHashKey(leftOrder)
      )
    ).to.be.equal(UINT256_MAX_VALUE);
  });

  it('should be able to execute direct purchase', async function () {
    const {
      ExchangeContractAsDeployer,
      ERC20Contract,
      ERC721Contract,
      ZERO_ADDRESS,
      user1,
      user2,
    } = await loadFixture(deployFixtures);
    await ERC721Contract.mint(user1.address, 1);
    await ERC20Contract.mint(user2.address, 100);
    await ERC721Contract.connect(user1).approve(
      await ExchangeContractAsDeployer.getAddress(),
      1
    );

    const purchase = {
      sellOrderMaker: user1.address,
      sellOrderNftAmount: 1,
      nftAssetClass: '0x73ad2146', // bytes4(keccak256("ERC721"))
      nftData: '0x0', // TODO provide nft data
      sellOrderPaymentAmount: 100,
      paymentToken: ERC20Contract.getAddress(),
      sellOrderSalt: 1,
      sellOrderStart: 0,
      sellOrderEnd: 0,
      sellOrderDataType: '8ae85d84', // bytes4(keccak256("ERC20"));
      sellOrderData: '0x0', // TODO pass sell order data
      sellOrderSignature: '0x0', // TODO pass signature
      buyOrderPaymentAmount: 100,
      buyOrderNftAmount: 1,
      buyOrderData: '0x0', // TODO pass buy data
    };

    const leftOrder = {
      maker: user1.address,
      makeAsset: {
        assetType: {
          assetClass: '0x73ad2146',
          data: '0x0',
        },
        value: 1,
      },
      taker: ZERO_ADDRESS,
      takeAsset: {
        assetType: {
          assetClass: '8ae85d84',
          data: '0x0',
        },
        value: 100,
      },
      salt: 1,
      start: 0,
      end: 0,
      dataType: '0xffffffff',
      data: '0x',
    };
    // WIP
    // await ExchangeContractAsDeployer.directPurchase(user2.address, purchase);
  });
});
