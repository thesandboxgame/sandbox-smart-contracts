import {royaltyAmount} from '../../deploy/300_catalyst/302_catalyst_setup';
import {expect} from 'chai';
import {withSnapshot} from '../../utils/testUtils';

const setupTest = withSnapshot(
  ['OperatorFilterCatalystSubscription', 'Catalyst'],
  async ({deployments, getNamedAccounts, ethers}) => {
    const {catalystAdmin, catalystMinter} = await getNamedAccounts();

    const OperatorFilterRegistry = await deployments.get(
      'OperatorFilterRegistry'
    );
    const OperatorFilterRegistryContract = await ethers.getContractAt(
      OperatorFilterRegistry.abi,
      OperatorFilterRegistry.address
    );

    const OperatorFilterCatalystSubscription = await deployments.get(
      'OperatorFilterCatalystSubscription'
    );

    const Catalyst = await deployments.get('Catalyst');
    const CatalystContract = await ethers.getContractAt(
      Catalyst.abi,
      Catalyst.address
    );

    const RoyaltyManager = await deployments.get('RoyaltyManager');
    const RoyaltyManagerContract = await ethers.getContractAt(
      RoyaltyManager.abi,
      RoyaltyManager.address
    );
    const TRUSTED_FORWARDER_Data = await deployments.get(
      'TRUSTED_FORWARDER_V2'
    );
    const TRUSTED_FORWARDER = await ethers.getContractAt(
      TRUSTED_FORWARDER_Data.abi,
      TRUSTED_FORWARDER_Data.address
    );

    return {
      CatalystContract,
      OperatorFilterCatalystSubscription,
      RoyaltyManagerContract,
      catalystAdmin,
      TRUSTED_FORWARDER,
      OperatorFilterRegistryContract,
      catalystMinter,
    };
  }
);

describe('Catalyst', function () {
  describe('check roles', function () {
    it('admin', async function () {
      const {CatalystContract, catalystAdmin} = await setupTest();
      const defaultAdminRole = await CatalystContract.DEFAULT_ADMIN_ROLE();
      expect(
        await CatalystContract.hasRole(defaultAdminRole, catalystAdmin)
      ).to.be.equals(true);
    });
    it('minter', async function () {
      const {CatalystContract, catalystMinter} = await setupTest();
      const minterRole = await CatalystContract.MINTER_ROLE();
      expect(
        await CatalystContract.hasRole(minterRole, catalystMinter)
      ).to.be.equals(true);
    });
  });
  describe('Check Royalty', function () {
    it('RoyaltyManager contract is set correctly', async function () {
      const {CatalystContract, RoyaltyManagerContract} = await setupTest();
      expect(await CatalystContract.getRoyaltyManager()).to.be.equal(
        RoyaltyManagerContract.address
      );
    });
    it('Contract is registered on RoyaltyManager', async function () {
      const {CatalystContract, RoyaltyManagerContract} = await setupTest();
      expect(
        await RoyaltyManagerContract.getContractRoyalty(
          CatalystContract.address
        )
      ).to.be.equal(royaltyAmount);
    });
  });
  describe('Operator Filter Registry', function () {
    it('catalyst contract is registered correctly', async function () {
      const {OperatorFilterRegistryContract, CatalystContract} =
        await setupTest();
      expect(
        await OperatorFilterRegistryContract.isRegistered(
          CatalystContract.address
        )
      ).to.be.true;
    });
    it('catalyst contract is subscribed to correct address', async function () {
      const {
        OperatorFilterRegistryContract,
        CatalystContract,
        OperatorFilterCatalystSubscription,
      } = await setupTest();
      expect(
        await OperatorFilterRegistryContract.subscriptionOf(
          CatalystContract.address
        )
      ).to.be.equal(OperatorFilterCatalystSubscription.address);
    });
  });
  describe('Trusted Forwarder', function () {
    it('Trusted forwarder address is set correctly', async function () {
      const {CatalystContract, TRUSTED_FORWARDER} = await setupTest();
      expect(await CatalystContract.getTrustedForwarder()).to.be.equal(
        TRUSTED_FORWARDER.address
      );
    });
  });
});
