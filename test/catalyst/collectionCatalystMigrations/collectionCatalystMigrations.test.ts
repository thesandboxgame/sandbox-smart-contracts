import { expect } from '../../chai-setup';
import { BigNumber } from 'ethers';
import { waitFor } from '../../utils';
import { setupCollectionCatalystMigrations, setupUser } from './fixture';
describe('CollectionCatalystMigrations', function () {



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
  it('migrating assetId with epic catalyst and no gems', async function () {
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
    const record = await assetAttributesRegistry.getRecord(assetId);
    expect(record.catalystId).to.equal(oldEpicCatalystId + 1);
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
      expect(event.args[1]).to.equal(BigNumber.from(oldEpicCatalystId + 1));
      expect(event.args[2]).to.eql(gemIds);
      expect(event.args[3]).to.equal(BigNumber.from(blockNumber));
    }
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
  it('migrating assetId with collectionId != 0 should fail', async function () {
    const {
      collectionCatalystMigrationsContractAsAdmin
    } = await setupCollectionCatalystMigrations();
    const assetId = BigNumber.from(
      '0x0000000000000000000000000000000000000000800000000000000000000000'
    ); const blockNumber = 11874541;
    await expect(collectionCatalystMigrationsContractAsAdmin.migrate(assetId, [], blockNumber)).to.be.revertedWith("ALREADY_MIGRATED");
  });
  it('batch migrating assetId not from admin account should fail', async function () {
    const {
      collectionCatalystMigrationsContractAsUser0
    } = await setupCollectionCatalystMigrations();
    await expect(collectionCatalystMigrationsContractAsUser0.batchMigrate([])).to.be.revertedWith("NOT_AUTHORIZED");
  });

});
