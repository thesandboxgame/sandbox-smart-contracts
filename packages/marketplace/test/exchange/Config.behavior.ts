/* eslint-disable mocha/no-setup-in-describe */
import {expect} from 'chai';
import {deployFixturesWithoutWhitelist} from '../fixtures';
import {loadFixture} from '@nomicfoundation/hardhat-network-helpers';
import {ZeroAddress, Contract, Signer} from 'ethers';
import {checkAccessControl} from '../common/AccessControl.behavior';

// eslint-disable-next-line mocha/no-exports
export function exchangeConfig() {
  describe('Exchange settings', function () {
    let ExchangeContractAsUser: Contract,
      ExchangeContractAsAdmin: Contract,
      TrustedForwarder: Contract,
      user: Signer,
      user2: Signer,
      EXCHANGE_ADMIN_ROLE: string,
      PAUSER_ROLE: string;

    beforeEach(async function () {
      ({
        ExchangeContractAsUser,
        ExchangeContractAsAdmin,
        TrustedForwarder,
        user,
        user2,
        EXCHANGE_ADMIN_ROLE,
        PAUSER_ROLE,
      } = await loadFixture(deployFixturesWithoutWhitelist));
    });

    describe('roles', function () {
      describe('default admin', function () {
        checkAccessControl(
          [
            // TODO: new tests for setRoyaltiesRegistry and setOrderValidatorContract with correct contracts supporting interfaces
            // 'setRoyaltiesRegistry',
            // 'setOrderValidatorContract',
            'setTrustedForwarder',
          ],
          [
            // 'RoyaltiesRegistrySet',
            // 'OrderValidatorSet',
            'TrustedForwarderSet',
          ],
          [
            // 'ExchangeContractAsUser',
            // 'ExchangeContractAsUser',
            'ExchangeContractAsUser',
          ],
          [
            // 'ExchangeContractAsAdmin',
            // 'ExchangeContractAsAdmin',
            'ExchangeContractAsAdmin',
          ],
          [
            // '0x00',
            // '0x00',
            '0x00',
          ]
        );

        it('should be able to set trusted forwarder as zero address to disable it', async function () {
          expect(
            await ExchangeContractAsAdmin.getTrustedForwarder()
          ).to.be.equal(await TrustedForwarder.getAddress());
          await ExchangeContractAsAdmin.setTrustedForwarder(ZeroAddress);
          expect(
            await ExchangeContractAsAdmin.getTrustedForwarder()
          ).to.be.equal(ZeroAddress);
        });
      });

      describe('pauser role', function () {
        it('should not pause if caller is not in the role', async function () {
          await expect(
            ExchangeContractAsUser.pause()
          ).to.be.revertedWithCustomError(
            ExchangeContractAsUser,
            'AccessControlUnauthorizedAccount'
          );
        });

        it('should be able to pause the contract', async function () {
          await ExchangeContractAsAdmin.grantRole(PAUSER_ROLE, user2);
          expect(await ExchangeContractAsAdmin.paused()).to.be.false;
          await ExchangeContractAsAdmin.connect(user2).pause();
          expect(await ExchangeContractAsAdmin.paused()).to.be.true;
        });
      });

      describe('exchange admin', function () {
        it('should not set setProtocolFee if caller is not in the role', async function () {
          const newProtocolFeePrimary = 123;
          const newProtocolFeeSecondary = 321;
          await expect(
            ExchangeContractAsUser.setProtocolFee(
              newProtocolFeePrimary,
              newProtocolFeeSecondary
            )
          ).to.be.revertedWithCustomError(
            ExchangeContractAsUser,
            'AccessControlUnauthorizedAccount'
          );
        });

        it('should be able to set setProtocolFee', async function () {
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
          const {ExchangeContractAsUser} = await loadFixture(
            deployFixturesWithoutWhitelist
          );
          await expect(
            ExchangeContractAsUser.unpause()
          ).to.be.revertedWithCustomError(
            ExchangeContractAsUser,
            'AccessControlUnauthorizedAccount'
          );
        });

        it('should be able to unpause the contract', async function () {
          await ExchangeContractAsAdmin.grantRole(PAUSER_ROLE, user2);
          await ExchangeContractAsAdmin.grantRole(EXCHANGE_ADMIN_ROLE, user);

          await ExchangeContractAsAdmin.connect(user2).pause();
          expect(await ExchangeContractAsAdmin.paused()).to.be.true;
          await ExchangeContractAsUser.unpause();
          expect(await ExchangeContractAsAdmin.paused()).to.be.false;
        });
      });

      it('should not set setDefaultFeeReceiver if caller is not in the role', async function () {
        await expect(
          ExchangeContractAsUser.setDefaultFeeReceiver(user.getAddress())
        ).to.be.revertedWithCustomError(
          ExchangeContractAsUser,
          'AccessControlUnauthorizedAccount'
        );
      });

      it('should not set setDefaultFeeReceiver to address zero', async function () {
        await ExchangeContractAsAdmin.grantRole(EXCHANGE_ADMIN_ROLE, user);
        await expect(
          ExchangeContractAsUser.setDefaultFeeReceiver(ZeroAddress)
        ).to.be.revertedWith('invalid default fee receiver');
      });

      it('should be able to set setDefaultFeeReceiver', async function () {
        await ExchangeContractAsAdmin.grantRole(EXCHANGE_ADMIN_ROLE, user);
        await expect(
          ExchangeContractAsUser.setDefaultFeeReceiver(user.getAddress())
        )
          .to.emit(ExchangeContractAsAdmin, 'DefaultFeeReceiverSet')
          .withArgs(await user.getAddress());
      });

      it('should not set setMatchOrdersLimit if caller is not in the role', async function () {
        await loadFixture(deployFixturesWithoutWhitelist);
        const newMatchOrdersLimit = 200;
        await expect(
          ExchangeContractAsUser.setMatchOrdersLimit(newMatchOrdersLimit)
        ).to.be.revertedWithCustomError(
          ExchangeContractAsUser,
          'AccessControlUnauthorizedAccount'
        );
      });

      it('should be able to set setMatchOrdersLimit', async function () {
        const newMatchOrdersLimit = 200;
        await ExchangeContractAsAdmin.grantRole(EXCHANGE_ADMIN_ROLE, user);
        await expect(
          ExchangeContractAsUser.setMatchOrdersLimit(newMatchOrdersLimit)
        )
          .to.emit(ExchangeContractAsAdmin, 'MatchOrdersLimitSet')
          .withArgs(newMatchOrdersLimit);
      });

      it('MatchOrdersLimit cannot be set to zero', async function () {
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
  });
}

function shouldNotBeAbleToSetAsZero(name, err) {
  it(`should not be able to ${name} as address zero`, async function () {
    const {ExchangeContractAsAdmin} = await loadFixture(
      deployFixturesWithoutWhitelist
    );
    await expect(ExchangeContractAsAdmin[name](ZeroAddress)).to.revertedWith(
      err
    );
  });
}
