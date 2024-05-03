import {expect} from 'chai';
import {loadFixture} from '@nomicfoundation/hardhat-network-helpers';
import {ZeroAddress} from 'ethers';

// eslint-disable-next-line mocha/no-exports
export function shouldCheckForMetadataRegistry(setupLand, Contract: string) {
  describe(Contract + ':MetadataRegistry', function () {
    it('should not set metadataRegistry if caller is not admin', async function () {
      const {LandAsOther, MetadataRegistryContract2} =
        await loadFixture(setupLand);
      await expect(
        LandAsOther.setMetadataRegistry(MetadataRegistryContract2),
      ).to.be.revertedWithCustomError(LandAsOther, 'OnlyAdmin');
    });

    it('should not accept zero address as metadataRegistry', async function () {
      const {LandAsAdmin} = await loadFixture(setupLand);

      await expect(
        LandAsAdmin.setMetadataRegistry(ZeroAddress),
      ).to.be.revertedWithCustomError(LandAsAdmin, 'InvalidAddress');
    });

    it('should set metadataRegistry', async function () {
      const {LandAsAdmin, MetadataRegistryContract, MetadataRegistryContract2} =
        await loadFixture(setupLand);
      expect(await LandAsAdmin.getMetadataRegistry()).to.be.equal(
        MetadataRegistryContract,
      );
      await LandAsAdmin.setMetadataRegistry(MetadataRegistryContract2);
      expect(await LandAsAdmin.getMetadataRegistry()).to.be.equal(
        MetadataRegistryContract2,
      );
    });

    it('should return metadataRegistry address', async function () {
      const {LandContract, MetadataRegistryContract} =
        await loadFixture(setupLand);
      expect(await LandContract.getMetadataRegistry()).to.be.equal(
        MetadataRegistryContract,
      );
    });

    it('should return metadata for Land when MetadataRegistry is not set', async function () {
      const tokenId = 23n + 97n * 408n;
      const neighborhoodId = 0n;
      const neighborhoodName = 'unknown';
      const {LandContractWithoutMetadataRegistry} =
        await loadFixture(setupLand);

      expect(
        await LandContractWithoutMetadataRegistry.getMetadata(tokenId),
      ).to.deep.equal([false, neighborhoodId, neighborhoodName]);
    });

    it('should return metadata', async function () {
      const tokenId = 23n + 97n * 408n;
      const neighborhoodId = 37n;
      const neighborhoodName = 'MAIN_PLACE';
      const {LandContract, MetadataRegistryAsAdmin} =
        await loadFixture(setupLand);
      await MetadataRegistryAsAdmin.setMetadata(tokenId, true, neighborhoodId);
      await MetadataRegistryAsAdmin.setNeighborhoodName(
        neighborhoodId,
        neighborhoodName,
      );

      expect(await LandContract.getMetadata(tokenId)).to.deep.equal([
        true,
        neighborhoodId,
        neighborhoodName,
      ]);
    });

    it('should return false for isPremium when metadataRegistry is not set for a land contract', async function () {
      const tokenId = 23n + 97n * 408n;
      const {LandContractWithoutMetadataRegistry} =
        await loadFixture(setupLand);
      expect(
        await LandContractWithoutMetadataRegistry.isPremium(tokenId),
      ).to.be.equal(false);
    });

    it('should check if a token isPremium or not', async function () {
      const tokenId = 23n + 97n * 408n;
      const {LandContract, MetadataRegistryAsAdmin} =
        await loadFixture(setupLand);
      await MetadataRegistryAsAdmin.setPremium(tokenId, true);
      expect(await LandContract.isPremium(tokenId)).to.be.equal(true);
    });

    it('should return 0 for getNeighborhoodId when metadataRegistry is not set for a land contract', async function () {
      const tokenId = 23n + 97n * 408n;
      const {LandContractWithoutMetadataRegistry} =
        await loadFixture(setupLand);
      expect(
        await LandContractWithoutMetadataRegistry.getNeighborhoodId(tokenId),
      ).to.be.equal(0);
    });

    it('should return neighborhoodId for a token', async function () {
      const tokenId = 23n + 97n * 408n;
      const neighborhoodId = 37n;
      const {LandContract, MetadataRegistryAsAdmin} =
        await loadFixture(setupLand);
      await MetadataRegistryAsAdmin.setNeighborhoodId(tokenId, neighborhoodId);
      expect(await LandContract.getNeighborhoodId(tokenId)).to.be.equal(
        neighborhoodId,
      );
    });
  });
}
