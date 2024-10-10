import {expect} from 'chai';
import {deployFixturesWithoutWhitelist} from '../fixtures/index.ts';
import {loadFixture} from '@nomicfoundation/hardhat-network-helpers';
import {Contract, Signer} from 'ethers';

// eslint-disable-next-line mocha/no-exports
export function checkAccessControl(
  functionName: string[],
  eventName: string[],
  contractAddress: string[]
) {
  describe('Access Control', function () {
    let ExchangeContractAsAdmin: Contract,
      ExchangeContractAsUser: Contract,
      RoyaltiesRegistryAsUser: Contract,
      OrderValidatorAsUser: Contract,
      TrustedForwarderAsUser: Contract,
      user: Signer,
      DEFAULT_ADMIN_ROLE: string,
      contractMap: {[key: string]: Contract};

    beforeEach(async function () {
      ({
        ExchangeContractAsAdmin,
        ExchangeContractAsUser,
        RoyaltiesRegistryAsUser,
        OrderValidatorAsUser,
        TrustedForwarder2: TrustedForwarderAsUser,
        user,
        DEFAULT_ADMIN_ROLE,
      } = await loadFixture(deployFixturesWithoutWhitelist));
      contractMap = {
        ExchangeContractAsAdmin: ExchangeContractAsAdmin,
        ExchangeContractAsUser: ExchangeContractAsUser,
        RoyaltiesRegistryAsUser: RoyaltiesRegistryAsUser,
        OrderValidatorAsUser: OrderValidatorAsUser,
        TrustedForwarderAsUser: TrustedForwarderAsUser,
      };
    });
    // eslint-disable-next-line mocha/no-setup-in-describe
    for (let i = 0; i < functionName.length; i++) {
      it(`should not set ${functionName[i]} if caller is not in the role`, async function () {
        await expect(
          ExchangeContractAsUser[functionName[i]](user.getAddress())
        ).to.be.revertedWith(
          `AccessControl: account ${(
            await user.getAddress()
          ).toLowerCase()} is missing role ${DEFAULT_ADMIN_ROLE}`
        );
      });

      it(`should be able to ${functionName[i]}`, async function () {
        await expect(
          ExchangeContractAsAdmin[functionName[i]](
            contractMap[contractAddress[i]].getAddress()
          )
        ).to.emit(ExchangeContractAsAdmin, eventName[i]);
      });
    }
  });
}
