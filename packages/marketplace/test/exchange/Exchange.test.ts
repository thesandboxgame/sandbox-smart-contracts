import {expect} from 'chai';
import {deployFixtures} from '../fixtures';
import {loadFixture} from '@nomicfoundation/hardhat-network-helpers';
import {
  AssetERC1155,
  AssetERC20,
  AssetERC721,
  AssetETH,
} from '../utils/assets.ts';

import {
  hashKey,
  hashOrder,
  OrderDefault,
  UINT256_MAX_VALUE,
} from '../utils/order.ts';
import {ZeroAddress} from 'ethers';
import {signOrder} from '../utils/signature';

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

  it('should execute matchOrders', async function () {
    const {
      ExchangeContractAsUser,
      OrderValidatorAsDeployer,
      ERC20Contract,
      ERC721Contract,
      user1,
      user2,
    } = await loadFixture(deployFixtures);
    await ERC721Contract.mint(user1.address, 1);
    await ERC721Contract.connect(user1).approve(
      await ExchangeContractAsUser.getAddress(),
      1
    );
    await ERC20Contract.mint(user2.address, 100);
    await ERC20Contract.connect(user2).approve(
      await ExchangeContractAsUser.getAddress(),
      100
    );

    expect(await ERC721Contract.ownerOf(1)).to.be.equal(user1.address);
    expect(await ERC20Contract.balanceOf(user2.address)).to.be.equal(100);
    const makerAsset = await AssetERC721(ERC721Contract, 1);
    const takerAsset = await AssetERC20(ERC20Contract, 100);
    const leftOrder = await OrderDefault(
      user1,
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
    const makerSig = await signOrder(
      leftOrder,
      user1,
      OrderValidatorAsDeployer
    );
    const takerSig = await signOrder(
      rightOrder,
      user2,
      OrderValidatorAsDeployer
    );

    expect(await ExchangeContractAsUser.fills(hashKey(leftOrder))).to.be.equal(
      0
    );
    expect(await ExchangeContractAsUser.fills(hashKey(rightOrder))).to.be.equal(
      0
    );

    await ExchangeContractAsUser.matchOrders(
      leftOrder,
      makerSig,
      rightOrder,
      takerSig
    );
    expect(await ExchangeContractAsUser.fills(hashKey(leftOrder))).to.be.equal(
      100
    );
    expect(await ExchangeContractAsUser.fills(hashKey(rightOrder))).to.be.equal(
      1
    );
    expect(await ERC721Contract.ownerOf(1)).to.be.equal(user2.address);
    // 98 = 100 - originFee
    expect(await ERC20Contract.balanceOf(user1.address)).to.be.equal(98);
  });

  it('should revert matchOrders on mismatched asset types', async function () {
    const {
      ExchangeContractAsUser,
      OrderValidatorAsDeployer,
      ERC20Contract,
      ERC721Contract,
      ERC1155Contract,
      user1,
      user2,
    } = await loadFixture(deployFixtures);
    await ERC721Contract.mint(user1.address, 1);
    await ERC721Contract.connect(user1).approve(
      await ExchangeContractAsUser.getAddress(),
      1
    );
    await ERC20Contract.mint(user2.address, 100);
    await ERC20Contract.connect(user2).approve(
      await ExchangeContractAsUser.getAddress(),
      100
    );

    expect(await ERC721Contract.ownerOf(1)).to.be.equal(user1.address);
    expect(await ERC20Contract.balanceOf(user2.address)).to.be.equal(100);

    const makerAssetForLeftOrder = await AssetERC721(ERC721Contract, 1);
    const takerAssetForLeftOrder = await AssetERC20(ERC20Contract, 100);
    const takerAssetForRightOrder = await AssetERC20(ERC20Contract, 50);
    const makerAssetForRightOrder = await AssetERC1155(ERC1155Contract, 1, 5);
    const leftOrder = await OrderDefault(
      user1,
      makerAssetForLeftOrder,
      ZeroAddress,
      takerAssetForLeftOrder,
      1,
      0,
      0
    );
    const rightOrder = await OrderDefault(
      user2,
      takerAssetForRightOrder,
      ZeroAddress,
      makerAssetForRightOrder,
      1,
      0,
      0
    );
    const makerSig = await signOrder(
      leftOrder,
      user1,
      OrderValidatorAsDeployer
    );
    const takerSig = await signOrder(
      rightOrder,
      user2,
      OrderValidatorAsDeployer
    );

    await expect(
      ExchangeContractAsUser.matchOrders(
        leftOrder,
        makerSig,
        rightOrder,
        takerSig
      )
    ).to.be.revertedWith("assets don't match");
  });

  it('should partially fill orders using matchOrders', async function () {
    const {
      ExchangeContractAsUser,
      OrderValidatorAsDeployer,
      ERC20Contract,
      ERC1155Contract,
      user1,
      user2,
    } = await loadFixture(deployFixtures);

    await ERC1155Contract.mint(user1.address, 1, 10);
    await ERC1155Contract.connect(user1).setApprovalForAll(
      await ExchangeContractAsUser.getAddress(),
      true
    );

    await ERC20Contract.mint(user2.address, 100);
    await ERC20Contract.connect(user2).approve(
      await ExchangeContractAsUser.getAddress(),
      100
    );

    expect(await ERC1155Contract.balanceOf(user1.address, 1)).to.be.equal(10);
    expect(await ERC20Contract.balanceOf(user2.address)).to.be.equal(100);

    const makerAssetForLeftOrder = await AssetERC1155(ERC1155Contract, 1, 10);
    const takerAssetForLeftOrder = await AssetERC20(ERC20Contract, 100);
    const takerAssetForRightOrder = await AssetERC20(ERC20Contract, 50);
    const makerAssetForRightOrder = await AssetERC1155(ERC1155Contract, 1, 5);
    const leftOrder = await OrderDefault(
      user1,
      makerAssetForLeftOrder,
      ZeroAddress,
      takerAssetForLeftOrder,
      1,
      0,
      0
    );
    const rightOrder = await OrderDefault(
      user2,
      takerAssetForRightOrder,
      ZeroAddress,
      makerAssetForRightOrder,
      1,
      0,
      0
    );
    const makerSig = await signOrder(
      leftOrder,
      user1,
      OrderValidatorAsDeployer
    );
    const takerSig = await signOrder(
      rightOrder,
      user2,
      OrderValidatorAsDeployer
    );
    expect(await ExchangeContractAsUser.fills(hashKey(leftOrder))).to.be.equal(
      0
    );
    expect(await ExchangeContractAsUser.fills(hashKey(rightOrder))).to.be.equal(
      0
    );
    await ExchangeContractAsUser.matchOrders(
      leftOrder,
      makerSig,
      rightOrder,
      takerSig
    );
    expect(await ExchangeContractAsUser.fills(hashKey(leftOrder))).to.be.equal(
      50
    );
    expect(await ExchangeContractAsUser.fills(hashKey(rightOrder))).to.be.equal(
      5
    );
    expect(await ERC1155Contract.balanceOf(user1.address, 1)).to.be.equal(5);
    expect(await ERC1155Contract.balanceOf(user2.address, 1)).to.be.equal(5);
    expect(await ERC20Contract.balanceOf(user2.address)).to.be.equal(50);
    // 49 = 50 -originFee
    expect(await ERC20Contract.balanceOf(user1.address)).to.be.equal(49);
  });

  it('should revert for matching a cancelled order', async function () {
    const {
      ExchangeContractAsUser,
      OrderValidatorAsDeployer,
      ERC20Contract,
      ERC721Contract,
      user1,
      user2,
    } = await loadFixture(deployFixtures);
    await ERC721Contract.mint(user1.address, 1);
    await ERC721Contract.connect(user1).approve(
      await ExchangeContractAsUser.getAddress(),
      1
    );
    await ERC20Contract.mint(user2.address, 100);
    await ERC20Contract.connect(user2).approve(
      await ExchangeContractAsUser.getAddress(),
      100
    );

    expect(await ERC721Contract.ownerOf(1)).to.be.equal(user1.address);
    expect(await ERC20Contract.balanceOf(user2.address)).to.be.equal(100);
    const makerAsset = await AssetERC721(ERC721Contract, 1);
    const takerAsset = await AssetERC20(ERC20Contract, 100);
    const leftOrder = await OrderDefault(
      user1,
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
    const makerSig = await signOrder(
      leftOrder,
      user1,
      OrderValidatorAsDeployer
    );
    const takerSig = await signOrder(
      rightOrder,
      user2,
      OrderValidatorAsDeployer
    );
    await ExchangeContractAsUser.connect(user1).cancel(
      leftOrder,
      hashKey(leftOrder)
    );
    await expect(
      ExchangeContractAsUser.matchOrders(
        leftOrder,
        makerSig,
        rightOrder,
        takerSig
      )
    ).to.be.reverted;
  });
});
