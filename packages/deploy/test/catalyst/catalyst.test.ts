import {royaltyAmount} from '../../deploy/300_catalyst/302_catalyst_setup';
import {
  DEFAULT_SUBSCRIPTION,
  OPERATOR_FILTER_REGISTRY,
} from './../../../asset/data/constants';
import {expect} from 'chai';
import {OperatorFilterRegistryBytecode} from '../../utils/bytecodes';
import {OperatorFilterRegistry_ABI} from '../../utils/abi';
import {deployments} from 'hardhat';

const setupTest = deployments.createFixture(
  async ({deployments, network, getNamedAccounts, ethers}) => {
    async function getEthersContract(name: string) {
      const contract = await deployments.get(name);
      return await ethers.getContractAt(contract.abi, contract.address);
    }

    const {catalystAdmin, catalystMinter, sandAdmin} = await getNamedAccounts();

    await network.provider.send('hardhat_setCode', [
      OPERATOR_FILTER_REGISTRY,
      OperatorFilterRegistryBytecode,
    ]);
    const OperatorFilterRegistryContract = await ethers.getContractAt(
      OperatorFilterRegistry_ABI,
      OPERATOR_FILTER_REGISTRY
    );

    await network.provider.send('hardhat_setBalance', [
      DEFAULT_SUBSCRIPTION,
      '0xDE0B6B3A7640000',
    ]);

    await network.provider.request({
      method: 'hardhat_impersonateAccount',
      params: [DEFAULT_SUBSCRIPTION],
    });

    const defaultSubscriptionSigner = await ethers.getSigner(
      DEFAULT_SUBSCRIPTION
    );

    if (
      !(await OperatorFilterRegistryContract.isRegistered(DEFAULT_SUBSCRIPTION))
    ) {
      await OperatorFilterRegistryContract.connect(
        defaultSubscriptionSigner
      ).register(DEFAULT_SUBSCRIPTION);
    }

    await network.provider.request({
      method: 'hardhat_stopImpersonatingAccount',
      params: [DEFAULT_SUBSCRIPTION],
    });

    await deployments.fixture([
      'MockERC1155MarketPlace1',
      'MockERC1155MarketPlace2',
      'MockERC1155MarketPlace3',
      'MockERC1155MarketPlace4',
      'OperatorFilterCatalystSubscription',
      'Catalyst',
    ]);

    const OperatorFilterCatalystSubscription = await getEthersContract(
      'OperatorFilterCatalystSubscription'
    );

    const MockERC1155MarketPlace1 = await getEthersContract(
      'MockERC1155MarketPlace1'
    );
    const MockERC1155MarketPlace2 = await getEthersContract(
      'MockERC1155MarketPlace2'
    );
    const MockERC1155MarketPlace3 = await getEthersContract(
      'MockERC1155MarketPlace3'
    );
    const MockERC1155MarketPlace4 = await getEthersContract(
      'MockERC1155MarketPlace4'
    );

    const subscriptionOwner = await ethers.getSigner(sandAdmin);

    const MockMarketPlace1CodeHash =
      await OperatorFilterRegistryContract.codeHashOf(MockERC1155MarketPlace1);
    const MockMarketPlace2CodeHash =
      await OperatorFilterRegistryContract.codeHashOf(MockERC1155MarketPlace2);

    const tx2 = await OperatorFilterRegistryContract.connect(
      subscriptionOwner
    ).updateOperators(
      OperatorFilterCatalystSubscription,
      [MockERC1155MarketPlace1, MockERC1155MarketPlace2],
      true
    );
    await tx2.wait();
    const tx3 = await OperatorFilterRegistryContract.connect(
      subscriptionOwner
    ).updateCodeHashes(
      OperatorFilterCatalystSubscription,
      [MockMarketPlace1CodeHash, MockMarketPlace2CodeHash],
      true
    );
    await tx3.wait();

    const CatalystContract = await getEthersContract('Catalyst');

    const RoyaltyManagerContract = await getEthersContract('RoyaltyManager');
    const TRUSTED_FORWARDER = await getEthersContract('TRUSTED_FORWARDER_V2');
    return {
      CatalystContract,
      OperatorFilterCatalystSubscription,
      RoyaltyManagerContract,
      catalystAdmin,
      TRUSTED_FORWARDER,
      OPERATOR_FILTER_REGISTRY,
      OperatorFilterRegistryContract,
      catalystMinter,
      MockERC1155MarketPlace1,
      MockERC1155MarketPlace2,
      MockERC1155MarketPlace3,
      MockERC1155MarketPlace4,
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
        RoyaltyManagerContract
      );
    });

    it('Contract is registered on RoyaltyManager', async function () {
      const {CatalystContract, RoyaltyManagerContract} = await setupTest();
      expect(
        await RoyaltyManagerContract.getContractRoyalty(CatalystContract)
      ).to.be.equal(royaltyAmount);
    });
  });

  describe('Operator Filter Registry', function () {
    it('catalyst contract is registered correctly', async function () {
      const {OperatorFilterRegistryContract, CatalystContract} =
        await setupTest();
      expect(
        await OperatorFilterRegistryContract.isRegistered(CatalystContract)
      ).to.be.true;
    });

    it('catalyst contract is subscribed to correct address', async function () {
      const {
        OperatorFilterRegistryContract,
        CatalystContract,
        OperatorFilterCatalystSubscription,
      } = await setupTest();
      expect(
        await OperatorFilterRegistryContract.subscriptionOf(CatalystContract)
      ).to.be.equal(OperatorFilterCatalystSubscription);
    });

    it('catalyst contract has correct market places black listed', async function () {
      const {
        OperatorFilterRegistryContract,
        CatalystContract,
        MockERC1155MarketPlace1,
        MockERC1155MarketPlace2,
        MockERC1155MarketPlace3,
        MockERC1155MarketPlace4,
      } = await setupTest();
      expect(
        await OperatorFilterRegistryContract.isOperatorFiltered(
          CatalystContract,
          MockERC1155MarketPlace1
        )
      ).to.be.equal(true);
      expect(
        await OperatorFilterRegistryContract.isOperatorFiltered(
          CatalystContract,
          MockERC1155MarketPlace2
        )
      ).to.be.equal(true);
      expect(
        await OperatorFilterRegistryContract.isOperatorFiltered(
          CatalystContract,
          MockERC1155MarketPlace3
        )
      ).to.be.equal(false);
      expect(
        await OperatorFilterRegistryContract.isOperatorFiltered(
          CatalystContract,
          MockERC1155MarketPlace4
        )
      ).to.be.equal(false);
    });
  });

  describe('Trusted Forwarder', function () {
    it('Trusted forwarder address is set correctly', async function () {
      const {CatalystContract, TRUSTED_FORWARDER} = await setupTest();
      expect(await CatalystContract.getTrustedForwarder()).to.be.equal(
        TRUSTED_FORWARDER
      );
    });
  });
});
