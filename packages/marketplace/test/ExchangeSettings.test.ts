/* eslint-disable mocha/no-setup-in-describe */
import {expect} from 'chai';
import {deployFixtures} from './fixtures';
import {loadFixture} from '@nomicfoundation/hardhat-network-helpers';
import {ZeroAddress} from 'ethers';
import {
  shouldSupportsInterface,
  shouldNotSupportsInterface,
} from './common/supportsInterface.behavior.ts';

describe('Exchange.sol settings', function () {
  it('should initialize the values correctly', async function () {
    const {
      protocolFeePrimary,
      protocolFeeSecondary,
      ExchangeContractAsAdmin,
      RoyaltiesRegistryAsDeployer,
      OrderValidatorAsAdmin,
      TrustedForwarder,
      defaultFeeReceiver,
    } = await loadFixture(deployFixtures);

    expect(await ExchangeContractAsAdmin.royaltiesRegistry()).to.be.equal(
      await RoyaltiesRegistryAsDeployer.getAddress()
    );
    expect(await ExchangeContractAsAdmin.orderValidator()).to.be.equal(
      await OrderValidatorAsAdmin.getAddress()
    );
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
      checkPermsForDefaultAdmin(
        'setOrderValidatorContract',
        'OrderValidatorSet'
      );

      it('should not set trusted forwarder if caller is not in the role', async function () {
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

    describe('pauser role', function () {
      it('should not pause if caller is not in the role', async function () {
        const {ExchangeContractAsUser, PAUSER_ROLE, user} = await loadFixture(
          deployFixtures
        );
        await expect(ExchangeContractAsUser.pause()).to.be.revertedWith(
          `AccessControl: account ${user.address.toLowerCase()} is missing role ${PAUSER_ROLE}`
        );
      });

      it('should be able to pause the contract', async function () {
        const {ExchangeContractAsAdmin, PAUSER_ROLE, user2} = await loadFixture(
          deployFixtures
        );
        await ExchangeContractAsAdmin.grantRole(PAUSER_ROLE, user2);
        expect(await ExchangeContractAsAdmin.paused()).to.be.false;
        await ExchangeContractAsAdmin.connect(user2).pause();
        expect(await ExchangeContractAsAdmin.paused()).to.be.true;
      });
    });

    describe('exchange admin', function () {
      it('should not set setProtocolFee if caller is not in the role', async function () {
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

      it('should not unpause if caller is not in the role', async function () {
        const {ExchangeContractAsUser, EXCHANGE_ADMIN_ROLE, user} =
          await loadFixture(deployFixtures);
        await expect(ExchangeContractAsUser.unpause()).to.be.revertedWith(
          `AccessControl: account ${user.address.toLowerCase()} is missing role ${EXCHANGE_ADMIN_ROLE}`
        );
      });

      it('should be able to unpause the contract', async function () {
        const {
          ExchangeContractAsAdmin,
          ExchangeContractAsUser,
          PAUSER_ROLE,
          EXCHANGE_ADMIN_ROLE,
          user,
          user2,
        } = await loadFixture(deployFixtures);
        await ExchangeContractAsAdmin.grantRole(PAUSER_ROLE, user2);
        await ExchangeContractAsAdmin.grantRole(EXCHANGE_ADMIN_ROLE, user);

        await ExchangeContractAsAdmin.connect(user2).pause();
        expect(await ExchangeContractAsAdmin.paused()).to.be.true;
        await ExchangeContractAsUser.unpause();
        expect(await ExchangeContractAsAdmin.paused()).to.be.false;
      });
    });

    it('should not set setDefaultFeeReceiver if caller is not in the role', async function () {
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

    it('should not set setMatchOrdersLimit if caller is not in the role', async function () {
      const {EXCHANGE_ADMIN_ROLE, ExchangeContractAsUser, user} =
        await loadFixture(deployFixtures);
      const newMatchOrdersLimit = 200;
      await expect(
        ExchangeContractAsUser.setMatchOrdersLimit(newMatchOrdersLimit)
      ).to.be.revertedWith(
        `AccessControl: account ${user.address.toLowerCase()} is missing role ${EXCHANGE_ADMIN_ROLE}`
      );
    });

    it('should be able to set setMatchOrdersLimit', async function () {
      const {
        EXCHANGE_ADMIN_ROLE,
        ExchangeContractAsAdmin,
        ExchangeContractAsUser,
        user,
      } = await loadFixture(deployFixtures);
      const newMatchOrdersLimit = 200;
      await ExchangeContractAsAdmin.grantRole(EXCHANGE_ADMIN_ROLE, user);
      await expect(
        ExchangeContractAsUser.setMatchOrdersLimit(newMatchOrdersLimit)
      )
        .to.emit(ExchangeContractAsAdmin, 'MatchOrdersLimitSet')
        .withArgs(newMatchOrdersLimit);
    });

    it('MatchOrdersLimit cannot be set to zero', async function () {
      const {
        EXCHANGE_ADMIN_ROLE,
        ExchangeContractAsAdmin,
        ExchangeContractAsUser,
        user,
      } = await loadFixture(deployFixtures);
      const newMatchOrdersLimit = 0;
      await ExchangeContractAsAdmin.grantRole(EXCHANGE_ADMIN_ROLE, user);
      await expect(
        ExchangeContractAsUser.setMatchOrdersLimit(newMatchOrdersLimit)
      ).to.be.revertedWith('invalid quantity');
    });
  });

  shouldNotBeAbleToSetAsZero(
    'setRoyaltiesRegistry',
    'invalid Royalties Registry'
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

  it('supportsInterface', async function () {
    const {ExchangeContractAsAdmin} = await loadFixture(deployFixtures);
    const interfaces = {
      IERC165: '0x01ffc9a7',
      IAccessControl: '0x7965db0b',
      IAccessControlEnumerable: '0x5a05180f',
    };

    await shouldSupportsInterface(function (interfaceId: string) {
      return ExchangeContractAsAdmin.supportsInterface(interfaceId);
    }, interfaces).then();

    await shouldNotSupportsInterface(function (interfaceId: string) {
      return ExchangeContractAsAdmin.supportsInterface(interfaceId);
    }).then();
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
  it(`should not set ${name} if caller is not in the role`, async function () {
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
