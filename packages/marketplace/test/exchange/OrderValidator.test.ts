import {deployFixtures} from '../fixtures';
import {loadFixture} from '@nomicfoundation/hardhat-network-helpers';
import {expect} from 'chai';
import {AssetERC20, AssetERC721} from '../utils/assets.ts';

import {OrderDefault} from '../utils/order.ts';
import {ZeroAddress} from 'ethers';
import {signOrder} from '../utils/signature';

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

  it('should verify ERC20 Whitelist', async function () {
    const {OrderValidatorAsUser, ERC20Contract} = await loadFixture(
      deployFixtures
    );
    await expect(
      OrderValidatorAsUser.verifyERC20Whitelist(
        await ERC20Contract.getAddress()
      )
    ).to.not.be.reverted;
  });

  it('should not set permission for token if caller is not owner', async function () {
    const {OrderValidatorAsUser} = await loadFixture(deployFixtures);
    await expect(
      OrderValidatorAsUser.setPermissions(true, true, true, true)
    ).to.revertedWith('Ownable: caller is not the owner');
  });

  it('should be able to set permission for token', async function () {
    const {OrderValidatorAsDeployer} = await loadFixture(deployFixtures);
    expect(await OrderValidatorAsDeployer.tsbOnly()).to.be.equal(false);
    expect(await OrderValidatorAsDeployer.partners()).to.be.equal(false);
    expect(await OrderValidatorAsDeployer.open()).to.be.equal(true);
    expect(await OrderValidatorAsDeployer.erc20List()).to.be.equal(false);

    await OrderValidatorAsDeployer.setPermissions(true, true, false, true);

    expect(await OrderValidatorAsDeployer.tsbOnly()).to.be.equal(true);
    expect(await OrderValidatorAsDeployer.partners()).to.be.equal(true);
    expect(await OrderValidatorAsDeployer.open()).to.be.equal(false);
    expect(await OrderValidatorAsDeployer.erc20List()).to.be.equal(true);
  });

  it('should not be able to add token to tsb list if caller is not owner', async function () {
    const {OrderValidatorAsUser, ERC20Contract} = await loadFixture(
      deployFixtures
    );
    await expect(
      OrderValidatorAsUser.addTSB(await ERC20Contract.getAddress())
    ).to.be.revertedWith('Ownable: caller is not the owner');
  });

  it('should be able to add token to tsb list', async function () {
    const {OrderValidatorAsDeployer, ERC20Contract} = await loadFixture(
      deployFixtures
    );
    expect(
      await OrderValidatorAsDeployer.hasRole(
        TSBRole,
        await ERC20Contract.getAddress()
      )
    ).to.be.equal(false);
    await OrderValidatorAsDeployer.addTSB(await ERC20Contract.getAddress());
    expect(
      await OrderValidatorAsDeployer.hasRole(
        TSBRole,
        await ERC20Contract.getAddress()
      )
    ).to.be.equal(true);
  });

  it('should not be able to remove token from tsb list if caller is not owner', async function () {
    const {OrderValidatorAsUser, ERC20Contract} = await loadFixture(
      deployFixtures
    );
    await expect(
      OrderValidatorAsUser.removeTSB(await ERC20Contract.getAddress())
    ).to.be.revertedWith('Ownable: caller is not the owner');
  });

  it('should be able to remove token from tsb list', async function () {
    const {OrderValidatorAsDeployer, ERC20Contract} = await loadFixture(
      deployFixtures
    );
    expect(
      await OrderValidatorAsDeployer.hasRole(
        TSBRole,
        await ERC20Contract.getAddress()
      )
    ).to.be.equal(false);
    await OrderValidatorAsDeployer.addTSB(await ERC20Contract.getAddress());
    expect(
      await OrderValidatorAsDeployer.hasRole(
        TSBRole,
        await ERC20Contract.getAddress()
      )
    ).to.be.equal(true);

    await OrderValidatorAsDeployer.removeTSB(await ERC20Contract.getAddress());
    expect(
      await OrderValidatorAsDeployer.hasRole(
        TSBRole,
        await ERC20Contract.getAddress()
      )
    ).to.be.equal(false);
  });

  it('should not be able to add token to partners list if caller is not owner', async function () {
    const {OrderValidatorAsUser, ERC20Contract} = await loadFixture(
      deployFixtures
    );
    await expect(
      OrderValidatorAsUser.addPartner(await ERC20Contract.getAddress())
    ).to.be.revertedWith('Ownable: caller is not the owner');
  });

  it('should be able to add token to partners list', async function () {
    const {OrderValidatorAsDeployer, ERC20Contract} = await loadFixture(
      deployFixtures
    );
    expect(
      await OrderValidatorAsDeployer.hasRole(
        PartnerRole,
        await ERC20Contract.getAddress()
      )
    ).to.be.equal(false);
    await OrderValidatorAsDeployer.addPartner(await ERC20Contract.getAddress());
    expect(
      await OrderValidatorAsDeployer.hasRole(
        PartnerRole,
        await ERC20Contract.getAddress()
      )
    ).to.be.equal(true);
  });

  it('should not be able to remove token from partners list if caller is not owner', async function () {
    const {OrderValidatorAsUser, ERC20Contract} = await loadFixture(
      deployFixtures
    );
    await expect(
      OrderValidatorAsUser.removePartner(await ERC20Contract.getAddress())
    ).to.be.revertedWith('Ownable: caller is not the owner');
  });

  it('should be able to remove token from partners list', async function () {
    const {OrderValidatorAsDeployer, ERC20Contract} = await loadFixture(
      deployFixtures
    );
    expect(
      await OrderValidatorAsDeployer.hasRole(
        PartnerRole,
        await ERC20Contract.getAddress()
      )
    ).to.be.equal(false);
    await OrderValidatorAsDeployer.addPartner(await ERC20Contract.getAddress());
    expect(
      await OrderValidatorAsDeployer.hasRole(
        PartnerRole,
        await ERC20Contract.getAddress()
      )
    ).to.be.equal(true);

    await OrderValidatorAsDeployer.removePartner(
      await ERC20Contract.getAddress()
    );
    expect(
      await OrderValidatorAsDeployer.hasRole(
        PartnerRole,
        await ERC20Contract.getAddress()
      )
    ).to.be.equal(false);
  });

  it('should not be able to add token to ERC20 list if caller is not owner', async function () {
    const {OrderValidatorAsUser, ERC20Contract} = await loadFixture(
      deployFixtures
    );

    await expect(
      OrderValidatorAsUser.addERC20(await ERC20Contract.getAddress())
    ).to.be.revertedWith('Ownable: caller is not the owner');
  });

  it('should be able to add token to ERC20 list', async function () {
    const {OrderValidatorAsDeployer, ERC20Contract} = await loadFixture(
      deployFixtures
    );
    expect(
      await OrderValidatorAsDeployer.hasRole(
        ERC20Role,
        await ERC20Contract.getAddress()
      )
    ).to.be.equal(false);
    await OrderValidatorAsDeployer.addERC20(await ERC20Contract.getAddress());
    expect(
      await OrderValidatorAsDeployer.hasRole(
        ERC20Role,
        await ERC20Contract.getAddress()
      )
    ).to.be.equal(true);
  });

  it('should not be able to remove token from ERC20 list if caller is not owner', async function () {
    const {OrderValidatorAsUser, ERC20Contract} = await loadFixture(
      deployFixtures
    );
    await expect(
      OrderValidatorAsUser.removeERC20(await ERC20Contract.getAddress())
    ).to.be.revertedWith('Ownable: caller is not the owner');
  });

  it('should be able to remove token from ERC20 list', async function () {
    const {OrderValidatorAsDeployer, ERC20Contract} = await loadFixture(
      deployFixtures
    );
    expect(
      await OrderValidatorAsDeployer.hasRole(
        ERC20Role,
        await ERC20Contract.getAddress()
      )
    ).to.be.equal(false);
    await OrderValidatorAsDeployer.addERC20(await ERC20Contract.getAddress());
    expect(
      await OrderValidatorAsDeployer.hasRole(
        ERC20Role,
        await ERC20Contract.getAddress()
      )
    ).to.be.equal(true);

    await OrderValidatorAsDeployer.removeERC20(
      await ERC20Contract.getAddress()
    );
    expect(
      await OrderValidatorAsDeployer.hasRole(
        ERC20Role,
        await ERC20Contract.getAddress()
      )
    ).to.be.equal(false);
  });
});
