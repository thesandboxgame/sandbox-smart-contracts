import { expect } from '../../chai-setup';
import { BigNumber, Contract } from 'ethers';
import { waitFor } from '../../utils';
import { setupCollectionCatalystMigrations, setupUser } from './fixture';
describe('CollectionCatalystMigrations', function () {

  async function oldAssetMint(
    catalystMinterAsUser: Contract,
    creator: string,
    packId: BigNumber,
    hash: string,
    supply: number | BigNumber,
    owner: string,
    callData: Buffer,
    catalystId: number,
    gemIds: number[]
  ): Promise<BigNumber> {
    const assetId = await catalystMinterAsUser.callStatic.mint(
      creator,
      packId,
      hash,
      catalystId,
      gemIds,
      supply,
      owner,
      callData);
    await waitFor(catalystMinterAsUser.mint(
      creator,
      packId,
      hash,
      catalystId,
      gemIds,
      supply,
      owner,
      callData
    ));
    return assetId;
  }

  async function testMigration(assetAttributesRegistry: Contract, assetId: BigNumber, catalystId: number,
    gemIds: number[], blockNumber: number) {
    const record = await assetAttributesRegistry.getRecord(assetId);
    expect(record.catalystId).to.equal(catalystId + 1);
    expect(record.exists).to.equal(true);
    for (let i = 0; i < gemIds.length; i++) {
      expect(record.gemIds[i]).to.equal(gemIds[i]);
    }
    const assetAttributesRegistryEvents = await assetAttributesRegistry.queryFilter(
      assetAttributesRegistry.filters.CatalystApplied()
    );
    const event = assetAttributesRegistryEvents.filter(
      (e) => e.event === 'CatalystApplied'
    )[0];

    expect(event.args).not.to.equal(null || undefined);
    if (event.args) {
      expect(event.args[0]).to.equal(BigNumber.from(assetId));
      expect(event.args[1]).to.equal(BigNumber.from(catalystId + 1));
      expect(event.args[2]).to.eql(gemIds);
      expect(event.args[3]).to.equal(BigNumber.from(blockNumber));
    }
  }
  it('migrating assetId with epic catalyst and no gems', async function () {
    const {
      assetAttributesRegistry,
      oldCatalystMinterAsUser0,
      collectionCatalystMigrationsContractAsAdmin,
      user0
    } = await setupCollectionCatalystMigrations();
    await setupUser(user0);
    const packId = BigNumber.from(0);
    const gemIds: number[] = [];
    const quantity = 201;
    const dummyHash = "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF";
    const oldEpicCatalystId = 2;
    const emptyBytes = Buffer.from('');
    const assetId = await oldAssetMint(oldCatalystMinterAsUser0, user0, packId, dummyHash, quantity, user0, emptyBytes, oldEpicCatalystId, gemIds);
    const blockNumber = 11874541;
    await waitFor(collectionCatalystMigrationsContractAsAdmin.migrate(assetId, [], blockNumber));
    await testMigration(assetAttributesRegistry, assetId, oldEpicCatalystId, gemIds, blockNumber);
  });
  it('migrating assetId with rare catalyst and power gem', async function () {
    const {
      assetAttributesRegistry,
      oldCatalystMinterAsUser0,
      collectionCatalystMigrationsContractAsAdmin,
      user0
    } = await setupCollectionCatalystMigrations();
    await setupUser(user0);
    const powerGemId = 0;
    const packId = BigNumber.from(0);
    const gemIds: number[] = [];
    const quantity = 1500;
    const dummyHash = "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF";
    const oldRareCatalystId = 1;
    const emptyBytes = Buffer.from('');
    const assetId = await oldAssetMint(oldCatalystMinterAsUser0, user0, packId, dummyHash, quantity, user0, emptyBytes, oldRareCatalystId, gemIds);
    const blockNumber = 11874541;
    const gemIdsForMigration = [powerGemId];
    await waitFor(collectionCatalystMigrationsContractAsAdmin.migrate(assetId, gemIdsForMigration, blockNumber));
    await testMigration(assetAttributesRegistry, assetId, oldRareCatalystId, gemIdsForMigration, blockNumber);

  });
  it('migrating assetId not from admin account should fail', async function () {
    const {
      user0,
      collectionCatalystMigrationsContractAsUser0
    } = await setupCollectionCatalystMigrations();
    const assetId = BigNumber.from(
      '0x0000011100000000000000000000000000000000800000000000000000000000'
    ); const blockNumber = 11874541;
    await expect(collectionCatalystMigrationsContractAsUser0.migrate(assetId, [], blockNumber)).to.be.revertedWith("NOT_AUTHORIZED");
  });
  it('migrating assetId that does not exist in old registry should fail', async function () {
    const {
      collectionCatalystMigrationsContractAsAdmin
    } = await setupCollectionCatalystMigrations();
    const assetId = BigNumber.from(
      '0x0000000000000000000000000000000000000000800000000000000000000000'
    ); const blockNumber = 11874541;
    await expect(collectionCatalystMigrationsContractAsAdmin.migrate(assetId, [], blockNumber)).to.be.revertedWith("OLD_CATALYST_NOT_EXIST");
  });
  it('migrating assetId that has already been migrated should fail', async function () {
    const {
      assetAttributesRegistry,
      oldCatalystMinterAsUser0,
      collectionCatalystMigrationsContractAsAdmin,
      user0
    } = await setupCollectionCatalystMigrations();
    await setupUser(user0);
    const packId = 0;
    const gemIds: number[] = [];
    const quantity = 201;
    const dummyHash = "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF";
    const oldEpicCatalystId = 2;
    const emptyBytes = Buffer.from('');
    const assetId = await oldCatalystMinterAsUser0.callStatic.mint(
      user0,
      packId,
      dummyHash,
      oldEpicCatalystId,
      gemIds,
      quantity,
      user0,
      emptyBytes);
    await waitFor(oldCatalystMinterAsUser0.mint(
      user0,
      packId,
      dummyHash,
      oldEpicCatalystId,
      gemIds,
      quantity,
      user0,
      emptyBytes
    ));
    const blockNumber = 11874541;
    await waitFor(collectionCatalystMigrationsContractAsAdmin.migrate(assetId, [], blockNumber));
    await expect(collectionCatalystMigrationsContractAsAdmin.migrate(assetId, [], blockNumber)).to.be.revertedWith("ALREADY_MIGRATED");
  });
  it('batch migrating assetId not from admin account should fail', async function () {
    const {
      collectionCatalystMigrationsContractAsUser0
    } = await setupCollectionCatalystMigrations();
    await expect(collectionCatalystMigrationsContractAsUser0.batchMigrate([])).to.be.revertedWith("NOT_AUTHORIZED");
  });
  it('batchMigrate two assets', async function () {
    const {
      assetAttributesRegistry,
      oldCatalystMinterAsUser0,
      collectionCatalystMigrationsContractAsAdmin,
      user0
    } = await setupCollectionCatalystMigrations();
    await setupUser(user0);
    const powerGemId = 0;
    const packId = BigNumber.from(0);
    const gemIds: number[] = [];
    const quantity = 1500;
    const dummyHash = "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF";
    const hash = "0xFFFFFF1111FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF";
    const oldRareCatalystId = 1;
    const emptyBytes = Buffer.from('');
    const assetId1 = await oldAssetMint(oldCatalystMinterAsUser0, user0, packId, dummyHash, quantity, user0, emptyBytes, oldRareCatalystId, gemIds);
    const assetId2 = await oldAssetMint(oldCatalystMinterAsUser0, user0, BigNumber.from(1), hash, quantity, user0, emptyBytes, oldRareCatalystId, gemIds);
    const blockNumber = 11874541;
    const gemIdsForMigration = [powerGemId];
    const migrations = [{ assetId: assetId1, gemIds, blockNumber }, { assetId: assetId2, gemIds, blockNumber }];
    await waitFor(collectionCatalystMigrationsContractAsAdmin.batchMigrate(migrations));
    const record = await assetAttributesRegistry.getRecord(assetId1);
    expect(record.catalystId).to.equal(oldRareCatalystId + 1);
    expect(record.exists).to.equal(true);
    for (let i = 0; i < gemIds.length; i++) {
      expect(record.gemIds[i]).to.equal(gemIds[i]);
    }
    const assetAttributesRegistryEvents = await assetAttributesRegistry.queryFilter(
      assetAttributesRegistry.filters.CatalystApplied()
    );
    const event = assetAttributesRegistryEvents.filter(
      (e) => e.event === 'CatalystApplied'
    )[0];
    for (let i = 0; i < gemIdsForMigration.length; i++) {
      gemIdsForMigration[i]++;
    }
    expect(event.args).not.to.equal(null || undefined);
    if (event.args) {
      expect(event.args[0]).to.equal(BigNumber.from(assetId1));
      expect(event.args[1]).to.equal(BigNumber.from(oldRareCatalystId + 1));
      expect(event.args[2]).to.eql(gemIdsForMigration);
      expect(event.args[3]).to.equal(BigNumber.from(blockNumber));
    }
  });
});
