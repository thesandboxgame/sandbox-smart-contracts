import {royaltyAmount} from '../../deploy/300_catalyst/302_catalyst_setup';
import {OPERATOR_FILTER_REGISTRY} from './../../../asset/data/constants';
import {expect} from 'chai';
import {OperatorFilterRegistryBytecode} from '../../utils/bytecodes';
import {OperatorFilterRegistry_ABI} from '../../utils/abi';
import {deployments} from 'hardhat';

const setupTest = deployments.createFixture(
  async ({deployments, network, getNamedAccounts, ethers}) => {
    const {catalystAdmin, catalystMinter} = await getNamedAccounts();
    await network.provider.send('hardhat_setCode', [
      OPERATOR_FILTER_REGISTRY,
      OperatorFilterRegistryBytecode,
    ]);
    const OperatorFilterRegistryContract = await ethers.getContractAt(
      OperatorFilterRegistry_ABI,
      OPERATOR_FILTER_REGISTRY
    );

    await deployments.fixture([
      'MockERC1155MarketPlace1',
      'MockERC1155MarketPlace2',
      'MockERC1155MarketPlace3',
      'MockERC1155MarketPlace4',
    ]);

    const MockERC1155MarketPlace1 = await deployments.get(
      'MockERC1155MarketPlace1'
    );
    const MockERC1155MarketPlace2 = await deployments.get(
      'MockERC1155MarketPlace2'
    );
    const MockERC1155MarketPlace3 = await deployments.get(
      'MockERC1155MarketPlace3'
    );
    const MockERC1155MarketPlace4 = await deployments.get(
      'MockERC1155MarketPlace4'
    );
    await network.provider.send('hardhat_setBalance', [
      '0x3cc6CddA760b79bAfa08dF41ECFA224f810dCeB6',
      '0xDE0B6B3A7640000',
    ]);
    await network.provider.request({
      method: 'hardhat_impersonateAccount',
      params: ['0x3cc6CddA760b79bAfa08dF41ECFA224f810dCeB6'],
    });
    const signer = await ethers.getSigner(
      '0x3cc6CddA760b79bAfa08dF41ECFA224f810dCeB6'
    );
    const tx = await OperatorFilterRegistryContract.connect(signer).register(
      '0x3cc6CddA760b79bAfa08dF41ECFA224f810dCeB6'
    );
    const MockMarketPlace1CodeHash =
      await OperatorFilterRegistryContract.connect(signer).codeHashOf(
        MockERC1155MarketPlace1.address
      );
    const MockMarketPlace2CodeHash =
      await OperatorFilterRegistryContract.connect(signer).codeHashOf(
        MockERC1155MarketPlace2.address
      );
    await tx.wait();
    const tx2 = await OperatorFilterRegistryContract.connect(
      signer
    ).updateOperators(
      '0x3cc6CddA760b79bAfa08dF41ECFA224f810dCeB6',
      [MockERC1155MarketPlace1.address, MockERC1155MarketPlace2.address],
      true
    );
    await tx2.wait();
    const tx3 = await OperatorFilterRegistryContract.connect(
      signer
    ).updateCodeHashes(
      '0x3cc6CddA760b79bAfa08dF41ECFA224f810dCeB6',
      [MockMarketPlace1CodeHash, MockMarketPlace2CodeHash],
      true
    );
    await tx3.wait();
    await network.provider.request({
      method: 'hardhat_stopImpersonatingAccount',
      params: ['0x3cc6CddA760b79bAfa08dF41ECFA224f810dCeB6'],
    });

    await deployments.fixture('Catalyst');

    const OperatorFilterSubscription = await deployments.get(
      'OperatorFilterSubscription'
    );
    const OperatorFilterSubscriptionContract = await ethers.getContractAt(
      OperatorFilterSubscription.abi,
      OperatorFilterSubscription.address
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
      OperatorFilterSubscriptionContract,
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
      expect(await CatalystContract.royaltyManager()).to.be.equal(
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
        OperatorFilterSubscriptionContract,
      } = await setupTest();
      expect(
        await OperatorFilterRegistryContract.subscriptionOf(
          CatalystContract.address
        )
      ).to.be.equal(OperatorFilterSubscriptionContract.address);
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
          CatalystContract.address,
          MockERC1155MarketPlace1.address
        )
      ).to.be.equal(true);
      expect(
        await OperatorFilterRegistryContract.isOperatorFiltered(
          CatalystContract.address,
          MockERC1155MarketPlace2.address
        )
      ).to.be.equal(true);
      expect(
        await OperatorFilterRegistryContract.isOperatorFiltered(
          CatalystContract.address,
          MockERC1155MarketPlace3.address
        )
      ).to.be.equal(false);
      expect(
        await OperatorFilterRegistryContract.isOperatorFiltered(
          CatalystContract.address,
          MockERC1155MarketPlace4.address
        )
      ).to.be.equal(false);
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
