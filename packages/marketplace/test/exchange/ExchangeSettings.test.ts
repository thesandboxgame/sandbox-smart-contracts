/* eslint-disable mocha/no-setup-in-describe */
import {expect} from 'chai';
import {deployFixtures} from '../fixtures';
import {loadFixture} from '@nomicfoundation/hardhat-network-helpers';
import {ZeroAddress} from 'ethers';

describe('Exchange.sol settings', function () {
  it('should initialize the values correctly', async function () {
    const {
      protocolFeePrimary,
      protocolFeeSecondary,
      ExchangeContractAsAdmin,
      RoyaltyRegistry,
      assetMatcherAsUser,
      OrderValidatorAsDeployer,
      TrustedForwarder,
      defaultFeeReceiver,
    } = await loadFixture(deployFixtures);

    expect(await ExchangeContractAsAdmin.royaltiesRegistry()).to.be.equal(
      await RoyaltyRegistry.getAddress()
    );
    expect(await ExchangeContractAsAdmin.assetMatcher()).to.be.equal(
      await assetMatcherAsUser.getAddress()
    );
    expect(await ExchangeContractAsAdmin.orderValidator()).to.be.equal(
      await OrderValidatorAsDeployer.getAddress()
    );
    expect(await ExchangeContractAsAdmin.nativeMeta()).to.be.equal(true);
    expect(await ExchangeContractAsAdmin.nativeOrder()).to.be.equal(true);
    expect(await ExchangeContractAsAdmin.getTrustedForwarder()).to.be.equal(
      await TrustedForwarder.getAddress()
    );
    expect(await ExchangeContractAsAdmin.protocolFeePrimary()).to.be.equal(
      protocolFeePrimary
    );
    expect(await ExchangeContractAsAdmin.protocolFeeSecondary()).to.be.equal(
      protocolFeeSecondary
    );
    expect(await ExchangeContractAsAdmin.defaultFeeReceiver()).to.be.equal(
      await defaultFeeReceiver.getAddress()
    );
  });
  describe('roles', function () {
    describe('default admin', function () {
      checkPermsForDefaultAdmin('setRoyaltiesRegistry', 'RoyaltiesRegistrySet');
      checkPermsForDefaultAdmin('setAssetMatcherContract', 'AssetMatcherSet');
      checkPermsForDefaultAdmin(
        'setOrderValidatorContract',
        'OrderValidatorSet'
      );
      it('should update native order', async function () {
        const {ExchangeContractAsAdmin} = await loadFixture(deployFixtures);
        expect(await ExchangeContractAsAdmin.nativeMeta()).to.be.equal(true);
        expect(await ExchangeContractAsAdmin.nativeOrder()).to.be.equal(true);
        await expect(ExchangeContractAsAdmin.updateNative(false, false))
          .to.emit(ExchangeContractAsAdmin, 'NativeUpdated')
          .withArgs(false, false);
        expect(await ExchangeContractAsAdmin.nativeMeta()).to.be.equal(false);
        expect(await ExchangeContractAsAdmin.nativeOrder()).to.be.equal(false);
      });
      it('should not update native order if caller is not owner', async function () {
        const {DEFAULT_ADMIN_ROLE, ExchangeContractAsUser, user} =
          await loadFixture(deployFixtures);
        await expect(
          ExchangeContractAsUser.updateNative(false, false)
        ).to.be.revertedWith(
          `AccessControl: account ${user.address.toLowerCase()} is missing role ${DEFAULT_ADMIN_ROLE}`
        );
      });
      it('should not set trusted forwarder if caller is not owner', async function () {
        const {DEFAULT_ADMIN_ROLE, ExchangeContractAsUser, user} =
          await loadFixture(deployFixtures);
        await expect(
          ExchangeContractAsUser.setTrustedForwarder(user.address)
        ).to.be.revertedWith(
          `AccessControl: account ${user.address.toLowerCase()} is missing role ${DEFAULT_ADMIN_ROLE}`
        );
      });
      it('should set trusted forwarder', async function () {
        const {ExchangeContractAsAdmin, user} = await loadFixture(
          deployFixtures
        );
        await ExchangeContractAsAdmin.setTrustedForwarder(user.address);
        expect(await ExchangeContractAsAdmin.getTrustedForwarder()).to.be.equal(
          user.address
        );
      });
    });
    describe('exchange admin', function () {
      it('should not set setProtocolFee if caller is not owner', async function () {
        const {EXCHANGE_ADMIN_ROLE, ExchangeContractAsUser, user} =
          await loadFixture(deployFixtures);
        const newProtocolFeePrimary = 123;
        const newProtocolFeeSecondary = 321;
        await expect(
          ExchangeContractAsUser.setProtocolFee(
            newProtocolFeePrimary,
            newProtocolFeeSecondary
          )
        ).to.be.revertedWith(
          `AccessControl: account ${user.address.toLowerCase()} is missing role ${EXCHANGE_ADMIN_ROLE}`
        );
      });
      it('should be able to set setProtocolFee', async function () {
        const {
          EXCHANGE_ADMIN_ROLE,
          ExchangeContractAsAdmin,
          ExchangeContractAsUser,
          user,
        } = await loadFixture(deployFixtures);
        await ExchangeContractAsAdmin.grantRole(EXCHANGE_ADMIN_ROLE, user);
        const newProtocolFeePrimary = 123;
        const newProtocolFeeSecondary = 321;
        await expect(
          ExchangeContractAsUser.setProtocolFee(
            newProtocolFeePrimary,
            newProtocolFeeSecondary
          )
        )
          .to.emit(ExchangeContractAsAdmin, 'ProtocolFeeSet')
          .withArgs(newProtocolFeePrimary, newProtocolFeeSecondary);
      });
    });
    it('should not set setDefaultFeeReceiver if caller is not exchange admin', async function () {
      const {EXCHANGE_ADMIN_ROLE, ExchangeContractAsUser, user} =
        await loadFixture(deployFixtures);
      await expect(
        ExchangeContractAsUser.setDefaultFeeReceiver(user.address)
      ).to.be.revertedWith(
        `AccessControl: account ${user.address.toLowerCase()} is missing role ${EXCHANGE_ADMIN_ROLE}`
      );
    });
    it('should be able to set setDefaultFeeReceiver', async function () {
      const {
        EXCHANGE_ADMIN_ROLE,
        ExchangeContractAsAdmin,
        ExchangeContractAsUser,
        user,
      } = await loadFixture(deployFixtures);
      await ExchangeContractAsAdmin.grantRole(EXCHANGE_ADMIN_ROLE, user);
      await expect(ExchangeContractAsUser.setDefaultFeeReceiver(user.address))
        .to.emit(ExchangeContractAsAdmin, 'DefaultFeeReceiverSet')
        .withArgs(user.address);
    });
  });

  shouldNotBeAbleToSetAsZero(
    'setRoyaltiesRegistry',
    'invalid Royalties Registry'
  );
  shouldNotBeAbleToSetAsZero(
    'setAssetMatcherContract',
    'invalid asset matcher'
  );
  shouldNotBeAbleToSetAsZero(
    'setOrderValidatorContract',
    'invalid order validator'
  );
  it('should be able to set trusted forwarder as zero address to disable it', async function () {
    const {ExchangeContractAsAdmin, TrustedForwarder} = await loadFixture(
      deployFixtures
    );
    expect(await ExchangeContractAsAdmin.getTrustedForwarder()).to.be.equal(
      await TrustedForwarder.getAddress()
    );
    await ExchangeContractAsAdmin.setTrustedForwarder(ZeroAddress);
    expect(await ExchangeContractAsAdmin.getTrustedForwarder()).to.be.equal(
      ZeroAddress
    );
  });
  it('should not be able to setProtocolFee > 5000', async function () {
    const {EXCHANGE_ADMIN_ROLE, ExchangeContractAsUser, user} =
      await loadFixture(deployFixtures);
    const newProtocolFeePrimary = 123;
    const newProtocolFeeSecondary = 321;
    await expect(
      ExchangeContractAsUser.setProtocolFee(60000, newProtocolFeeSecondary)
    ).to.be.revertedWith(
      `AccessControl: account ${user.address.toLowerCase()} is missing role ${EXCHANGE_ADMIN_ROLE}`
    );
    await expect(
      ExchangeContractAsUser.setProtocolFee(newProtocolFeePrimary, 60000)
    ).to.be.revertedWith(
      `AccessControl: account ${user.address.toLowerCase()} is missing role ${EXCHANGE_ADMIN_ROLE}`
    );
  });
  it('should not set setDefaultFeeReceiver to address zero', async function () {
    const {
      EXCHANGE_ADMIN_ROLE,
      ExchangeContractAsAdmin,
      ExchangeContractAsUser,
      user,
    } = await loadFixture(deployFixtures);
    await ExchangeContractAsAdmin.grantRole(EXCHANGE_ADMIN_ROLE, user);
    await expect(
      ExchangeContractAsUser.setDefaultFeeReceiver(ZeroAddress)
    ).to.be.revertedWith('invalid default fee receiver');
  });
  it('should support interfaces', async function () {
    const {ExchangeContractAsAdmin} = await loadFixture(deployFixtures);
    const interfaces = {
      IERC165: '0x01ffc9a7',
      IAccessControl: '0x7965db0b',
      // IAccessControlEnumerable: '0x5a05180f',
    };
    for (const i of Object.values(interfaces)) {
      expect(await ExchangeContractAsAdmin.supportsInterface(i)).to.be.true;
    }
    // for coverage
    expect(await ExchangeContractAsAdmin.supportsInterface('0xffffffff')).to.be
      .false;
  });
});

function shouldNotBeAbleToSetAsZero(name, err) {
  it(`should not be able to ${name} as address zero`, async function () {
    const {ExchangeContractAsAdmin} = await loadFixture(deployFixtures);
    await expect(ExchangeContractAsAdmin[name](ZeroAddress)).to.revertedWith(
      err
    );
  });
}

function checkPermsForDefaultAdmin(name, eventName) {
  it(`should not set ${name} if caller is not owner`, async function () {
    const {DEFAULT_ADMIN_ROLE, ExchangeContractAsUser, user} =
      await loadFixture(deployFixtures);
    await expect(ExchangeContractAsUser[name](user.address)).to.be.revertedWith(
      `AccessControl: account ${user.address.toLowerCase()} is missing role ${DEFAULT_ADMIN_ROLE}`
    );
  });
  it(`should be able to ${name}`, async function () {
    const {ExchangeContractAsAdmin, user} = await loadFixture(deployFixtures);
    await expect(ExchangeContractAsAdmin[name](user.address))
      .to.emit(ExchangeContractAsAdmin, eventName)
      .withArgs(user.address);
  });
}