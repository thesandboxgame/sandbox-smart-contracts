import {OPERATOR_FILTER_REGISTRY} from './../../../asset/data/constants';
import {DEFAULT_BPS} from '../../deploy/400_asset/407_asset_setup';
import {expect} from 'chai';
import {deployments} from 'hardhat';
import {OperatorFilterRegistryBytecode} from '../../utils/bytecodes';
import {OperatorFilterRegistry_ABI} from '../../utils/abi';

const setupTest = deployments.createFixture(
  async ({deployments, network, getNamedAccounts, ethers}) => {
    const namedAccount = await getNamedAccounts();
    await network.provider.send('hardhat_setCode', [
      OPERATOR_FILTER_REGISTRY,
      OperatorFilterRegistryBytecode,
    ]);
    const OperatorFilterRegistryContract = await ethers.getContractAt(
      OperatorFilterRegistry_ABI,
      OPERATOR_FILTER_REGISTRY
    );
    const deployerSigner = await ethers.getSigner(namedAccount.deployer);
    const tx1 = await OperatorFilterRegistryContract.connect(
      deployerSigner
    ).register(namedAccount.filterOperatorSubscription);
    await tx1.wait();
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
    await tx.wait();
    await network.provider.request({
      method: 'hardhat_stopImpersonatingAccount',
      params: ['0x3cc6CddA760b79bAfa08dF41ECFA224f810dCeB6'],
    });

    await deployments.fixture();
    const Asset = await deployments.get('Asset');
    const AssetContract = await ethers.getContractAt(Asset.abi, Asset.address);
    const AssetCreate = await deployments.get('AssetCreate');
    const AssetCreateContract = await ethers.getContractAt(
      AssetCreate.abi,
      AssetCreate.address
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
      AssetContract,
      AssetCreateContract,
      RoyaltyManagerContract,
      namedAccount,
      TRUSTED_FORWARDER,
      OPERATOR_FILTER_REGISTRY,
      OperatorFilterRegistryContract,
    };
  }
);

describe('Asset', function () {
  describe('Check Roles', function () {
    it('Admin', async function () {
      const fixtures = await setupTest();
      const defaultAdminRole =
        await fixtures.AssetContract.DEFAULT_ADMIN_ROLE();
      expect(
        await fixtures.AssetContract.hasRole(
          defaultAdminRole,
          fixtures.namedAccount.sandAdmin
        )
      ).to.be.true;
    });
    it('Minter', async function () {
      const fixtures = await setupTest();
      const minterRole = await fixtures.AssetContract.MINTER_ROLE();
      expect(
        await fixtures.AssetContract.hasRole(
          minterRole,
          fixtures.AssetCreateContract.address
        )
      ).to.be.true;
    });
    it('Burner', async function () {
      // TODO Update when AssetRecycle is deployed
    });
    it('Moderator', async function () {
      const fixtures = await setupTest();
      const moderatorRole = await fixtures.AssetContract.MODERATOR_ROLE();
      expect(
        await fixtures.AssetContract.hasRole(
          moderatorRole,
          fixtures.namedAccount.sandAdmin
        )
      ).to.be.true;
    });
  });
  describe('Check Royalty', function () {
    it('Contract is registered on RoyaltyManager', async function () {
      const fixtures = await setupTest();
      expect(
        await fixtures.RoyaltyManagerContract.getContractRoyalty(
          fixtures.AssetContract.address
        )
      ).to.be.equal(DEFAULT_BPS);
    });
  });
  describe('Trusted Forwarder', function () {
    it('Trusted forwarder address is set correctly', async function () {
      const fixtures = await setupTest();
      expect(await fixtures.AssetContract.getTrustedForwarder()).to.be.equal(
        fixtures.TRUSTED_FORWARDER.address
      );
    });
  });
  describe('Operator Filter Registry', function () {
    it('Asset contract is registered correctly', async function () {
      const fixtures = await setupTest();
      expect(
        await fixtures.OperatorFilterRegistryContract.isRegistered(
          fixtures.AssetContract.address
        )
      ).to.be.true;
    });
    it('Asset contract is subscribed to correct address', async function () {
      const fixtures = await setupTest();
      expect(
        await fixtures.OperatorFilterRegistryContract.subscriptionOf(
          fixtures.AssetContract.address
        )
      ).to.be.equal(fixtures.namedAccount.filterOperatorSubscription);
    });
  });
  describe('MultiRoyaltyDistributor', function () {
    it('RoyaltyManager contract is set correctly', async function () {
      const fixtures = await setupTest();
      expect(await fixtures.AssetContract.royaltyManager()).to.be.equal(
        fixtures.RoyaltyManagerContract.address
      );
    });
  });
});
