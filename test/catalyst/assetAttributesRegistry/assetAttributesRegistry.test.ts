import {ethers, getUnnamedAccounts} from 'hardhat';
import {BigNumber} from '@ethersproject/bignumber';
import {expect} from '../../chai-setup';
import {setCatalyst, setupAssetAttributesRegistry} from './fixtures';
import catalysts from '../../../data/catalysts';
import gems from '../../../data/gems';

describe('AssetAttributesRegistry', function () {
  // async function setCatalyst(
  //   assetId: BigNumber,
  //   catalystId: number,
  //   gemsIds: number[]
  // ) {
  //   const {
  //     assetAttributesRegistry,
  //     assetAttributesRegistryAdmin,
  //   } = await setupAssetAttributesRegistry();
  //   await assetAttributesRegistry
  //     .connect(ethers.provider.getSigner(assetAttributesRegistryAdmin))
  //     .setCatalyst(assetId, catalystId, gemsIds);
  //   const record = await assetAttributesRegistry.getRecord(assetId);
  //   expect(record.catalystId).to.equal(catalystId);
  //   expect(record.exists).to.equal(true);
  //   for (let i = 0; i < gemsIds.length; i++) {
  //     expect(record.gemIds[i]).to.equal(i + 1);
  //   }
  //   const assetAttributesRegistryEvents = await assetAttributesRegistry.queryFilter(
  //     assetAttributesRegistry.filters.CatalystApplied()
  //   );
  //   const event = assetAttributesRegistryEvents.filter(
  //     (e) => e.event === 'CatalystApplied'
  //   )[0];
  //   const block = await ethers.provider.getBlock('latest');

  //   expect(event.args).not.to.equal(null || undefined);
  //   if (event.args) {
  //     expect(event.args[0]).to.equal(BigNumber.from(assetId));
  //     expect(event.args[1]).to.equal(BigNumber.from(catalystId));
  //     expect(event.args[2]).to.eql(gemsIds);
  //     expect(event.args[3]).to.equal(
  //       BigNumber.from(block.number).add(BigNumber.from('1'))
  //     );
  //   }
  // }

  function testSetCatalyst(
    record: any,
    event: any,
    block: any,
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
    const assetId = BigNumber.from('1');
    const legendaryCatalystId = catalysts[3].catalystId;
    const gemsIds = gems.filter((gem) => gem.gemId < 5).map((gem) => gem.gemId);
    const {record, event, block} = await setCatalyst(
      assetId,
      legendaryCatalystId,
      gemsIds
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

  it('setCatalyst should fail for non minter account', async function () {
    const {assetAttributesRegistry} = await setupAssetAttributesRegistry();
    const users = await getUnnamedAccounts();
    const assetId = 1;
    const legendaryCatalystId = catalysts[3].catalystId;
    const gemsIds = gems.filter((gem) => gem.gemId < 5).map((gem) => gem.gemId);
    await expect(
      assetAttributesRegistry
        .connect(ethers.provider.getSigner(users[0]))
        .setCatalyst(assetId, legendaryCatalystId, gemsIds)
    ).to.be.revertedWith('NOT_AUTHORIZED_MINTER');
  });

  it('setCatalyst with gems.length > MAX_NUM_GEMS should fail', async function () {
    const {
      assetAttributesRegistry,
      assetAttributesRegistryAdmin,
    } = await setupAssetAttributesRegistry();
    const assetId = 1;
    const legendaryCatalystId = catalysts[3].catalystId;
    const gemsIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
    await expect(
      assetAttributesRegistry
        .connect(ethers.provider.getSigner(assetAttributesRegistryAdmin))
        .setCatalyst(assetId, legendaryCatalystId, gemsIds)
    ).to.be.revertedWith('GEMS_MAX_REACHED');
  });

  it('setCatalyst with gems.length > maxGemForCatalyst should fail', async function () {
    const {
      assetAttributesRegistry,
      assetAttributesRegistryAdmin,
    } = await setupAssetAttributesRegistry();
    const assetId = 1;
    const legendaryCatalystId = catalysts[3].catalystId;
    const gemsIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    await expect(
      assetAttributesRegistry
        .connect(ethers.provider.getSigner(assetAttributesRegistryAdmin))
        .setCatalyst(assetId, legendaryCatalystId, gemsIds)
    ).to.be.revertedWith('GEMS_TOO_MANY');
  });

  it('setMigrationContract first assignment', async function () {
    const {
      assetAttributesRegistry,
      assetAttributesRegistryAdmin,
    } = await setupAssetAttributesRegistry();
    const users = await getUnnamedAccounts();
    const mockedMigrationContractAddress = users[1];

    await assetAttributesRegistry
      .connect(ethers.provider.getSigner(assetAttributesRegistryAdmin))
      .setMigrationContract(mockedMigrationContractAddress);

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

    await assetAttributesRegistry
      .connect(ethers.provider.getSigner(assetAttributesRegistryAdmin))
      .setMigrationContract(mockedMigrationContractAddress);

    expect(await assetAttributesRegistry.migrationContract()).to.equal(
      mockedMigrationContractAddress
    );

    await assetAttributesRegistry
      .connect(ethers.provider.getSigner(mockedMigrationContractAddress))
      .setMigrationContract(newMigrationContract);

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

    await assetAttributesRegistry
      .connect(ethers.provider.getSigner(assetAttributesRegistryAdmin))
      .setMigrationContract(mockedMigrationContractAddress);

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

    await assetAttributesRegistry
      .connect(ethers.provider.getSigner(assetAttributesRegistryAdmin))
      .setMigrationContract(assetAttributesRegistryAdmin);

    await assetAttributesRegistry
      .connect(ethers.provider.getSigner(assetAttributesRegistryAdmin))
      .setCatalystWithBlockNumber(
        assetId,
        epicCatalystId,
        gemsIds,
        blockNumber
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
      assetAttributesRegistryAdmin,
    } = await setupAssetAttributesRegistry();
    const assetId = BigNumber.from(
      '0x0000000000000000000000000000000000000000800000000000000000000000'
    );
    const gemsIds = [gems[0].gemId];
    const rareCatalystId = catalysts[1].catalystId;

    await setCatalyst(assetId, rareCatalystId, gemsIds);

    await assetAttributesRegistry
      .connect(ethers.provider.getSigner(assetAttributesRegistryAdmin))
      .addGems(assetId, [gems[1].gemId]);
    const record = await assetAttributesRegistry.getRecord(assetId);
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

  it('addGems should fail for non-nft', async function () {
    const {
      assetAttributesRegistry,
      assetAttributesRegistryAdmin,
    } = await setupAssetAttributesRegistry();
    const assetId = BigNumber.from(
      '9435802489392532849329415225251965785597302377102806428109850929297113483264'
    );
    const gemsIds = [gems[0].gemId];
    const rareCatalystId = catalysts[1].catalystId;

    await setCatalyst(assetId, rareCatalystId, gemsIds);
    await expect(
      assetAttributesRegistry
        .connect(ethers.provider.getSigner(assetAttributesRegistryAdmin))
        .addGems(assetId, [gems[1].gemId])
    ).to.be.revertedWith('INVALID_NOT_NFT');
  });

  it('addGems should fail for non minter account', async function () {
    const {assetAttributesRegistry} = await setupAssetAttributesRegistry();
    const assetId = BigNumber.from(
      '0x0000000000000000000000000000000000000000800000000000000000000000'
    );
    let gemsIds = [gems[0].gemId];
    const rareCatalystId = catalysts[1].catalystId;
    await setCatalyst(assetId, rareCatalystId, gemsIds);
    const users = await getUnnamedAccounts();
    gemsIds = gems.filter((gem) => gem.gemId < 5).map((gem) => gem.gemId);
    await expect(
      assetAttributesRegistry
        .connect(ethers.provider.getSigner(users[0]))
        .addGems(assetId, gemsIds)
    ).to.be.revertedWith('NOT_AUTHORIZED_MINTER');
  });

  it('addGems should fail for empty gemsId array', async function () {
    const {
      assetAttributesRegistry,
      assetAttributesRegistryAdmin,
    } = await setupAssetAttributesRegistry();
    const assetId = BigNumber.from(
      '0x0000000000000000000000000000000000000000800000000000000000000000'
    );
    let gemsIds = [];
    gemsIds = gems.filter((gem) => gem.gemId < 5).map((gem) => gem.gemId);
    await expect(
      assetAttributesRegistry
        .connect(ethers.provider.getSigner(assetAttributesRegistryAdmin))
        .addGems(assetId, gemsIds)
    ).to.be.revertedWith('NO_CATALYST_SET');
  });

  it('addGems should fail for non existing catalystId', async function () {
    const {
      assetAttributesRegistry,
      assetAttributesRegistryAdmin,
    } = await setupAssetAttributesRegistry();
    const assetId = BigNumber.from(
      '0x0000000000000000000000000000000000000000800000000000000000000000'
    );
    let gemsIds = [];
    gemsIds = gems.filter((gem) => gem.gemId < 5).map((gem) => gem.gemId);
    await expect(
      assetAttributesRegistry
        .connect(ethers.provider.getSigner(assetAttributesRegistryAdmin))
        .addGems(assetId, gemsIds)
    ).to.be.revertedWith('NO_CATALYST_SET');
  });

  it('addGems should fail for gemId = 0', async function () {
    const {
      assetAttributesRegistry,
      assetAttributesRegistryAdmin,
    } = await setupAssetAttributesRegistry();
    const assetId = BigNumber.from(
      '0x0000000000000000000000000000000000000000800000000000000000000000'
    );
    const gemsIds = [gems[0].gemId];
    const rareCatalystId = catalysts[1].catalystId;

    await setCatalyst(assetId, rareCatalystId, gemsIds);

    await expect(
      assetAttributesRegistry
        .connect(ethers.provider.getSigner(assetAttributesRegistryAdmin))
        .addGems(assetId, [0])
    ).to.be.revertedWith('INVALID_GEM_ID');
  });

  it('addGems should fail when trying to add two gems in total to commonCatalyst', async function () {
    const {
      assetAttributesRegistry,
      assetAttributesRegistryAdmin,
    } = await setupAssetAttributesRegistry();
    const assetId = BigNumber.from(
      '0x0000000000000000000000000000000000000000800000000000000000000000'
    );
    const gemsIds = [gems[0].gemId];
    const commonCatalystId = catalysts[0].catalystId;

    await setCatalyst(assetId, commonCatalystId, gemsIds);
    await expect(
      assetAttributesRegistry
        .connect(ethers.provider.getSigner(assetAttributesRegistryAdmin))
        .addGems(assetId, [gems[1].gemId])
    ).to.be.revertedWith('GEMS_TOO_MANY');
  });
});
