import {expect} from 'chai';
import {deployFixtures} from '../fixtures';
import {loadFixture} from '@nomicfoundation/hardhat-network-helpers';
import {AssetERC20, AssetERC721, AssetETH} from '../utils/assets.ts';

import {
  hashKey,
  hashOrder,
  OrderDefault,
  OrderBack,
  UINT256_MAX_VALUE,
  DEFAULT_ORDER_TYPE,
} from '../utils/order.ts';
import {getBytes, ZeroAddress} from 'ethers';
import {signOrder, signOrderBack} from '../utils/signature';

describe('Exchange.sol', function () {
  // TODO: Erase
  it('check javascript hashing', async function () {
    const {ExchangeContractAsDeployer, user, ERC20Contract} = await loadFixture(
      deployFixtures
    );
    const makerAsset = await AssetERC20(ERC20Contract, 100);
    const takerAsset = await AssetETH(100);

    const defaultOrder = await OrderDefault(
      user,
      makerAsset,
      ZeroAddress,
      takerAsset,
      1, // setting salt value to 0
      0,
      0
    );
    expect(
      await ExchangeContractAsDeployer.getHashKey(defaultOrder)
    ).to.be.equal(hashKey(defaultOrder));
    const sellOrder = await OrderDefault(
      user,
      makerAsset,
      ZeroAddress,
      takerAsset,
      1, // setting salt value to 0
      0,
      0
    );
    expect(await ExchangeContractAsDeployer.getHashKey(sellOrder)).to.be.equal(
      hashKey(sellOrder)
    );
  });

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
    const {ExchangeContractAsDeployer} = await loadFixture(deployFixtures);
    await expect(
      ExchangeContractAsDeployer.setTrustedForwarder(ZeroAddress)
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
    const {ExchangeContractAsDeployer, user1, user2, ERC20Contract} =
      await loadFixture(deployFixtures);

    const makerAsset = await AssetERC20(ERC20Contract, 100);
    const takerAsset = await AssetETH(100);

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
    const {ExchangeContractAsUser, user, ERC20Contract} = await loadFixture(
      deployFixtures
    );

    const makerAsset = await AssetERC20(ERC20Contract, 100);
    const takerAsset = await AssetETH(100);

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
    const {ExchangeContractAsUser, user1, ERC20Contract} = await loadFixture(
      deployFixtures
    );

    const makerAsset = await AssetERC20(ERC20Contract, 100);
    const takerAsset = await AssetETH(100);

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
    const {ExchangeContractAsUser, user, ERC20Contract} = await loadFixture(
      deployFixtures
    );

    const makerAsset = await AssetERC20(ERC20Contract, 100);
    const takerAsset = await AssetETH(100);

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

    expect(
      await ExchangeContractAsUser.fills(
        await ExchangeContractAsUser.getHashKey(leftOrder)
      )
    ).to.be.equal(UINT256_MAX_VALUE);
  });

  // TODO: remove
  it('should be able to match two orders', async function () {
    const {
      ExchangeContractAsUser,
      OrderValidator,
      ERC20Contract,
      ERC721Contract,
      user,
      user2,
    } = await loadFixture(deployFixtures);
    await ERC721Contract.mint(user.address, 1);
    await ERC721Contract.connect(user).approve(
      await ExchangeContractAsUser.getAddress(),
      1
    );
    await ERC20Contract.mint(user2.address, 100);
    await ERC20Contract.connect(user2).approve(
      await ExchangeContractAsUser.getAddress(),
      100
    );

    const makerAsset = await AssetERC721(ERC721Contract, 1);
    const takerAsset = await AssetERC20(ERC20Contract, 100);

    const leftOrder = await OrderDefault(
      user,
      makerAsset,
      ZeroAddress,
      takerAsset,
      1,
      0,
      0
    );
    const rightOrder = await OrderDefault(
      user2,
      takerAsset,
      ZeroAddress,
      makerAsset,
      1,
      0,
      0
    );

    const makerSig = await signOrder(leftOrder, user, OrderValidator);
    const takerSig = await signOrder(rightOrder, user2, OrderValidator);

    await ExchangeContractAsUser.matchOrders(
      leftOrder,
      makerSig,
      rightOrder,
      takerSig
    );

    // TODO: Check balances before and after, validate everything!!!
  });

  it.only('should be able to execute direct purchase', async function () {
    const {
      ExchangeContractAsDeployer,
      OrderValidator,
      ERC20Contract,
      ERC721Contract,
      deployer,
      user1,
      user2,
      ExchangeContractAsUser
    } = await loadFixture(deployFixtures);
    await OrderValidator.setSigningWallet(deployer.address);
    await ERC721Contract.mint(user1.address, 1);
    await ERC20Contract.mint(user2.address, 100);
    await ERC721Contract.connect(user1).approve(
      await ExchangeContractAsDeployer.getAddress(),
      1
    );

    const makerAsset = await AssetERC721(ERC721Contract, 1);
    const takerAsset = await AssetERC20(ERC20Contract, 100);
    const order = await OrderBack(
      user2,
      user1,
      makerAsset,
      ZeroAddress,
      takerAsset,
      1,
      0,
      0,
      DEFAULT_ORDER_TYPE,
      "0x"
    );
    // const hash = await ExchangeContractAsDeployer.getBEHashKey(order);
    // const signature = await deployer.signMessage(hash);
    const signature = await signOrderBack(order, deployer, ExchangeContractAsDeployer);
    // const timestamp = await time.latest();
    // const sellOrderStart = timestamp - 100000;
    // const sellOrderEnd = timestamp + 100000;

    const purchase = {
      sellOrderMaker: user1.address,
      sellOrderNftAmount: 1,
      nftAssetClass: makerAsset.assetType.assetClass,
      nftData: makerAsset.assetType.data,
      sellOrderPaymentAmount: 100,
      paymentToken: await ERC20Contract.getAddress(),
      sellOrderSalt: 1,
      sellOrderStart: 0,
      sellOrderEnd: 0,
      sellOrderDataType: order.dataType,
      sellOrderData: order.data,
      sellOrderSignature: signature,
      buyOrderPaymentAmount: 100,
      buyOrderNftAmount: 1,
      buyOrderData: getBytes('0x'), // TODO pass buy data
    };

    // TODO: WIP
    // TODO: We need to test orderValidator first, a call to setSigningWallet is needed ?
    // TODO: What is this backend signature stuff ?
    // const backendSignature = getBytes('0x');
    await ExchangeContractAsDeployer.directPurchase(
      user2.address,
      [purchase],
      [signature]
    );
  });
});
