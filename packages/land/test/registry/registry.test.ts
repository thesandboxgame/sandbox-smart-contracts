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
import {keccak256, Wallet} from 'ethers';

const tokenId = 23n + 97n * 408n;
const neighborhoodId = 37n;
const neighborhoodName = 'MAIN_PLACE';
describe('LandMetadataRegistry', function () {
  describe('metadata', function () {
    it('admin should be able to set metadata', async function () {
      const {admin, registryAsAdmin} = await loadFixture(setupRegistry);
      expect(await registryAsAdmin.isPremium(tokenId)).to.be.false;
      expect(await registryAsAdmin.getNeighborhoodId(tokenId)).to.be.equal(0);
      await expect(registryAsAdmin.setMetadata(tokenId, true, neighborhoodId))
        .to.emit(registryAsAdmin, 'MetadataSet')
        .withArgs(admin, tokenId, 0, false, neighborhoodId, true);
      expect(await registryAsAdmin.isPremium(tokenId)).to.be.true;
      expect(await registryAsAdmin.getNeighborhoodId(tokenId)).to.be.equal(
        neighborhoodId,
      );
    });

    it('other should fail to set metadata', async function () {
      const {registryAsOther} = await loadFixture(setupRegistry);
      await expect(
        registryAsOther.setMetadata(tokenId, true, neighborhoodId),
      ).to.revertedWithCustomError(registryAsOther, 'OnlyAdmin');
    });

    it('admin should fail to set metadata if the neighborhood number is invalid', async function () {
      const {registryAsAdmin} = await loadFixture(setupRegistry);
      const NEIGHBORHOOD_MASK = await registryAsAdmin.NEIGHBORHOOD_MASK();
      await expect(registryAsAdmin.setMetadata(tokenId, true, 0))
        .to.revertedWithCustomError(registryAsAdmin, 'InvalidNeighborhoodId')
        .withArgs(0);
      await expect(
        registryAsAdmin.setMetadata(tokenId, true, NEIGHBORHOOD_MASK),
      )
        .to.revertedWithCustomError(registryAsAdmin, 'InvalidNeighborhoodId')
        .withArgs(NEIGHBORHOOD_MASK);
    });
  });

  describe('premiumness', function () {
    it('admin should be able to set premiumness', async function () {
      const {admin, registryAsAdmin} = await loadFixture(setupRegistry);
      await registryAsAdmin.setNeighborhoodId(tokenId, neighborhoodId);
      expect(await registryAsAdmin.isPremium(tokenId)).to.be.false;
      await expect(registryAsAdmin.setPremium(tokenId, true))
        .to.emit(registryAsAdmin, 'MetadataSet')
        .withArgs(admin, tokenId, neighborhoodId, false, neighborhoodId, true);
      expect(await registryAsAdmin.isPremium(tokenId)).to.be.true;
      await expect(registryAsAdmin.setPremium(tokenId, false))
        .to.emit(registryAsAdmin, 'MetadataSet')
        .withArgs(admin, tokenId, neighborhoodId, true, neighborhoodId, false);
      expect(await registryAsAdmin.isPremium(tokenId)).to.be.false;
    });

    it('other should fail to set premiumness', async function () {
      const {registryAsOther} = await loadFixture(setupRegistry);
      await expect(
        registryAsOther.setPremium(tokenId, true),
      ).to.revertedWithCustomError(registryAsOther, 'OnlyAdmin');
    });
  });

  describe('neighborhood number', function () {
    it('admin should be able to set neighborhood number', async function () {
      const {admin, registryAsAdmin} = await loadFixture(setupRegistry);
      expect(await registryAsAdmin.getNeighborhoodId(tokenId)).to.be.equal(0);
      await expect(registryAsAdmin.setNeighborhoodId(tokenId, neighborhoodId))
        .to.emit(registryAsAdmin, 'MetadataSet')
        .withArgs(admin, tokenId, 0, false, neighborhoodId, false);
      expect(await registryAsAdmin.getNeighborhoodId(tokenId)).to.be.equal(
        neighborhoodId,
      );
    });

    it('other should fail to set neighborhood number', async function () {
      const {registryAsOther} = await loadFixture(setupRegistry);
      await expect(
        registryAsOther.setNeighborhoodId(tokenId, neighborhoodId),
      ).to.revertedWithCustomError(registryAsOther, 'OnlyAdmin');
    });

    it('admin should fail to set neighborhood number if the number is invalid', async function () {
      const {registryAsAdmin} = await loadFixture(setupRegistry);
      const NEIGHBORHOOD_MASK = await registryAsAdmin.NEIGHBORHOOD_MASK();
      await expect(registryAsAdmin.setNeighborhoodId(tokenId, 0))
        .to.revertedWithCustomError(registryAsAdmin, 'InvalidNeighborhoodId')
        .withArgs(0);
      await expect(
        registryAsAdmin.setNeighborhoodId(tokenId, NEIGHBORHOOD_MASK),
      )
        .to.revertedWithCustomError(registryAsAdmin, 'InvalidNeighborhoodId')
        .withArgs(NEIGHBORHOOD_MASK);
    });
  });

  describe('neighborhood name', function () {
    it('admin should be able to set neighborhood name', async function () {
      const {admin, registryAsAdmin} = await loadFixture(setupRegistry);
      expect(await registryAsAdmin.getNeighborhoodName(tokenId)).to.be.equal(
        'unknown',
      );
      await expect(
        registryAsAdmin.setNeighborhoodName(neighborhoodId, neighborhoodName),
      )
        .to.emit(registryAsAdmin, 'NeighborhoodNameSet')
        .withArgs(admin, neighborhoodId, neighborhoodName);
      await registryAsAdmin.setNeighborhoodId(tokenId, neighborhoodId);
      expect(await registryAsAdmin.getNeighborhoodName(tokenId)).to.be.equal(
        neighborhoodName,
      );
      expect(await registryAsAdmin.getMetadata(tokenId)).to.be.eql([
        false,
        neighborhoodId,
        neighborhoodName,
      ]);
      expect(
        await registryAsAdmin.getNeighborhoodNameForId(neighborhoodId),
      ).to.be.equal(neighborhoodName);
    });

    it('other should fail to set neighborhood name', async function () {
      const {registryAsOther} = await loadFixture(setupRegistry);
      await expect(
        registryAsOther.setNeighborhoodName(neighborhoodId, neighborhoodName),
      ).to.revertedWithCustomError(registryAsOther, 'OnlyAdmin');
    });

    it('admin should be able to batch set neighborhood name', async function () {
      const {admin, registryAsAdmin} = await loadFixture(setupRegistry);
      expect(await registryAsAdmin.getNeighborhoodName(tokenId)).to.be.equal(
        'unknown',
      );
      const data = [
        {
          neighborhoodId,
          name: neighborhoodName,
        },
      ];
      await expect(registryAsAdmin.batchSetNeighborhoodName(data))
        .to.emit(registryAsAdmin, 'NeighborhoodNameSet')
        .withArgs(admin, neighborhoodId, neighborhoodName);
      await registryAsAdmin.setNeighborhoodId(tokenId, neighborhoodId);
      expect(await registryAsAdmin.getNeighborhoodName(tokenId)).to.be.equal(
        neighborhoodName,
      );
      expect(await registryAsAdmin.getMetadata(tokenId)).to.be.eql([
        false,
        neighborhoodId,
        neighborhoodName,
      ]);
      expect(
        await registryAsAdmin.getNeighborhoodNameForId(neighborhoodId),
      ).to.be.equal(neighborhoodName);
    });

    it('other should fail to batch set neighborhood name', async function () {
      const {registryAsOther} = await loadFixture(setupRegistry);
      const data = [
        {
          neighborhoodId,
          name: neighborhoodName,
        },
      ];
      await expect(
        registryAsOther.batchSetNeighborhoodName(data),
      ).to.revertedWithCustomError(registryAsOther, 'OnlyAdmin');
    });

    it('admin should be able to batch upload all the possible names at once', async function () {
      const {registryAsAdmin} = await loadFixture(setupRegistry);
      expect(await registryAsAdmin.getNeighborhoodName(tokenId)).to.be.equal(
        'unknown',
      );
      const data = [];
      for (let i = 0; i < 126; i++) {
        data.push({
          neighborhoodId: i + 1,
          name: keccak256(await Wallet.createRandom().getAddress()),
        });
      }
      const tx = await registryAsAdmin.batchSetNeighborhoodName(data);
      const receipt = await tx.wait();
      expect(receipt.cumulativeGasUsed).to.be.lt(13_000_000n);
    });

    it('admin should fail to set neighborhood name if the neighborhood number is invalid', async function () {
      const {registryAsAdmin} = await loadFixture(setupRegistry);
      const NEIGHBORHOOD_MASK = await registryAsAdmin.NEIGHBORHOOD_MASK();
      await expect(registryAsAdmin.setNeighborhoodName(0, neighborhoodName))
        .to.revertedWithCustomError(registryAsAdmin, 'InvalidNeighborhoodId')
        .withArgs(0);
      await expect(
        registryAsAdmin.setNeighborhoodName(
          NEIGHBORHOOD_MASK,
          neighborhoodName,
        ),
      )
        .to.revertedWithCustomError(registryAsAdmin, 'InvalidNeighborhoodId')
        .withArgs(NEIGHBORHOOD_MASK);
    });
  });

  describe('batch set metadata', function () {
    it('admin should be able to batch set metadata', async function () {
      const {admin, registryAsAdmin} = await loadFixture(setupRegistry);
      const batch: {[key: string]: bigint} = {};
      const LANDS_PER_WORD = await registryAsAdmin.LANDS_PER_WORD();
      const BITS_PER_LAND = await registryAsAdmin.BITS_PER_LAND();
      const PREMIUM_MASK = await registryAsAdmin.PREMIUM_MASK();
      const NEIGHBORHOOD_MASK = await registryAsAdmin.NEIGHBORHOOD_MASK();
      for (let i = 0n; i < 408 * 4; i++) {
        const tId = tokenId + i;
        const key = LANDS_PER_WORD * (tId / LANDS_PER_WORD);
        const byteNum = BITS_PER_LAND * (tId % LANDS_PER_WORD);
        const landMetadata =
          (neighborhoodId + i) % NEIGHBORHOOD_MASK | PREMIUM_MASK;
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
        .withArgs(admin, (toCheck) =>
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
        true,
        neighborhoodId,
        '',
      ]);
    });

    it('other should fail to batch set metadata', async function () {
      const {registryAsOther} = await loadFixture(setupRegistry);
      await expect(
        registryAsOther.batchSetMetadata([
          {baseTokenId: tokenId, metadata: neighborhoodId | 0x80n},
        ]),
      ).to.revertedWithCustomError(registryAsOther, 'OnlyAdmin');
    });

    it('admin should fail to batch set metadata if baseTokenId is invalid', async function () {
      const {registryAsAdmin} = await loadFixture(setupRegistry);
      const baseTokenId = 16n * (tokenId / 16n) + 1n;
      await expect(
        registryAsAdmin.batchSetMetadata([{baseTokenId, metadata: 0n}]),
      )
        .to.revertedWithCustomError(registryAsAdmin, 'InvalidBaseTokenId')
        .withArgs(baseTokenId);
    });
  });

  it('storage slot', async function () {
    const {registryAsDeployer} = await loadFixture(setupRegistry);
    expect(await registryAsDeployer.getLandMetadataStorageSlot()).to.be.equal(
      getStorageSlotJS('thesandbox.storage.land.registry.LandMetadataStorage'),
    );
  });

  it('should not be able to set land type back to unknown', async function () {
    const {registryAsAdmin} = await loadFixture(setupRegistry);
    // unknown
    expect(await registryAsAdmin.getMetadata(tokenId)).to.be.eql([
      false,
      0n,
      'unknown',
    ]);
    // known type
    await registryAsAdmin.setNeighborhoodId(tokenId, neighborhoodId);
    await expect(registryAsAdmin.setNeighborhoodId(tokenId, 0))
      .to.revertedWithCustomError(registryAsAdmin, 'InvalidNeighborhoodId')
      .withArgs(0);
    await expect(registryAsAdmin.setMetadata(tokenId, false, 0))
      .to.revertedWithCustomError(registryAsAdmin, 'InvalidNeighborhoodId')
      .withArgs(0);
  });

  describe('coverage', function () {
    it('initialization', async function () {
      const {registryAsDeployer, admin} = await loadFixture(setupRegistry);
      await expect(
        registryAsDeployer.initialize(admin),
      ).to.be.revertedWithCustomError(
        registryAsDeployer,
        'InvalidInitialization',
      );
    });
  });

  it('@skip-on-ci @skip-on-coverage gas calculation', async function () {
    // two rows
    const numLands16InBatch = 408n * 2n; // 19.7Mgas (max is 1223, 236249608n gas)
    const metadata16 =
      0x8182838485868788898a8b8c8d8e8f909192939495969798999a9b9c9d9e9fa0n;
    const {registryAsAdmin} = await loadFixture(setupRegistry);
    const batchMetadata = [];
    for (let i = 0n; i < numLands16InBatch; i++) {
      batchMetadata.push({
        baseTokenId: 16n * i + 16n,
        metadata: metadata16,
      });
    }
    const tx = await registryAsAdmin.batchSetMetadata(batchMetadata);
    const receipt = await tx.wait();
    const numLandsPerBatch = numLands16InBatch * 16n;
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
