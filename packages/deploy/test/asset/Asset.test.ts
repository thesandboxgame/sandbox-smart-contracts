import {DEFAULT_BPS} from '../../deploy/400_asset/407_asset_setup';
import {expect} from 'chai';
import {deployments} from 'hardhat';
import {withSnapshot} from '../../utils/testUtils';

const setupTest = withSnapshot(
  ['Asset', 'OperatorFilterAssetSubscription'],
  async ({getNamedAccounts, ethers}) => {
    const {deployer, sandAdmin} = await getNamedAccounts();

    const OperatorFilterRegistry = await deployments.get(
      'OperatorFilterRegistry'
    );
    const OperatorFilterRegistryContract = await ethers.getContractAt(
      OperatorFilterRegistry.abi,
      OperatorFilterRegistry.address
    );

    const OperatorFilterAssetSubscription = await deployments.get(
      'OperatorFilterAssetSubscription'
    );
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
      deployer,
      sandAdmin,
      OperatorFilterAssetSubscription,
      TRUSTED_FORWARDER,
      OperatorFilterRegistryContract,
    };
  }
);

describe('Asset', function () {
  describe('Roles', function () {
    it('Admin', async function () {
      const {AssetContract, sandAdmin} = await setupTest();
      const defaultAdminRole = await AssetContract.DEFAULT_ADMIN_ROLE();
      expect(await AssetContract.hasRole(defaultAdminRole, sandAdmin)).to.be
        .true;
    });
    it('Minter', async function () {
      const {AssetContract, AssetCreateContract} = await setupTest();
      const minterRole = await AssetContract.MINTER_ROLE();
      expect(
        await AssetContract.hasRole(minterRole, AssetCreateContract.address)
      ).to.be.true;
    });
    it('Burner', async function () {
      // TODO Update when AssetRecycle is deployed
    });
    it('Moderator', async function () {
      const {AssetContract, sandAdmin} = await setupTest();
      const moderatorRole = await AssetContract.MODERATOR_ROLE();
      expect(await AssetContract.hasRole(moderatorRole, sandAdmin)).to.be.true;
    });
  });
  describe("Asset's Metadata", function () {
    // eslint-disable-next-line mocha/no-skipped-tests
    it.skip('Asset base URI is set correctly', async function () {
      const {AssetContract} = await setupTest();
      // set tokenURI for tokenId 1 for baseURI test
      const mockMetadataHash = 'QmQ6BFzGGAU7JdkNJmvkEVjvqKC4VCGb3qoDnjAQWHexxD';
      expect(await AssetContract.uri(1)).to.be.equal(
        'ipfs://' + mockMetadataHash
      );
    });
  });
  describe('Royalties', function () {
    it('Contract is registered on RoyaltyManager', async function () {
      const {RoyaltyManagerContract, AssetContract} = await setupTest();
      expect(
        await RoyaltyManagerContract.getContractRoyalty(AssetContract.address)
      ).to.be.equal(DEFAULT_BPS);
    });
  });
  describe('Trusted Forwarder', function () {
    it('Trusted forwarder address is set correctly', async function () {
      const {AssetContract, TRUSTED_FORWARDER} = await setupTest();
      expect(await AssetContract.getTrustedForwarder()).to.be.equal(
        TRUSTED_FORWARDER.address
      );
    });
  });
  describe('Operator Filter Registry', function () {
    it('Asset contract is registered correctly', async function () {
      const {OperatorFilterRegistryContract, AssetContract} = await setupTest();
      expect(
        await OperatorFilterRegistryContract.isRegistered(AssetContract.address)
      ).to.be.true;
    });
    it('Asset contract is subscribed to correct address', async function () {
      const {
        OperatorFilterRegistryContract,
        AssetContract,
        OperatorFilterAssetSubscription,
      } = await setupTest();
      expect(
        await OperatorFilterRegistryContract.subscriptionOf(
          AssetContract.address
        )
      ).to.be.equal(OperatorFilterAssetSubscription.address);
    });
  });
  describe('MultiRoyaltyDistributor', function () {
    it('RoyaltyManager contract is set correctly', async function () {
      const {AssetContract, RoyaltyManagerContract} = await setupTest();
      expect(await AssetContract.getRoyaltyManager()).to.be.equal(
        RoyaltyManagerContract.address
      );
    });
  });
});
