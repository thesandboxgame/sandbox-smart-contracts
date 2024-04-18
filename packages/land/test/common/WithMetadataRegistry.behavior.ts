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
      ).to.be.revertedWith('only admin allowed');
    });

    it('should not accept zero address as metadataRegistry', async function () {
      const {LandAsAdmin} = await loadFixture(setupLand);

      await expect(
        LandAsAdmin.setMetadataRegistry(ZeroAddress),
      ).to.be.revertedWith('invalid registry address');
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
  });
}
