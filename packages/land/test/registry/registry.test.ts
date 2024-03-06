import {loadFixture} from '@nomicfoundation/hardhat-network-helpers';
import {expect} from 'chai';
import {
  getRandomMetadata,
  getRandomTokenIds,
  Metadata,
  setupRegistry,
  updateMetadata,
} from './fixtures';
import {getStorageSlotJS} from '../fixtures';

const tokenId = 23n + 97n * 408n;
const neighborhoodId = 37n;
const neighborhoodName = 'MAIN_PLACE';
describe('LandMetadataRegistry', function () {
  describe('metadata', function () {
    it('admin should be able to set metadata', async function () {
      const {registryAsAdmin} = await loadFixture(setupRegistry);
      expect(await registryAsAdmin.isPremium(tokenId)).to.be.false;
      expect(await registryAsAdmin.getNeighborhoodId(tokenId)).to.be.equal(0);
      await expect(registryAsAdmin.setMetadata(tokenId, true, neighborhoodId))
        .to.emit(registryAsAdmin, 'MetadataSet')
        .withArgs(tokenId, 0, false, neighborhoodId, true);
      expect(await registryAsAdmin.isPremium(tokenId)).to.be.true;
      expect(await registryAsAdmin.getNeighborhoodId(tokenId)).to.be.equal(
        neighborhoodId,
      );
    });
    it('other should fail to set metadata', async function () {
      const {registryAsOther} = await loadFixture(setupRegistry);
      await expect(
        registryAsOther.setMetadata(tokenId, true, neighborhoodId),
      ).to.revertedWith('only admin');
    });
    it('admin should fail to set metadata if the neighborhood number is invalid', async function () {
      const {registryAsAdmin} = await loadFixture(setupRegistry);
      await expect(
        registryAsAdmin.setMetadata(tokenId, true, 0),
      ).to.revertedWith('neighborhoodId must be >0');
      await expect(
        registryAsAdmin.setMetadata(tokenId, true, 127),
      ).to.revertedWith('neighborhoodId must be <127');
    });
  });
  describe('premiumness', function () {
    it('admin should be able to set premiumness', async function () {
      const {registryAsAdmin} = await loadFixture(setupRegistry);
      await registryAsAdmin.setNeighborhoodId(tokenId, neighborhoodId);
      expect(await registryAsAdmin.isPremium(tokenId)).to.be.false;
      await expect(registryAsAdmin.setPremium(tokenId, true))
        .to.emit(registryAsAdmin, 'MetadataSet')
        .withArgs(tokenId, neighborhoodId, false, neighborhoodId, true);
      expect(await registryAsAdmin.isPremium(tokenId)).to.be.true;
      await expect(registryAsAdmin.setPremium(tokenId, false))
        .to.emit(registryAsAdmin, 'MetadataSet')
        .withArgs(tokenId, neighborhoodId, true, neighborhoodId, false);
      expect(await registryAsAdmin.isPremium(tokenId)).to.be.false;
    });
    it('other should fail to set premiumness', async function () {
      const {registryAsOther} = await loadFixture(setupRegistry);
      await expect(registryAsOther.setPremium(tokenId, true)).to.revertedWith(
        'only admin',
      );
    });
  });
  describe('neighborhood number', function () {
    it('admin should be able to set neighborhood number', async function () {
      const {registryAsAdmin} = await loadFixture(setupRegistry);
      expect(await registryAsAdmin.getNeighborhoodId(tokenId)).to.be.equal(0);
      await expect(registryAsAdmin.setNeighborhoodId(tokenId, neighborhoodId))
        .to.emit(registryAsAdmin, 'MetadataSet')
        .withArgs(tokenId, 0, false, neighborhoodId, false);
      expect(await registryAsAdmin.getNeighborhoodId(tokenId)).to.be.equal(
        neighborhoodId,
      );
    });
    it('other should fail to set neighborhood number', async function () {
      const {registryAsOther} = await loadFixture(setupRegistry);
      await expect(
        registryAsOther.setNeighborhoodId(tokenId, neighborhoodId),
      ).to.revertedWith('only admin');
    });
    it('admin should fail to set neighborhood number if the number is invalid', async function () {
      const {registryAsAdmin} = await loadFixture(setupRegistry);
      await expect(
        registryAsAdmin.setNeighborhoodId(tokenId, 0),
      ).to.revertedWith('neighborhoodId must be >0');
      await expect(
        registryAsAdmin.setNeighborhoodId(tokenId, 127),
      ).to.revertedWith('neighborhoodId must be <127');
    });
  });
  describe('neighborhood name', function () {
    it('admin should be able to set neighborhood name', async function () {
      const {registryAsAdmin} = await loadFixture(setupRegistry);
      expect(await registryAsAdmin.getNeighborhoodName(tokenId)).to.be.equal(
        '',
      );
      await expect(
        registryAsAdmin.setNeighborhoodName(neighborhoodId, neighborhoodName),
      )
        .to.emit(registryAsAdmin, 'NeighborhoodNameSet')
        .withArgs(neighborhoodId, neighborhoodName);
      await registryAsAdmin.setNeighborhoodId(tokenId, neighborhoodId);
      expect(await registryAsAdmin.getNeighborhoodName(tokenId)).to.be.equal(
        neighborhoodName,
      );
      expect(
        await registryAsAdmin.getNeighborhoodNameForId(neighborhoodId),
      ).to.be.equal(neighborhoodName);
    });
    it('other should fail to set neighborhood name', async function () {
      const {registryAsOther} = await loadFixture(setupRegistry);
      await expect(
        registryAsOther.setNeighborhoodName(neighborhoodId, neighborhoodName),
      ).to.revertedWith('only admin');
    });
    it('admin should fail to set neighborhood name if the neighborhood number is invalid', async function () {
      const {registryAsAdmin} = await loadFixture(setupRegistry);
      await expect(
        registryAsAdmin.setNeighborhoodName(0, neighborhoodName),
      ).to.revertedWith('neighborhoodId must be >0');
      await expect(
        registryAsAdmin.setNeighborhoodName(127, neighborhoodName),
      ).to.revertedWith('neighborhoodId must be <127');
    });
  });
  describe('batch set metadata', function () {
    it('admin should be able to batch set metadata', async function () {
      const {registryAsAdmin} = await loadFixture(setupRegistry);
      const batch: {[key: string]: bigint} = {};
      for (let i = 0n; i < 408 * 4; i++) {
        const tId = tokenId + i;
        const key = 32n * (tId / 32n);
        const byteNum = 8n * (tId % 32n);
        const landMetadata = (neighborhoodId + i) % 127n | 0x80n;
        if (!batch[key]) batch[key] = 0n;
        batch[key] = batch[key] | (landMetadata << byteNum);
      }
      const batchMetadata = Object.entries(batch).map((x) => ({
        baseTokenId: BigInt(x[0]),
        metadata: x[1],
      }));
      expect(await registryAsAdmin.getNeighborhoodId(tokenId)).to.be.equal(0);
      await expect(registryAsAdmin.batchSetMetadata(batchMetadata))
        .to.emit(registryAsAdmin, 'BatchMetadataSet')
        .withArgs((toCheck) =>
          toCheck.some(
            (result, idx) =>
              batchMetadata[idx].baseTokenId == result[0] &&
              batchMetadata[idx].metadata == result[1],
          ),
        );
      expect(
        await registryAsAdmin.batchGetMetadata(
          batchMetadata.map((x) => x.baseTokenId),
        ),
      ).to.be.eql(batchMetadata.map((x) => [x.baseTokenId, x.metadata]));
      expect(await registryAsAdmin.getNeighborhoodId(tokenId)).to.be.equal(
        neighborhoodId,
      );
      expect(await registryAsAdmin.isPremium(tokenId)).to.be.true;
      expect(await registryAsAdmin.getMetadata(tokenId)).to.be.eql([
        neighborhoodId,
        true,
      ]);
    });
    it('other should fail to batch set metadata', async function () {
      const {registryAsOther} = await loadFixture(setupRegistry);
      await expect(
        registryAsOther.batchSetMetadata([
          {baseTokenId: tokenId, metadata: neighborhoodId | 0x80n},
        ]),
      ).to.revertedWith('only admin');
    });
    it('admin should fail to batch set metadata if baseTokenId is invalid', async function () {
      const {registryAsAdmin} = await loadFixture(setupRegistry);
      await expect(
        registryAsAdmin.batchSetMetadata([
          {baseTokenId: 32n * (tokenId / 32n) + 1n, metadata: 0n},
        ]),
      ).to.revertedWith('invalid base tokenId');
    });
  });
  it('storage slot', async function () {
    const {registryAsDeployer} = await loadFixture(setupRegistry);
    expect(await registryAsDeployer.getLandMetadataStorageSlot()).to.be.equal(
      getStorageSlotJS('theSandbox.storage.LandMetadataStorage'),
    );
  });
  it('should not be able to set land type back to unknown', async function () {
    const {registryAsAdmin} = await loadFixture(setupRegistry);
    // unknown
    expect(await registryAsAdmin.getMetadata(tokenId)).to.be.eql([0n, false]);
    // known type
    await registryAsAdmin.setNeighborhoodId(tokenId, neighborhoodId);
    await expect(registryAsAdmin.setNeighborhoodId(tokenId, 0)).to.revertedWith(
      'neighborhoodId must be >0',
    );
    await expect(
      registryAsAdmin.setMetadata(tokenId, false, 0),
    ).to.revertedWith('neighborhoodId must be >0');
  });
  describe('coverage', function () {
    it('initialization', async function () {
      const {registryAsDeployer, admin} = await loadFixture(setupRegistry);
      await expect(registryAsDeployer.initialize(admin)).to.be.revertedWith(
        'Initializable: contract is already initialized',
      );
    });
  });
  it('@skip-on-ci @skip-on-coverage gas calculation', async function () {
    // two rows
    const numLands32InBatch = 408n * 2n; // 19.7Mgas (max is 1223, 29530015n gas)
    const metadata32 =
      0x8182838485868788898a8b8c8d8e8f909192939495969798999a9b9c9d9e9fa0n;
    const {registryAsAdmin} = await loadFixture(setupRegistry);
    const batchMetadata = [];
    for (let i = 0n; i < numLands32InBatch; i++) {
      batchMetadata.push({
        baseTokenId: 32n * i + 32n,
        metadata: metadata32,
      });
    }
    const tx = await registryAsAdmin.batchSetMetadata(batchMetadata);
    const receipt = await tx.wait();
    const numLandsPerBatch = numLands32InBatch * 32n;
    console.log('numLandsInBatch', numLandsPerBatch);
    const numTxs = (408n * 408n) / numLandsPerBatch;
    const totalGas = numTxs * receipt.cumulativeGasUsed;
    console.log('TOTAL GAS FOR THE MAP', totalGas, 'gas');
    const gasPriceInWei = 30n * 10n ** 9n;
    const ethPrice = 2000n;
    console.log(
      'ESTIMATION ON ETHEREUM',
      (totalGas * gasPriceInWei * ethPrice) / 10n ** 18n,
      'USD',
    );
  });
  it('@skip-on-coverage batch set and modify the metadata', async function () {
    const CANT = 200;
    const {registryAsAdmin} = await loadFixture(setupRegistry);

    async function check(metadata: Metadata[]) {
      for (const m of metadata) {
        expect(await registryAsAdmin.isPremium(m.tokenId)).to.be.equal(
          m.isPremium,
        );
        expect(await registryAsAdmin.getNeighborhoodId(m.tokenId)).to.be.equal(
          m.neighborhoodId,
        );
      }
    }

    // some sequential, some random tokenIds
    const sequential = [...Array(CANT).keys()].map(BigInt);
    const tokenIds = [...sequential, ...getRandomTokenIds(CANT, sequential)];
    const metadata = getRandomMetadata(tokenIds);
    for (const m of metadata) {
      expect(await registryAsAdmin.isPremium(m.tokenId)).to.be.false;
      expect(await registryAsAdmin.getNeighborhoodId(m.tokenId)).to.be.equal(0);
    }

    await updateMetadata(registryAsAdmin, metadata);
    await check(metadata);

    // update the values for some tokenIds, leave others and some new ones
    const newMetadata = getRandomMetadata([
      ...tokenIds.slice(0, CANT / 2),
      ...getRandomTokenIds(CANT, tokenIds),
    ]);
    await updateMetadata(registryAsAdmin, newMetadata);

    // unchanged
    await check(metadata.slice(CANT / 2));
    // modified and added.
    await check(newMetadata);
  });
});
