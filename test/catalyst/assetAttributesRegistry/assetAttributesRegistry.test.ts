import {ethers, getUnnamedAccounts} from 'hardhat';
import {BigNumber, Event} from 'ethers';
import {expect} from '../../chai-setup';
import {setCatalyst, setupAssetAttributesRegistry} from './fixtures';
import catalysts from '../../../data/catalysts';
import gems from '../../../data/gems';
import {Block} from '@ethersproject/providers';
import {expectEventWithArgs, waitFor} from '../../utils';
describe('AssetAttributesRegistry', function () {
  function testSetCatalyst(
    record: {catalystId: number; exists: boolean; gemIds: []},
    event: Event,
    block: Block,
    gemsIds: number[],
    catalystId: number,
    assetId: BigNumber
  ) {
    expect(record.catalystId).to.equal(catalystId);
    expect(record.exists).to.equal(true);
    for (let i = 0; i < gemsIds.length; i++) {
      expect(record.gemIds[i]).to.equal(i + 1);
    }
    expect(event.args).not.to.equal(null || undefined);
    if (event.args) {
      expect(event.args[0]).to.equal(BigNumber.from(assetId));
      expect(event.args[1]).to.equal(BigNumber.from(catalystId));
      expect(event.args[2]).to.eql(gemsIds);
      expect(event.args[3]).to.equal(
        BigNumber.from(block.number).add(BigNumber.from('1'))
      );
    }
  }
  it('getRecord for non existing assetId', async function () {
    const {assetAttributesRegistry} = await setupAssetAttributesRegistry();
    const record = await assetAttributesRegistry.getRecord(0);
    expect(record.catalystId).to.equal(0);
    expect(record.exists).to.equal(false);
    expect(record.gemIds.length).to.equal(15);
  });

  it('setCatalyst for legendary catalyst with 4 gems', async function () {
    const assetId = BigNumber.from('0x1fe80000800000000000000000000000');
    const users = await getUnnamedAccounts();
    const legendaryCatalystId = catalysts[3].catalystId;
    const gemsIds = gems.filter((gem) => gem.gemId < 5).map((gem) => gem.gemId);
    const {record, event, block} = await setCatalyst(
      users[0],
      assetId,
      legendaryCatalystId,
      gemsIds,
      users[0]
    );
    testSetCatalyst(
      record,
      event,
      block,
      gemsIds,
      legendaryCatalystId,
      assetId
    );
  });

  // @review maybe we need to use assetUpgrader.extractAndSetCatalyst here ?
  it.skip('setCatalyst for epic catalyst using collectionId with 3 gems', async function () {
    const {
      assetAttributesRegistry,
      assetUpgrader,
    } = await setupAssetAttributesRegistry();
    // const assetId = BigNumber.from('0x1ff80000800000000000000000000000');
    const collectionId = BigNumber.from('0x1ff80000000000000000000000000000');
    const epicCatalystId = catalysts[2].catalystId;
    const users = await getUnnamedAccounts();
    const gemsIds = gems.filter((gem) => gem.gemId < 4).map((gem) => gem.gemId);
    // const {record, event, block} = await setCatalyst(
    //   users[0],
    //   assetId,
    //   epicCatalystId,
    //   gemsIds,
    //   users[0],
    //   collectionId
    // );
    const receipt = await assetUpgrader
      .connect(ethers.provider.getSigner(users[0]))
      .extractAndSetCatalyst(
        users[0],
        collectionId,
        epicCatalystId,
        gemsIds,
        users[0]
      );
    const extractionEvent = await expectEventWithArgs(
      assetUpgrader,
      receipt,
      'Extraction'
    );
    const assetId = extractionEvent.args[1];

    const record = await assetAttributesRegistry.getRecord(assetId);
    const assetAttributesRegistryEvents = await assetAttributesRegistry.queryFilter(
      assetAttributesRegistry.filters.CatalystApplied()
    );
    const event = assetAttributesRegistryEvents.filter(
      (e) => e.event === 'CatalystApplied'
    )[0];
    const block = await ethers.provider.getBlock('latest');

    testSetCatalyst(
      record,
      event,
      block,
      gemsIds,
      epicCatalystId,
      collectionId
    );
  });

  it('setCatalyst should fail for non minter account', async function () {
    const {assetAttributesRegistry} = await setupAssetAttributesRegistry();
    const users = await getUnnamedAccounts();
    const assetId = BigNumber.from('0x1ff80000800000000000000000000000');
    const legendaryCatalystId = catalysts[3].catalystId;
    const gemsIds = gems.filter((gem) => gem.gemId < 5).map((gem) => gem.gemId);
    await expect(
      assetAttributesRegistry
        .connect(ethers.provider.getSigner(users[0]))
        .setCatalyst(assetId, legendaryCatalystId, gemsIds)
    ).to.be.revertedWith('NOT_AUTHORIZED_MINTER');
  });

  it('setCatalyst with gems.length > MAX_NUM_GEMS should fail', async function () {
    const {assetUpgrader} = await setupAssetAttributesRegistry();
    const assetId = BigNumber.from('0x1ff80000800000000000000000000000');
    const users = await getUnnamedAccounts();
    const legendaryCatalystId = catalysts[3].catalystId;
    const gemsIds = [1, 2, 3, 4, 5, 1, 2, 3, 4, 5, 1, 2, 3, 4, 5, 1, 2, 3];
    await expect(
      assetUpgrader
        .connect(ethers.provider.getSigner(users[0]))
        .changeCatalyst(
          users[0],
          assetId,
          legendaryCatalystId,
          gemsIds,
          users[0]
        )
    ).to.be.revertedWith('GEMS_MAX_REACHED');
  });

  it('setCatalyst with gems.length > maxGemForCatalyst should fail', async function () {
    const {assetUpgrader} = await setupAssetAttributesRegistry();
    const assetId = BigNumber.from('0x1ff80000800000000000000000000000');
    const users = await getUnnamedAccounts();
    const legendaryCatalystId = catalysts[3].catalystId;
    const gemsIds = [1, 2, 3, 4, 5, 1, 2, 3, 4, 5, 1];
    await expect(
      assetUpgrader
        .connect(ethers.provider.getSigner(users[0]))
        .changeCatalyst(
          users[0],
          assetId,
          legendaryCatalystId,
          gemsIds,
          users[0]
        )
    ).to.be.revertedWith('GEMS_TOO_MANY');
  });

  it('setMigrationContract first assignment', async function () {
    const {
      assetAttributesRegistry,
      assetAttributesRegistryAdmin,
    } = await setupAssetAttributesRegistry();
    const users = await getUnnamedAccounts();
    const mockedMigrationContractAddress = users[1];

    await waitFor(
      assetAttributesRegistry
        .connect(ethers.provider.getSigner(assetAttributesRegistryAdmin))
        .setMigrationContract(mockedMigrationContractAddress)
    );

    expect(await assetAttributesRegistry.migrationContract()).to.equal(
      mockedMigrationContractAddress
    );
  });

  it('setMigrationContract first assignment should fail for non admin', async function () {
    const {assetAttributesRegistry} = await setupAssetAttributesRegistry();
    const users = await getUnnamedAccounts();
    const mockedMigrationContractAddress = users[1];
    await expect(
      assetAttributesRegistry
        .connect(ethers.provider.getSigner(users[0]))
        .setMigrationContract(mockedMigrationContractAddress)
    ).to.be.revertedWith('NOT_AUTHORIZED');
  });

  it('setMigrationContract second assignment', async function () {
    const {
      assetAttributesRegistry,
      assetAttributesRegistryAdmin,
    } = await setupAssetAttributesRegistry();
    const users = await getUnnamedAccounts();
    const mockedMigrationContractAddress = users[1];
    const newMigrationContract = users[2];

    await waitFor(
      assetAttributesRegistry
        .connect(ethers.provider.getSigner(assetAttributesRegistryAdmin))
        .setMigrationContract(mockedMigrationContractAddress)
    );

    expect(await assetAttributesRegistry.migrationContract()).to.equal(
      mockedMigrationContractAddress
    );

    await waitFor(
      assetAttributesRegistry
        .connect(ethers.provider.getSigner(mockedMigrationContractAddress))
        .setMigrationContract(newMigrationContract)
    );

    expect(await assetAttributesRegistry.migrationContract()).to.equal(
      newMigrationContract
    );
  });

  it('setMigrationContract second assignment should fail for non migrationContract', async function () {
    const {
      assetAttributesRegistry,
      assetAttributesRegistryAdmin,
    } = await setupAssetAttributesRegistry();
    const users = await getUnnamedAccounts();
    const mockedMigrationContractAddress = users[1];
    const newMigrationContract = users[2];

    await waitFor(
      assetAttributesRegistry
        .connect(ethers.provider.getSigner(assetAttributesRegistryAdmin))
        .setMigrationContract(mockedMigrationContractAddress)
    );

    expect(await assetAttributesRegistry.migrationContract()).to.equal(
      mockedMigrationContractAddress
    );

    await expect(
      assetAttributesRegistry
        .connect(ethers.provider.getSigner(assetAttributesRegistryAdmin))
        .setMigrationContract(newMigrationContract)
    ).to.be.revertedWith('NOT_AUTHORIZED_MIGRATION');
  });

  it('setCatalystWithBlockNumber should fail for non migration contract', async function () {
    const {assetAttributesRegistry} = await setupAssetAttributesRegistry();
    const users = await getUnnamedAccounts();
    const mockedMigrationContractAddress = users[1];
    const assetId = 2;
    const legendaryCatalystId = catalysts[2].catalystId;
    const gemsIds = gems.filter((gem) => gem.gemId < 4).map((gem) => gem.gemId);
    const blockNumber = 100;

    await expect(
      assetAttributesRegistry
        .connect(ethers.provider.getSigner(mockedMigrationContractAddress))
        .setCatalystWithBlockNumber(
          assetId,
          legendaryCatalystId,
          gemsIds,
          blockNumber
        )
    ).to.be.revertedWith('ONLY_FOR_MIGRATION');
  });

  it('setCatalystWithBlockNumber for epic catalyst', async function () {
    const {
      assetAttributesRegistry,
      assetAttributesRegistryAdmin,
    } = await setupAssetAttributesRegistry();
    const assetId = 2;
    const epicCatalystId = catalysts[2].catalystId;
    const gemsIds = gems.filter((gem) => gem.gemId < 4).map((gem) => gem.gemId);
    const blockNumber = 100;

    await waitFor(
      assetAttributesRegistry
        .connect(ethers.provider.getSigner(assetAttributesRegistryAdmin))
        .setMigrationContract(assetAttributesRegistryAdmin)
    );

    await waitFor(
      assetAttributesRegistry
        .connect(ethers.provider.getSigner(assetAttributesRegistryAdmin))
        .setCatalystWithBlockNumber(
          assetId,
          epicCatalystId,
          gemsIds,
          blockNumber
        )
    );

    const record = await assetAttributesRegistry.getRecord(assetId);
    expect(record.catalystId).to.equal(epicCatalystId);
    expect(record.exists).to.equal(true);
    for (let i = 0; i < gemsIds.length; i++) {
      expect(record.gemIds[i]).to.equal(i + 1);
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
      expect(event.args[1]).to.equal(BigNumber.from(epicCatalystId));
      expect(event.args[2]).to.eql(gemsIds);
      expect(event.args[3]).to.equal(BigNumber.from(blockNumber));
    }
  });

  it('addGems to rareCatalystId', async function () {
    const {
      assetAttributesRegistry,
      assetUpgrader,
    } = await setupAssetAttributesRegistry();
    const assetId = BigNumber.from(
      '0x0000000000000000000000000000000000000000800000000000000000000000'
    );
    const users = await getUnnamedAccounts();
    const gemsIds = [gems[0].gemId];
    const rareCatalystId = catalysts[1].catalystId;

    const {record} = await setCatalyst(
      users[0],
      assetId,
      rareCatalystId,
      gemsIds,
      users[0]
    );

    await waitFor(
      assetUpgrader
        .connect(ethers.provider.getSigner(users[0]))
        .addGems(users[0], assetId, [gems[1].gemId], users[0])
    );
    expect(record.exists).to.equal(true);
    for (let i = 0; i < gemsIds.length; i++) {
      expect(record.gemIds[i]).to.equal(i + 1);
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
      expect(event.args[2]).to.eql(gemsIds);
    }
  });

  // @review maybe we need to use assetUpgrader.extractAndSetCatalyst here ?
  it.skip('addGems to epic catalyst with collectionId', async function () {
    const {
      assetAttributesRegistry,
      assetUpgrader,
    } = await setupAssetAttributesRegistry();
    const assetId = BigNumber.from('0x1ff80000800000000000000000000000');
    const collectionId = BigNumber.from('0x1ff80000000000000000000000000000');
    const users = await getUnnamedAccounts();
    const gemsIds = [gems[0].gemId];
    const rareCatalystId = catalysts[1].catalystId;

    const {record} = await setCatalyst(
      users[0],
      assetId,
      rareCatalystId,
      gemsIds,
      users[0],
      collectionId
    );

    await waitFor(
      assetUpgrader
        .connect(ethers.provider.getSigner(users[0]))
        .addGems(users[0], assetId, [gems[1].gemId], users[0])
    );
    expect(record.exists).to.equal(true);
    for (let i = 0; i < gemsIds.length; i++) {
      expect(record.gemIds[i]).to.equal(i + 1);
    }
    const assetAttributesRegistryEvents = await assetAttributesRegistry.queryFilter(
      assetAttributesRegistry.filters.CatalystApplied()
    );
    const event = assetAttributesRegistryEvents.filter(
      (e) => e.event === 'CatalystApplied'
    )[0];

    expect(event.args).not.to.equal(null || undefined);
    if (event.args) {
      expect(event.args[0]).to.equal(BigNumber.from(collectionId));
      expect(event.args[2]).to.eql(gemsIds);
    }
  });

  it('should fail for non-nft', async function () {
    const assetId = BigNumber.from(
      '9435802489392532849329415225251965785597302377102806428109850929297113483264'
    );
    const users = await getUnnamedAccounts();
    const gemsIds = [gems[0].gemId];
    const rareCatalystId = catalysts[1].catalystId;

    await expect(
      setCatalyst(users[0], assetId, rareCatalystId, gemsIds, users[1])
    ).to.be.revertedWith('INVALID_NOT_NFT');
  });

  it('addGems should fail for non minter account', async function () {
    const {assetAttributesRegistry} = await setupAssetAttributesRegistry();
    const assetId = BigNumber.from(
      '0x0000000000000000000000000000000000000000800000000000000000000000'
    );
    let gemsIds = [gems[0].gemId];
    const rareCatalystId = catalysts[1].catalystId;
    const users = await getUnnamedAccounts();
    await setCatalyst(users[0], assetId, rareCatalystId, gemsIds, users[0]);
    gemsIds = gems.filter((gem) => gem.gemId < 5).map((gem) => gem.gemId);
    await expect(
      assetAttributesRegistry
        .connect(ethers.provider.getSigner(users[0]))
        .addGems(assetId, gemsIds)
    ).to.be.revertedWith('NOT_AUTHORIZED_MINTER');
  });

  it('addGems should fail for empty gemsId array', async function () {
    const {assetUpgrader} = await setupAssetAttributesRegistry();
    const users = await getUnnamedAccounts();
    const assetId = BigNumber.from(
      '0x0000000000000000000000000000000000000000800000000000000000000000'
    );
    let gemsIds = [];
    gemsIds = gems.filter((gem) => gem.gemId < 5).map((gem) => gem.gemId);
    await expect(
      assetUpgrader
        .connect(ethers.provider.getSigner(users[0]))
        .addGems(users[0], assetId, gemsIds, users[0])
    ).to.be.revertedWith('NO_CATALYST_SET');
  });

  it('addGems should fail for non existing catalystId', async function () {
    const {assetUpgrader} = await setupAssetAttributesRegistry();
    const users = await getUnnamedAccounts();
    const assetId = BigNumber.from(
      '0x0000000000000000000000000000000000000000800000000000000000000000'
    );
    let gemsIds = [];
    gemsIds = gems.filter((gem) => gem.gemId < 5).map((gem) => gem.gemId);
    await expect(
      assetUpgrader
        .connect(ethers.provider.getSigner(users[0]))
        .addGems(users[0], assetId, gemsIds, users[0])
    ).to.be.revertedWith('NO_CATALYST_SET');
  });

  it('should fail for gemId = 0', async function () {
    const assetId = BigNumber.from(
      '0x0000000000000000000000000000000000000000800000000000000000000000'
    );
    const gemsIds = [0];
    const rareCatalystId = catalysts[1].catalystId;
    const users = await getUnnamedAccounts();

    await expect(
      setCatalyst(users[0], assetId, rareCatalystId, gemsIds, users[1])
    ).to.be.revertedWith('GEM_DOES_NOT_EXIST');
  });

  it('addGems should fail when trying to add two gems in total to commonCatalyst', async function () {
    const {assetUpgrader} = await setupAssetAttributesRegistry();
    const assetId = BigNumber.from(
      '0x0000000000000000000000000000000000000000800000000000000000000000'
    );
    const users = await getUnnamedAccounts();
    const gemsIds = [gems[0].gemId];
    const commonCatalystId = catalysts[0].catalystId;

    await setCatalyst(users[0], assetId, commonCatalystId, gemsIds, users[0]);
    await expect(
      assetUpgrader
        .connect(ethers.provider.getSigner(users[0]))
        .addGems(users[0], assetId, [gems[1].gemId], users[0])
    ).to.be.revertedWith('GEMS_TOO_MANY');
  });
});
