import {deployFixtures} from '../fixtures';
import {loadFixture} from '@nomicfoundation/hardhat-network-helpers';
import {expect} from 'chai';
import {AssetERC20, AssetERC721} from '../utils/assets.ts';

import {OrderDefault, signOrder} from '../utils/order.ts';
import {ZeroAddress} from 'ethers';

// keccak256("TSB_ROLE")
const TSBRole =
  '0x6278160ef7ca8a5eb8e5b274bcc0427c2cc7e12eee2a53c5989a1afb360f6404';
// keccak256("PARTNER_ROLE")
const PartnerRole =
  '0x2f049b28665abd79bc83d9aa564dba6b787ac439dba27b48e163a83befa9b260';
// keccak256("ERC20_ROLE")

describe('OrderValidator.sol', function () {
  it('should validate when assetClass is not ETH_ASSET_CLASS', async function () {
    const {OrderValidatorAsUser, ERC20Contract, ERC721Contract, user1} =
      await loadFixture(deployFixtures);
    const makerAsset = await AssetERC20(ERC20Contract, 100);
    const takerAsset = await AssetERC721(ERC721Contract, 100);
    const order = await OrderDefault(
      user1,
      makerAsset,
      ZeroAddress,
      takerAsset,
      1,
      0,
      0
    );
    const signature = await signOrder(order, user1, OrderValidatorAsUser);

    await expect(OrderValidatorAsUser.validate(order, signature, user1.address))
      .to.not.be.reverted;
  });

  it('should revert validate when salt is zero and Order maker is not sender', async function () {
    const {OrderValidatorAsUser, ERC20Contract, ERC721Contract, user1, user2} =
      await loadFixture(deployFixtures);
    const makerAsset = await AssetERC721(ERC721Contract, 100);
    const takerAsset = await AssetERC20(ERC20Contract, 100);
    const order = await OrderDefault(
      user1,
      makerAsset,
      ZeroAddress,
      takerAsset,
      0,
      0,
      0
    );
    const signature = await signOrder(order, user1, OrderValidatorAsUser);

    await expect(
      OrderValidatorAsUser.validate(order, signature, user2.address)
    ).to.be.revertedWith('maker is not tx sender');
  });

  it('should validate when salt is zero and Order maker is sender', async function () {
    const {OrderValidatorAsUser, ERC20Contract, ERC721Contract, user1} =
      await loadFixture(deployFixtures);
    const makerAsset = await AssetERC721(ERC721Contract, 100);
    const takerAsset = await AssetERC20(ERC20Contract, 100);
    const order = await OrderDefault(
      user1,
      makerAsset,
      ZeroAddress,
      takerAsset,
      0,
      0,
      0
    );
    const signature = await signOrder(order, user1, OrderValidatorAsUser);

    await expect(OrderValidatorAsUser.validate(order, signature, user1.address))
      .to.not.be.reverted;
  });

  it('should validate when salt is non zero and Order maker is sender', async function () {
    const {OrderValidatorAsUser, ERC20Contract, ERC721Contract, user1} =
      await loadFixture(deployFixtures);
    const makerAsset = await AssetERC721(ERC721Contract, 100);
    const takerAsset = await AssetERC20(ERC20Contract, 100);
    const order = await OrderDefault(
      user1,
      makerAsset,
      ZeroAddress,
      takerAsset,
      1,
      0,
      0
    );
    const signature = await signOrder(order, user1, OrderValidatorAsUser);

    await expect(OrderValidatorAsUser.validate(order, signature, user1.address))
      .to.not.be.reverted;
  });
  it('should not validate when maker is address zero', async function () {
    const {OrderValidatorAsUser, ERC20Contract, ERC721Contract, user1, user2} =
      await loadFixture(deployFixtures);
    const makerAsset = await AssetERC721(ERC721Contract, 100);
    const takerAsset = await AssetERC20(ERC20Contract, 100);
    const order = await OrderDefault(
      user1,
      makerAsset,
      ZeroAddress,
      takerAsset,
      1,
      0,
      0
    );
    order.maker = ZeroAddress;
    const signature = await signOrder(order, user2, OrderValidatorAsUser);
    await expect(
      OrderValidatorAsUser.validate(order, signature, user2.address)
    ).to.be.revertedWith('no maker');
  });

  it('should not validate when sender and signature signer is not Order maker', async function () {
    const {OrderValidatorAsUser, ERC20Contract, ERC721Contract, user1, user2} =
      await loadFixture(deployFixtures);
    const makerAsset = await AssetERC721(ERC721Contract, 100);
    const takerAsset = await AssetERC20(ERC20Contract, 100);
    const order = await OrderDefault(
      user1,
      makerAsset,
      ZeroAddress,
      takerAsset,
      1,
      0,
      0
    );
    const signature = await signOrder(order, user2, OrderValidatorAsUser);

    await expect(
      OrderValidatorAsUser.validate(order, signature, user2.address)
    ).to.be.revertedWith('order signature verification error');
  });

  it('should validate when sender is not Order maker but signature signer is Order maker', async function () {
    const {OrderValidatorAsUser, ERC20Contract, ERC721Contract, user1, user2} =
      await loadFixture(deployFixtures);
    const makerAsset = await AssetERC721(ERC721Contract, 100);
    const takerAsset = await AssetERC20(ERC20Contract, 100);
    const order = await OrderDefault(
      user1,
      makerAsset,
      ZeroAddress,
      takerAsset,
      1,
      0,
      0
    );
    const signature = await signOrder(order, user1, OrderValidatorAsUser);

    await expect(OrderValidatorAsUser.validate(order, signature, user2.address))
      .to.not.be.reverted;
  });

  it('should validate when order maker is contract and sender', async function () {
    const {
      OrderValidatorAsUser,
      ERC20Contract,
      ERC721Contract,
      ERC1271Contract,
    } = await loadFixture(deployFixtures);
    const makerAsset = await AssetERC721(ERC721Contract, 100);
    const takerAsset = await AssetERC20(ERC20Contract, 100);
    const order = await OrderDefault(
      ERC1271Contract,
      makerAsset,
      ZeroAddress,
      takerAsset,
      1,
      0,
      0
    );

    await expect(
      OrderValidatorAsUser.validate(
        order,
        '0x',
        await ERC1271Contract.getAddress()
      )
    ).to.not.be.reverted;
  });

  it('should not validate when maker is contract but not sender and isValidSignature returns non-magic value', async function () {
    const {
      OrderValidatorAsUser,
      ERC20Contract,
      ERC721Contract,
      ERC1271Contract,
      user1,
    } = await loadFixture(deployFixtures);
    const makerAsset = await AssetERC721(ERC721Contract, 100);
    const takerAsset = await AssetERC20(ERC20Contract, 100);
    const order = await OrderDefault(
      ERC1271Contract,
      makerAsset,
      ZeroAddress,
      takerAsset,
      1,
      0,
      0
    );

    await expect(
      OrderValidatorAsUser.validate(order, '0x', user1.address)
    ).to.be.revertedWith('order signature verification error');
  });

  it('should validate when maker is contract but not sender and isValidSignature returns magic value', async function () {
    const {
      OrderValidatorAsUser,
      ERC20Contract,
      ERC721Contract,
      ERC1271Contract,
      user1,
    } = await loadFixture(deployFixtures);
    const makerAsset = await AssetERC721(ERC721Contract, 100);
    const takerAsset = await AssetERC20(ERC20Contract, 100);
    const order = await OrderDefault(
      ERC1271Contract,
      makerAsset,
      ZeroAddress,
      takerAsset,
      1,
      0,
      0
    );
    await ERC1271Contract.setReturnSuccessfulValidSignature(true);
    await expect(OrderValidatorAsUser.validate(order, '0x', user1.address)).to
      .not.be.reverted;
  });

  it('should validate when open is disabled, tsbOnly is enabled and makeTokenAddress have TSB_ROLE', async function () {
    const {
      OrderValidatorAsUser,
      OrderValidatorAsAdmin,
      ERC20Contract,
      ERC721Contract,
      user1,
    } = await loadFixture(deployFixtures);

    expect(await OrderValidatorAsAdmin.open()).to.be.equal(true);
    expect(await OrderValidatorAsAdmin.tsbOnly()).to.be.equal(false);

    await OrderValidatorAsAdmin.setPermissions(true, false, false, false);

    expect(await OrderValidatorAsAdmin.open()).to.be.equal(false);
    expect(await OrderValidatorAsAdmin.tsbOnly()).to.be.equal(true);

    expect(
      await OrderValidatorAsUser.hasRole(
        TSBRole,
        await ERC20Contract.getAddress()
      )
    ).to.be.equal(false);

    await OrderValidatorAsAdmin.grantRole(
      TSBRole,
      await ERC20Contract.getAddress()
    );

    expect(
      await OrderValidatorAsUser.hasRole(
        TSBRole,
        await ERC20Contract.getAddress()
      )
    ).to.be.equal(true);

    const makerAsset = await AssetERC20(ERC20Contract, 100);
    const takerAsset = await AssetERC721(ERC721Contract, 100);
    const order = await OrderDefault(
      user1,
      makerAsset,
      ZeroAddress,
      takerAsset,
      1,
      0,
      0
    );
    const signature = await signOrder(order, user1, OrderValidatorAsUser);

    await expect(OrderValidatorAsUser.validate(order, signature, user1.address))
      .to.not.be.reverted;
  });

  it('should validate when open is disabled, partners is enabled and makeTokenAddress have PARTNER_ROLE', async function () {
    const {
      OrderValidatorAsUser,
      OrderValidatorAsAdmin,
      ERC20Contract,
      ERC721Contract,
      user1,
    } = await loadFixture(deployFixtures);

    expect(await OrderValidatorAsAdmin.open()).to.be.equal(true);
    expect(await OrderValidatorAsAdmin.partners()).to.be.equal(false);

    await OrderValidatorAsAdmin.setPermissions(false, true, false, false);

    expect(await OrderValidatorAsAdmin.open()).to.be.equal(false);
    expect(await OrderValidatorAsAdmin.partners()).to.be.equal(true);

    expect(
      await OrderValidatorAsUser.hasRole(
        PartnerRole,
        await ERC20Contract.getAddress()
      )
    ).to.be.equal(false);

    await OrderValidatorAsAdmin.grantRole(
      PartnerRole,
      await ERC20Contract.getAddress()
    );

    expect(
      await OrderValidatorAsUser.hasRole(
        PartnerRole,
        await ERC20Contract.getAddress()
      )
    ).to.be.equal(true);

    const makerAsset = await AssetERC20(ERC20Contract, 100);
    const takerAsset = await AssetERC721(ERC721Contract, 100);
    const order = await OrderDefault(
      user1,
      makerAsset,
      ZeroAddress,
      takerAsset,
      1,
      0,
      0
    );
    const signature = await signOrder(order, user1, OrderValidatorAsUser);

    await expect(OrderValidatorAsUser.validate(order, signature, user1.address))
      .to.not.be.reverted;
  });
});
