import {
  deployFixturesWithoutWhitelist,
  deployFixtures,
} from './fixtures/index.ts';
import {orderValidatorFailSetup} from './fixtures/orderValidator';
import {loadFixture} from '@nomicfoundation/hardhat-network-helpers';
import {expect} from 'chai';
import {AssetERC20, AssetERC721} from './utils/assets.ts';
import {upgrades} from 'hardhat';
import {OrderDefault, signOrder} from './utils/order.ts';
import {Contract, Signer, ZeroAddress} from 'ethers';

import {shouldSupportInterfaces} from './common/SupportsInterface.behavior.ts';

// keccak256("TSB_ROLE")
const TSBRole =
  '0x6278160ef7ca8a5eb8e5b274bcc0427c2cc7e12eee2a53c5989a1afb360f6404';
// keccak256("PARTNER_ROLE")
const PartnerRole =
  '0x2f049b28665abd79bc83d9aa564dba6b787ac439dba27b48e163a83befa9b260';
// keccak256("ERC20_ROLE")
const ERC20Role =
  '0x839f6f26c78a3e8185d8004defa846bd7b66fef8def9b9f16459a6ebf2502162';

describe('OrderValidator.sol', function () {
  let OrderValidatorAsDeployer: Contract,
    OrderValidatorAsAdmin: Contract,
    OrderValidatorAsUser: Contract,
    OrderValidatorUpgradeMock: Contract,
    ERC20Contract: Contract,
    ERC721Contract: Contract,
    ERC1271Contract: Contract,
    user: Signer,
    user1: Signer,
    user2: Signer;

  beforeEach(async function () {
    ({
      OrderValidatorAsDeployer,
      OrderValidatorAsAdmin,
      OrderValidatorAsUser,
      OrderValidatorUpgradeMock,
      ERC20Contract,
      ERC721Contract,
      ERC1271Contract,
      user,
      user1,
      user2,
    } = await loadFixture(deployFixturesWithoutWhitelist));
  });

  it('initialization should fail if roles and permissions lenghts are different', async function () {
    await expect(orderValidatorFailSetup()).to.be.revertedWith(
      'Mismatched input lengths'
    );
  });

  it('should upgrade the contract successfully', async function () {
    const isWhitelistsEnabled =
      await OrderValidatorAsDeployer.isWhitelistsEnabled();

    const upgraded = await upgrades.upgradeProxy(
      await OrderValidatorAsDeployer.getAddress(),
      OrderValidatorUpgradeMock
    );

    expect(await upgraded.isWhitelistsEnabled()).to.be.equal(
      isWhitelistsEnabled
    );
  });

  it('should validate when assetClass is not ETH_ASSET_CLASS', async function () {
    await OrderValidatorAsAdmin.grantRole(
      ERC20Role,
      await ERC20Contract.getAddress()
    );

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

    await expect(
      OrderValidatorAsUser.validate(order, signature, await user1.getAddress())
    ).to.not.be.reverted;
  });

  it('should revert validate when salt is zero and Order maker is not sender', async function () {
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
      OrderValidatorAsUser.validate(order, signature, user2.getAddress())
    ).to.be.revertedWith('maker is not tx sender');
  });

  it('should validate when salt is zero and Order maker is sender', async function () {
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
      OrderValidatorAsUser.validate(order, signature, user1.getAddress())
    ).to.not.be.reverted;
  });

  it('should validate when salt is non zero and Order maker is sender', async function () {
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

    await expect(
      OrderValidatorAsUser.validate(order, signature, user1.getAddress())
    ).to.not.be.reverted;
  });

  it('should not validate when maker is address zero', async function () {
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
      OrderValidatorAsUser.validate(order, signature, user2.getAddress())
    ).to.be.revertedWith('no maker');
  });

  it('should not validate when sender and signature signer is not Order maker', async function () {
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
      OrderValidatorAsUser.validate(order, signature, user2.getAddress())
    ).to.be.revertedWith('signature verification error');
  });

  it('should validate when sender is not Order maker but signature signer is Order maker', async function () {
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

    await expect(
      OrderValidatorAsUser.validate(order, signature, user2.getAddress())
    ).to.not.be.reverted;
  });

  it('should validate when order maker is contract and sender', async function () {
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
      OrderValidatorAsUser.validate(order, '0x', user1.getAddress())
    ).to.be.revertedWith('signature verification error');
  });

  it('should validate when maker is contract but not sender and isValidSignature returns magic value', async function () {
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
    await expect(OrderValidatorAsUser.validate(order, '0x', user1.getAddress()))
      .to.not.be.reverted;
  });

  it('should validate when whitelist is enabled, TSB_ROLE is enabled and makeTokenAddress have TSB_ROLE', async function () {
    const {
      OrderValidatorAsUser,
      OrderValidatorAsAdmin,
      ERC20Contract,
      ERC721Contract,
      user1,
    } = await loadFixture(deployFixtures);

    expect(await OrderValidatorAsAdmin.isWhitelistsEnabled()).to.be.equal(
      false
    );
    expect(await OrderValidatorAsAdmin.isRoleEnabled(TSBRole)).to.be.equal(
      false
    );

    await OrderValidatorAsAdmin.enableRole(TSBRole);
    await OrderValidatorAsAdmin.enableWhitelists();
    expect(await OrderValidatorAsAdmin.isWhitelistsEnabled()).to.be.equal(true);
    expect(await OrderValidatorAsAdmin.isRoleEnabled(TSBRole)).to.be.equal(
      true
    );

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

    await expect(
      OrderValidatorAsUser.validate(order, signature, user1.getAddress())
    ).to.not.be.reverted;
  });

  it('should not validate if recipient is changed after signature', async function () {
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

    const newOrder = await OrderDefault(
      user1,
      makerAsset,
      ZeroAddress,
      takerAsset,
      1,
      0,
      0,
      await user2.getAddress()
    );

    await expect(
      OrderValidatorAsUser.validate(newOrder, signature, user2.getAddress())
    ).to.be.revertedWith('signature verification error');
  });

  it('should not set permission for token if caller is not owner', async function () {
    await expect(OrderValidatorAsUser.enableRole(TSBRole)).to.revertedWith(
      `AccessControl: account ${(
        await user.getAddress()
      ).toLowerCase()} is missing role 0x0000000000000000000000000000000000000000000000000000000000000000`
    );
  });

  it('should be able to set permission for token', async function () {
    expect(await OrderValidatorAsAdmin.isRoleEnabled(TSBRole)).to.be.equal(
      false
    );
    expect(await OrderValidatorAsAdmin.isRoleEnabled(PartnerRole)).to.be.equal(
      false
    );
    expect(await OrderValidatorAsAdmin.isWhitelistsEnabled()).to.be.equal(
      false
    );

    await OrderValidatorAsAdmin.setRolesEnabled(
      [TSBRole, PartnerRole],
      [true, true]
    );
    await OrderValidatorAsAdmin.enableWhitelists();

    expect(await OrderValidatorAsAdmin.isRoleEnabled(TSBRole)).to.be.equal(
      true
    );
    expect(await OrderValidatorAsAdmin.isRoleEnabled(PartnerRole)).to.be.equal(
      true
    );
    expect(await OrderValidatorAsAdmin.isWhitelistsEnabled()).to.be.equal(true);
  });

  it('should not be able to add token to tsb list if caller is not owner', async function () {
    await expect(
      OrderValidatorAsUser.grantRole(TSBRole, await ERC20Contract.getAddress())
    ).to.be.revertedWith(
      `AccessControl: account ${(
        await user.getAddress()
      ).toLowerCase()} is missing role 0x0000000000000000000000000000000000000000000000000000000000000000`
    );
  });

  it('should be able to add token to tsb list', async function () {
    expect(
      await OrderValidatorAsAdmin.hasRole(
        TSBRole,
        await ERC20Contract.getAddress()
      )
    ).to.be.equal(false);
    await OrderValidatorAsAdmin.grantRole(
      TSBRole,
      await ERC20Contract.getAddress()
    );
    expect(
      await OrderValidatorAsAdmin.hasRole(
        TSBRole,
        await ERC20Contract.getAddress()
      )
    ).to.be.equal(true);
  });

  it('should not be able to remove token from tsb list if caller is not owner', async function () {
    await expect(
      OrderValidatorAsUser.revokeRole(TSBRole, await ERC20Contract.getAddress())
    ).to.be.revertedWith(
      `AccessControl: account ${(
        await user.getAddress()
      ).toLowerCase()} is missing role 0x0000000000000000000000000000000000000000000000000000000000000000`
    );
  });

  it('should be able to remove token from tsb list', async function () {
    expect(
      await OrderValidatorAsAdmin.hasRole(
        TSBRole,
        await ERC20Contract.getAddress()
      )
    ).to.be.equal(false);
    await OrderValidatorAsAdmin.grantRole(
      TSBRole,
      await ERC20Contract.getAddress()
    );
    expect(
      await OrderValidatorAsAdmin.hasRole(
        TSBRole,
        await ERC20Contract.getAddress()
      )
    ).to.be.equal(true);

    await OrderValidatorAsAdmin.revokeRole(
      TSBRole,
      await ERC20Contract.getAddress()
    );
    expect(
      await OrderValidatorAsAdmin.hasRole(
        TSBRole,
        await ERC20Contract.getAddress()
      )
    ).to.be.equal(false);
  });

  it('should not be able to add token to partners list if caller is not owner', async function () {
    await expect(
      OrderValidatorAsUser.grantRole(
        PartnerRole,
        await ERC20Contract.getAddress()
      )
    ).to.be.revertedWith(
      `AccessControl: account ${(
        await user.getAddress()
      ).toLowerCase()} is missing role 0x0000000000000000000000000000000000000000000000000000000000000000`
    );
  });

  it('should be able to add token to partners list', async function () {
    expect(
      await OrderValidatorAsAdmin.hasRole(
        PartnerRole,
        await ERC20Contract.getAddress()
      )
    ).to.be.equal(false);
    await OrderValidatorAsAdmin.grantRole(
      PartnerRole,
      await ERC20Contract.getAddress()
    );
    expect(
      await OrderValidatorAsAdmin.hasRole(
        PartnerRole,
        await ERC20Contract.getAddress()
      )
    ).to.be.equal(true);
  });

  it('should not be able to remove token from partners list if caller is not owner', async function () {
    await expect(
      OrderValidatorAsUser.revokeRole(
        PartnerRole,
        await ERC20Contract.getAddress()
      )
    ).to.be.revertedWith(
      `AccessControl: account ${(
        await user.getAddress()
      ).toLowerCase()} is missing role 0x0000000000000000000000000000000000000000000000000000000000000000`
    );
  });

  it('should be able to remove token from partners list', async function () {
    expect(
      await OrderValidatorAsAdmin.hasRole(
        PartnerRole,
        await ERC20Contract.getAddress()
      )
    ).to.be.equal(false);
    await OrderValidatorAsAdmin.grantRole(
      PartnerRole,
      await ERC20Contract.getAddress()
    );
    expect(
      await OrderValidatorAsAdmin.hasRole(
        PartnerRole,
        await ERC20Contract.getAddress()
      )
    ).to.be.equal(true);

    await OrderValidatorAsAdmin.revokeRole(
      PartnerRole,
      await ERC20Contract.getAddress()
    );
    expect(
      await OrderValidatorAsAdmin.hasRole(
        PartnerRole,
        await ERC20Contract.getAddress()
      )
    ).to.be.equal(false);
  });

  it('should not be able to add token to ERC20 list if caller is not owner', async function () {
    await expect(
      OrderValidatorAsUser.grantRole(
        ERC20Role,
        await ERC20Contract.getAddress()
      )
    ).to.be.revertedWith(
      `AccessControl: account ${(
        await user.getAddress()
      ).toLowerCase()} is missing role 0x0000000000000000000000000000000000000000000000000000000000000000`
    );
  });

  it('should be able to add token to ERC20 list', async function () {
    expect(
      await OrderValidatorAsAdmin.hasRole(
        ERC20Role,
        await ERC20Contract.getAddress()
      )
    ).to.be.equal(false);
    await OrderValidatorAsAdmin.grantRole(
      ERC20Role,
      await ERC20Contract.getAddress()
    );
    expect(
      await OrderValidatorAsAdmin.hasRole(
        ERC20Role,
        await ERC20Contract.getAddress()
      )
    ).to.be.equal(true);
  });

  it('should not be able to remove token from ERC20 list if caller is not owner', async function () {
    await expect(
      OrderValidatorAsUser.revokeRole(
        ERC20Role,
        await ERC20Contract.getAddress()
      )
    ).to.be.revertedWith(
      `AccessControl: account ${(
        await user.getAddress()
      ).toLowerCase()} is missing role 0x0000000000000000000000000000000000000000000000000000000000000000`
    );
  });

  it('should be able to remove token from ERC20 list', async function () {
    expect(
      await OrderValidatorAsAdmin.hasRole(
        ERC20Role,
        await ERC20Contract.getAddress()
      )
    ).to.be.equal(false);
    await OrderValidatorAsAdmin.grantRole(
      ERC20Role,
      await ERC20Contract.getAddress()
    );
    expect(
      await OrderValidatorAsAdmin.hasRole(
        ERC20Role,
        await ERC20Contract.getAddress()
      )
    ).to.be.equal(true);

    await OrderValidatorAsAdmin.revokeRole(
      ERC20Role,
      await ERC20Contract.getAddress()
    );
    expect(
      await OrderValidatorAsAdmin.hasRole(
        ERC20Role,
        await ERC20Contract.getAddress()
      )
    ).to.be.equal(false);
  });

  // eslint-disable-next-line mocha/no-setup-in-describe
  shouldSupportInterfaces(
    function (interfaceId: string) {
      return OrderValidatorAsAdmin.supportsInterface(interfaceId);
    },
    {
      IERC165: '0x01ffc9a7',
      IAccessControl: '0x7965db0b',
      IAccessControlEnumerable: '0x5a05180f',
    }
  );
});
