import {expect} from 'chai';
import {deployFixturesWithoutWhitelist} from '../fixtures/index.ts';
import {loadFixture} from '@nomicfoundation/hardhat-network-helpers';
import {Contract, Signer} from 'ethers';

// eslint-disable-next-line mocha/no-exports
export function checkAccessControl(
  functionName: string[],
  eventName: string[],
  userContract: string[],
  adminContract: string[]
) {
  describe('Access Control', function () {
    let ExchangeContractAsUser: Contract,
      ExchangeContractAsAdmin: Contract,
      user: Signer,
      contractMap: {[key: string]: Contract};

    beforeEach(async function () {
      ({ExchangeContractAsAdmin, ExchangeContractAsUser, user} =
        await loadFixture(deployFixturesWithoutWhitelist));
      contractMap = {
        ExchangeContractAsAdmin: ExchangeContractAsAdmin,
        ExchangeContractAsUser: ExchangeContractAsUser,
      };
    });
    // eslint-disable-next-line mocha/no-setup-in-describe
    for (let i = 0; i < functionName.length; i++) {
      it(`should not set ${functionName[i]} if caller is not in the role`, async function () {
        await expect(
          contractMap[userContract[i]][functionName[i]](user.getAddress())
        ).to.be.revertedWithCustomError(
          await contractMap[userContract[i]],
          'AccessControlUnauthorizedAccount'
        );
      });

      it(`should be able to ${functionName[i]}`, async function () {
        await expect(
          contractMap[adminContract[i]][functionName[i]](
            contractMap[adminContract[i]].getAddress()
          )
        ).to.emit(ExchangeContractAsAdmin, eventName[i]);
      });
    }
  });
}
