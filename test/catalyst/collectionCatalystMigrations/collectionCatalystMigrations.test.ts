import { expect } from '../../chai-setup';
import { BigNumber } from 'ethers';
import { waitFor } from '../../utils';
import { setupCollectionCatalystMigrations, setupUser } from './fixture';
describe('CollectionCatalystMigrations', function () {



  it('migrating assetId not from admin account should fail', async function () {
    const {
      user0
    } = await setupCollectionCatalystMigrations();
    const assetId = BigNumber.from(
      '0x0000011100000000000000000000000000000000800000000000000000000000'
    ); const blockNumber = 11874541;
    await expect(user0.migrate(assetId, [], blockNumber)).to.be.revertedWith("NOT_AUTHORIZED");
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


  it('migrating assetId', async function () {
    const {
      oldCatalystMinterAsUser0,
      collectionCatalystMigrationsContractAsAdmin,
      user0
    } = await setupCollectionCatalystMigrations();
    await setupUser(user0);
    //
    const packId = 0;
    const gemIds = [0, 0, 0];
    const quantity = 201;
    const dummyHash = "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF";
    const EpicCatalyst = 2;
    const emptyBytes = Buffer.from('');
    await waitFor(oldCatalystMinterAsUser0.mint(
      user0,
      packId,
      dummyHash,
      EpicCatalyst,
      gemIds,
      quantity,
      user0,
      emptyBytes
    ));


    //
    const assetId = BigNumber.from(
      '0x0000000000000000000000000000000000000000800000000000000000000000'
    ); const blockNumber = 11874541;
    await expect(collectionCatalystMigrationsContractAsAdmin.migrate(assetId, [], blockNumber)).to.be.revertedWith("ALREADY_MIGRATED");
  });


  it('migrating assetId that has already been migrated should fail', async function () {
    const {
      collectionCatalystMigrationsContractAsAdmin
    } = await setupCollectionCatalystMigrations();
    const assetId = BigNumber.from(
      '0x0000000000000000000000000000000000000000800000000000000000000000'
    ); const blockNumber = 11874541;
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
      user0
    } = await setupCollectionCatalystMigrations();
    await expect(user0.batchMigrate([])).to.be.revertedWith("NOT_AUTHORIZED");
  });

});
