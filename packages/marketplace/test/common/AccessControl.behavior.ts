import {expect} from 'chai';
import {simpleDeployFixtures} from '../fixtures/index.ts';
import {loadFixture} from '@nomicfoundation/hardhat-network-helpers';
import {Contract, Signer} from 'ethers';

// eslint-disable-next-line mocha/no-exports
export function checkAccessControl(
  functionName: string[],
  eventName: string[],
  userContract: string[],
  adminContract: string[],
  role: string[]
) {
  describe('Access Control', function () {
    let ExchangeContractAsUser: Contract,
      ExchangeContractAsAdmin: Contract,
      user: Signer,
      DEFAULT_ADMIN_ROLE: string,
      contractMap: {[key: string]: Contract},
      roleMap: {[key: string]: string};

    beforeEach(async function () {
      ({
        ExchangeContractAsAdmin,
        ExchangeContractAsUser,
        user,
        DEFAULT_ADMIN_ROLE,
      } = await loadFixture(simpleDeployFixtures));
      contractMap = {
        ExchangeContractAsAdmin: ExchangeContractAsAdmin,
        ExchangeContractAsUser: ExchangeContractAsUser,
      };
      roleMap = {
        '0x00': DEFAULT_ADMIN_ROLE,
      };
    });
    // eslint-disable-next-line mocha/no-setup-in-describe
    for (let i = 0; i < functionName.length; i++) {
      it(`should not set ${functionName[i]} if caller is not in the role`, async function () {
        await expect(
          contractMap[userContract[i]][functionName[i]](user.getAddress())
        ).to.be.revertedWith(
          `AccessControl: account ${(
            await user.getAddress()
          ).toLowerCase()} is missing role ${roleMap[role[i]]}`
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
