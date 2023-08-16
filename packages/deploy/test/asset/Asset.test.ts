import {OPERATOR_FILTER_REGISTRY} from './../../../asset/data/constants';
import {DEFAULT_BPS} from '../../deploy/400_asset/407_asset_setup';
import {expect} from 'chai';
import {deployments} from 'hardhat';
import {OperatorFilterRegistryBytecode} from '../../utils/bytecodes';
import {OperatorFilterRegistry_ABI} from '../../utils/abi';

const setupTest = deployments.createFixture(
  async ({deployments, network, getNamedAccounts, ethers}) => {
    const {deployer, assetAdmin, filterOperatorSubscription, sandAdmin} =
      await getNamedAccounts();
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
    const deployerSigner = await ethers.getSigner(deployer);
    const tx1 = await OperatorFilterRegistryContract.connect(
      deployerSigner
    ).register(filterOperatorSubscription);
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
    const MockMarketPlace1CodeHash =
      await OperatorFilterRegistryContract.connect(signer).codeHashOf(
        MockERC1155MarketPlace1.address
      );
    const MockMarketPlace2CodeHash =
      await OperatorFilterRegistryContract.connect(signer).codeHashOf(
        MockERC1155MarketPlace2.address
      );
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

    // grant moderator role to the assetAdmin
    const adminSigner = await ethers.getSigner(assetAdmin);
    const moderatorRole = await AssetContract.MODERATOR_ROLE();
    await AssetContract.connect(adminSigner).grantRole(
      moderatorRole,
      assetAdmin
    );
    // set tokenURI for tokenId 1 for baseURI test
    const mockMetadataHash = 'QmQ6BFzGGAU7JdkNJmvkEVjvqKC4VCGb3qoDnjAQWHexxD';
    await AssetContract.connect(adminSigner).setTokenURI(1, mockMetadataHash);

    return {
      AssetContract,
      AssetCreateContract,
      RoyaltyManagerContract,
      deployer,
      sandAdmin,
      filterOperatorSubscription,
      TRUSTED_FORWARDER,
      OPERATOR_FILTER_REGISTRY,
      OperatorFilterRegistryContract,
      mockMetadataHash,
      MockERC1155MarketPlace1,
      MockERC1155MarketPlace2,
      MockERC1155MarketPlace3,
      MockERC1155MarketPlace4,
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
    it('Asset base URI is set correctly', async function () {
      const {AssetContract, mockMetadataHash} = await setupTest();
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
        filterOperatorSubscription,
      } = await setupTest();
      expect(
        await OperatorFilterRegistryContract.subscriptionOf(
          AssetContract.address
        )
      ).to.be.equal(filterOperatorSubscription);
    });
    it('catalyst contract has correct market places black listed', async function () {
      const {
        OperatorFilterRegistryContract,
        AssetContract,
        MockERC1155MarketPlace1,
        MockERC1155MarketPlace2,
        MockERC1155MarketPlace3,
        MockERC1155MarketPlace4,
      } = await setupTest();
      expect(
        await OperatorFilterRegistryContract.isOperatorFiltered(
          AssetContract.address,
          MockERC1155MarketPlace1.address
        )
      ).to.be.equal(true);
      expect(
        await OperatorFilterRegistryContract.isOperatorFiltered(
          AssetContract.address,
          MockERC1155MarketPlace2.address
        )
      ).to.be.equal(true);
      expect(
        await OperatorFilterRegistryContract.isOperatorFiltered(
          AssetContract.address,
          MockERC1155MarketPlace3.address
        )
      ).to.be.equal(false);
      expect(
        await OperatorFilterRegistryContract.isOperatorFiltered(
          AssetContract.address,
          MockERC1155MarketPlace4.address
        )
      ).to.be.equal(false);
    });
  });
  describe('MultiRoyaltyDistributor', function () {
    it('RoyaltyManager contract is set correctly', async function () {
      const {AssetContract, RoyaltyManagerContract} = await setupTest();
      expect(await AssetContract.royaltyManager()).to.be.equal(
        RoyaltyManagerContract.address
      );
    });
  });
});
