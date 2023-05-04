import {ethers} from 'hardhat';
import {Address, Receipt} from 'hardhat-deploy/types';
import {BigNumber, Contract, Event} from 'ethers';
import {expect} from '../../../chai-setup';
import catalysts from '../../../../data/catalysts';
import gems from '../../../../data/gems';
import {setupAssetAttributesRegistryGemsAndCatalysts} from './fixtures';
import {findEvents} from '../../../utils';
import {getReceiptObject, prepareGemEventData, transferSand} from '../utils';

const NFT_SUPPLY = 1;

const mintOptions = {
  from: ethers.constants.AddressZero,
  packId: BigNumber.from('1'),
  metaDataHash: ethers.utils.keccak256('0x42'),
  catalystId: catalysts[1].catalystId,
  gemIds: [gems[0].gemId],
  quantity: NFT_SUPPLY,
  to: ethers.constants.AddressZero,
  data: Buffer.from(''),
};

function minValue(gems: number): number {
  return (gems - 1) * 5 + 1;
}

describe('AssetAttributesRegistry: getAttributes', function () {
  async function getMintReceipt(
    catalystOwner: Address,
    catId: number,
    gemIds: number[],
    minter: Contract
  ): Promise<Receipt> {
    const mintData = {
      from: catalystOwner,
      to: catalystOwner,
      packId: mintOptions.packId,
      metadataHash: mintOptions.metaDataHash,
      data: mintOptions.data,
    };
    const numberOfGemsBurnPerAsset = await minter.numberOfGemsBurnPerAsset();
    const numberOfCatalystBurnPerAsset = await minter.numberOfCatalystBurnPerAsset();
    const quantitiesByCatalystId = await minter.quantitiesByCatalystId(catId);

    return await minter.mintWithCatalyst(
      mintData,
      catId,
      gemIds,
      quantitiesByCatalystId,
      numberOfCatalystBurnPerAsset,
      numberOfGemsBurnPerAsset
    );
  }

  async function getCatEvents(
    assetAttributesRegistry: Contract,
    receipt: Receipt
  ): Promise<Event[]> {
    return await findEvents(
      assetAttributesRegistry,
      'CatalystApplied',
      receipt.blockHash
    );
  }

  interface AssetMintObj {
    id: BigNumber;
    receipt: Receipt;
  }

  async function getAssetId(
    catalystOwner: Address,
    assetAttributesRegistry: Contract,
    catalystId: number,
    gemIds: number[],
    minter: Contract
  ): Promise<AssetMintObj> {
    const mintReceipt = await getMintReceipt(
      catalystOwner,
      catalystId,
      gemIds,
      minter
    );
    const catalystAppliedEvents = await getCatEvents(
      assetAttributesRegistry,
      mintReceipt
    );
    const args = catalystAppliedEvents[0].args;
    const assetId = args ? args[0] : null;
    return {id: assetId, receipt: mintReceipt};
  }

  describe('getAttributes: minting', function () {
    it('can get attributes for 1 gem', async function () {
      const {
        assetAttributesRegistry,
        assetMinterAsUser0,
        catalystOwner,
      } = await setupAssetAttributesRegistryGemsAndCatalysts();
      const {id: assetId, receipt: mintReceipt} = await getAssetId(
        catalystOwner,
        assetAttributesRegistry,
        1,
        [1],
        assetMinterAsUser0
      );
      const {gemEvents} = await prepareGemEventData(assetAttributesRegistry, [
        await getReceiptObject(mintReceipt, 1),
      ]);
      const attributes = await assetAttributesRegistry.getAttributes(
        assetId,
        gemEvents
      );

      expect(attributes[1]).to.be.within(minValue(1), 25);
    });

    it('can get attributes for 2 identical gems', async function () {
      const {
        assetAttributesRegistry,
        assetMinterAsUser0,
        catalystOwner,
      } = await setupAssetAttributesRegistryGemsAndCatalysts();
      const {id: assetId, receipt: mintReceipt} = await getAssetId(
        catalystOwner,
        assetAttributesRegistry,
        2,
        [2, 2],
        assetMinterAsUser0
      );
      const {gemEvents} = await prepareGemEventData(assetAttributesRegistry, [
        await getReceiptObject(mintReceipt, 1),
      ]);
      const attributes = await assetAttributesRegistry.getAttributes(
        assetId,
        gemEvents
      );

      expect(attributes[2]).to.be.within(26, 50);
    });

    it('can get attributes for 3 identical gems', async function () {
      const {
        assetAttributesRegistry,
        assetMinterAsUser0,
        catalystOwner,
      } = await setupAssetAttributesRegistryGemsAndCatalysts();
      const {id: assetId, receipt: mintReceipt} = await getAssetId(
        catalystOwner,
        assetAttributesRegistry,
        3,
        [3, 3, 3],
        assetMinterAsUser0
      );
      const {gemEvents} = await prepareGemEventData(assetAttributesRegistry, [
        await getReceiptObject(mintReceipt, 1),
      ]);
      const attributes = await assetAttributesRegistry.getAttributes(
        assetId,
        gemEvents
      );

      expect(attributes[3]).to.be.within(51, 75);
    });

    it('can get attributes for 4 identical gems', async function () {
      const {
        assetAttributesRegistry,
        assetMinterAsUser0,
        catalystOwner,
      } = await setupAssetAttributesRegistryGemsAndCatalysts();
      const {id: assetId, receipt: mintReceipt} = await getAssetId(
        catalystOwner,
        assetAttributesRegistry,
        4,
        [4, 4, 4, 4],
        assetMinterAsUser0
      );
      const {gemEvents} = await prepareGemEventData(assetAttributesRegistry, [
        await getReceiptObject(mintReceipt, 1),
      ]);
      const attributes = await assetAttributesRegistry.getAttributes(
        assetId,
        gemEvents
      );

      expect(attributes[4]).to.be.within(76, 100);
    });

    it('can get attributes for 2 different gems', async function () {
      const {
        assetAttributesRegistry,
        assetMinterAsUser0,
        catalystOwner,
      } = await setupAssetAttributesRegistryGemsAndCatalysts();
      const {id: assetId, receipt: mintReceipt} = await getAssetId(
        catalystOwner,
        assetAttributesRegistry,
        2,
        [1, 2],
        assetMinterAsUser0
      );
      const {gemEvents} = await prepareGemEventData(assetAttributesRegistry, [
        await getReceiptObject(mintReceipt, 1),
      ]);
      const attributes = await assetAttributesRegistry.getAttributes(
        assetId,
        gemEvents
      );

      expect(attributes[1]).to.be.within(minValue(2), 25);
      expect(attributes[2]).to.be.within(minValue(2), 25);
    });

    it('can get attributes for 3 different gems', async function () {
      const {
        assetAttributesRegistry,
        assetMinterAsUser0,
        catalystOwner,
      } = await setupAssetAttributesRegistryGemsAndCatalysts();
      const {id: assetId, receipt: mintReceipt} = await getAssetId(
        catalystOwner,
        assetAttributesRegistry,
        3,
        [1, 2, 3],
        assetMinterAsUser0
      );
      const {gemEvents} = await prepareGemEventData(assetAttributesRegistry, [
        await getReceiptObject(mintReceipt, 1),
      ]);
      const attributes = await assetAttributesRegistry.getAttributes(
        assetId,
        gemEvents
      );

      expect(attributes[1]).to.be.within(minValue(3), 25);
      expect(attributes[2]).to.be.within(minValue(3), 25);
      expect(attributes[3]).to.be.within(minValue(3), 25);
    });

    it('can get attributes for 4 different gems', async function () {
      const {
        assetAttributesRegistry,
        assetMinterAsUser0,
        catalystOwner,
      } = await setupAssetAttributesRegistryGemsAndCatalysts();
      const {id: assetId, receipt: mintReceipt} = await getAssetId(
        catalystOwner,
        assetAttributesRegistry,
        4,
        [1, 2, 3, 4],
        assetMinterAsUser0
      );
      const {gemEvents} = await prepareGemEventData(assetAttributesRegistry, [
        await getReceiptObject(mintReceipt, 1),
      ]);
      const attributes = await assetAttributesRegistry.getAttributes(
        assetId,
        gemEvents
      );

      expect(attributes[1]).to.be.within(minValue(4), 25);
      expect(attributes[2]).to.be.within(minValue(4), 25);
      expect(attributes[3]).to.be.within(minValue(4), 25);
      expect(attributes[4]).to.be.within(minValue(4), 25);
    });

    it('can get attributes for 2 identical gems + 1 different gem', async function () {
      const {
        assetAttributesRegistry,
        assetMinterAsUser0,
        catalystOwner,
      } = await setupAssetAttributesRegistryGemsAndCatalysts();
      const {id: assetId, receipt: mintReceipt} = await getAssetId(
        catalystOwner,
        assetAttributesRegistry,
        3,
        [1, 1, 2],
        assetMinterAsUser0
      );
      const {gemEvents} = await prepareGemEventData(assetAttributesRegistry, [
        await getReceiptObject(mintReceipt, 1),
      ]);
      const attributes = await assetAttributesRegistry.getAttributes(
        assetId,
        gemEvents
      );

      expect(attributes[1]).to.be.within(26, 50);
      expect(attributes[2]).to.be.within(minValue(3), 25);
    });

    it('can get attributes for 3 identical gems + 1 different gem', async function () {
      const {
        assetAttributesRegistry,
        assetMinterAsUser0,
        catalystOwner,
      } = await setupAssetAttributesRegistryGemsAndCatalysts();
      const {id: assetId, receipt: mintReceipt} = await getAssetId(
        catalystOwner,
        assetAttributesRegistry,
        4,
        [2, 2, 2, 3],
        assetMinterAsUser0
      );
      const {gemEvents} = await prepareGemEventData(assetAttributesRegistry, [
        await getReceiptObject(mintReceipt, 1),
      ]);
      const attributes = await assetAttributesRegistry.getAttributes(
        assetId,
        gemEvents
      );

      expect(attributes[2]).to.be.within(51, 75);
      expect(attributes[3]).to.be.within(minValue(4), 25);
    });

    it('can get attributes for 2 identical gems + 2 different identical gems', async function () {
      const {
        assetAttributesRegistry,
        assetMinterAsUser0,
        catalystOwner,
      } = await setupAssetAttributesRegistryGemsAndCatalysts();
      const {id: assetId, receipt: mintReceipt} = await getAssetId(
        catalystOwner,
        assetAttributesRegistry,
        4,
        [2, 2, 3, 3],
        assetMinterAsUser0
      );
      const {gemEvents} = await prepareGemEventData(assetAttributesRegistry, [
        await getReceiptObject(mintReceipt, 1),
      ]);
      const attributes = await assetAttributesRegistry.getAttributes(
        assetId,
        gemEvents
      );

      expect(attributes[2]).to.be.within(26, 50);
      expect(attributes[3]).to.be.within(26, 50);
    });
  });

  describe('getAttributes: upgrading', function () {
    it('can get attributes when adding 1 gem to an asset with an empty catalyst', async function () {
      const {
        catalystOwner,
        sandContract,
        assetAttributesRegistry,
        assetMinterAsUser0,
        assetUpgraderAsUser0,
      } = await setupAssetAttributesRegistryGemsAndCatalysts();
      await transferSand(
        sandContract,
        catalystOwner,
        BigNumber.from(100000).mul(`1000000000000000000`)
      );
      const {id: assetId, receipt: mintReceipt} = await getAssetId(
        catalystOwner,
        assetAttributesRegistry,
        4,
        [],
        assetMinterAsUser0
      );

      const upgradeReceipt = await assetUpgraderAsUser0.addGems(
        catalystOwner,
        assetId,
        [1],
        catalystOwner
      );

      const {gemEvents} = await prepareGemEventData(assetAttributesRegistry, [
        await getReceiptObject(mintReceipt, 1),
        await getReceiptObject(upgradeReceipt, 3),
      ]);

      const attributes = await assetAttributesRegistry.getAttributes(
        assetId,
        gemEvents
      );

      expect(attributes[1]).to.be.within(minValue(1), 25);
    });

    it('can get attributes when adding 2 identical gems to an asset with an empty catalyst', async function () {
      const {
        catalystOwner,
        sandContract,
        assetAttributesRegistry,
        assetMinterAsUser0,
        assetUpgraderAsUser0,
      } = await setupAssetAttributesRegistryGemsAndCatalysts();
      await transferSand(
        sandContract,
        catalystOwner,
        BigNumber.from(100000).mul(`1000000000000000000`)
      );
      const {id: assetId, receipt: mintReceipt} = await getAssetId(
        catalystOwner,
        assetAttributesRegistry,
        4,
        [],
        assetMinterAsUser0
      );
      const upgradeReceipt = await assetUpgraderAsUser0.addGems(
        catalystOwner,
        assetId,
        [2, 2],
        catalystOwner
      );

      const {gemEvents} = await prepareGemEventData(assetAttributesRegistry, [
        await getReceiptObject(mintReceipt, 1),
        await getReceiptObject(upgradeReceipt, 3),
      ]);
      const attributes = await assetAttributesRegistry.getAttributes(
        assetId,
        gemEvents
      );

      expect(attributes[2]).to.be.within(26, 50);
    });

    it('can get attributes when adding 3 identical gems to an asset with an empty catalyst', async function () {
      const {
        catalystOwner,
        sandContract,
        assetAttributesRegistry,
        assetMinterAsUser0,
        assetUpgraderAsUser0,
      } = await setupAssetAttributesRegistryGemsAndCatalysts();
      await transferSand(
        sandContract,
        catalystOwner,
        BigNumber.from(100000).mul(`1000000000000000000`)
      );
      const {id: assetId, receipt: mintReceipt} = await getAssetId(
        catalystOwner,
        assetAttributesRegistry,
        4,
        [],
        assetMinterAsUser0
      );
      const upgradeReceipt = await assetUpgraderAsUser0.addGems(
        catalystOwner,
        assetId,
        [3, 3, 3],
        catalystOwner
      );

      const {gemEvents} = await prepareGemEventData(assetAttributesRegistry, [
        await getReceiptObject(mintReceipt, 1),
        await getReceiptObject(upgradeReceipt, 3),
      ]);
      const attributes = await assetAttributesRegistry.getAttributes(
        assetId,
        gemEvents
      );

      expect(attributes[3]).to.be.within(51, 75);
    });

    it('can get attributes when adding 4 identical gems to an asset with an empty catalyst', async function () {
      const {
        catalystOwner,
        sandContract,
        assetAttributesRegistry,
        assetMinterAsUser0,
        assetUpgraderAsUser0,
      } = await setupAssetAttributesRegistryGemsAndCatalysts();
      await transferSand(
        sandContract,
        catalystOwner,
        BigNumber.from(100000).mul(`1000000000000000000`)
      );
      const {id: assetId, receipt: mintReceipt} = await getAssetId(
        catalystOwner,
        assetAttributesRegistry,
        4,
        [],
        assetMinterAsUser0
      );
      const upgradeReceipt = await assetUpgraderAsUser0.addGems(
        catalystOwner,
        assetId,
        [4, 4, 4, 4],
        catalystOwner
      );

      const {gemEvents} = await prepareGemEventData(assetAttributesRegistry, [
        await getReceiptObject(mintReceipt, 1),
        await getReceiptObject(upgradeReceipt, 3),
      ]);
      const attributes = await assetAttributesRegistry.getAttributes(
        assetId,
        gemEvents
      );

      expect(attributes[4]).to.be.within(76, 100);
    });

    it('can get attributes when adding 2 different gems to an asset with an empty catalyst', async function () {
      const {
        catalystOwner,
        sandContract,
        assetAttributesRegistry,
        assetMinterAsUser0,
        assetUpgraderAsUser0,
      } = await setupAssetAttributesRegistryGemsAndCatalysts();
      await transferSand(
        sandContract,
        catalystOwner,
        BigNumber.from(100000).mul(`1000000000000000000`)
      );
      const {id: assetId, receipt: mintReceipt} = await getAssetId(
        catalystOwner,
        assetAttributesRegistry,
        4,
        [],
        assetMinterAsUser0
      );
      const upgradeReceipt = await assetUpgraderAsUser0.addGems(
        catalystOwner,
        assetId,
        [1, 2],
        catalystOwner
      );

      const {gemEvents} = await prepareGemEventData(assetAttributesRegistry, [
        await getReceiptObject(mintReceipt, 1),
        await getReceiptObject(upgradeReceipt, 3),
      ]);
      const attributes = await assetAttributesRegistry.getAttributes(
        assetId,
        gemEvents
      );

      expect(attributes[1]).to.be.within(minValue(2), 25);
      expect(attributes[2]).to.be.within(minValue(2), 25);
    });

    it('can get attributes when adding 3 different gems to an asset with an empty catalyst', async function () {
      const {
        catalystOwner,
        sandContract,
        assetAttributesRegistry,
        assetMinterAsUser0,
        assetUpgraderAsUser0,
      } = await setupAssetAttributesRegistryGemsAndCatalysts();
      await transferSand(
        sandContract,
        catalystOwner,
        BigNumber.from(100000).mul(`1000000000000000000`)
      );
      const {id: assetId, receipt: mintReceipt} = await getAssetId(
        catalystOwner,
        assetAttributesRegistry,
        4,
        [],
        assetMinterAsUser0
      );
      const upgradeReceipt = await assetUpgraderAsUser0.addGems(
        catalystOwner,
        assetId,
        [1, 2, 3],
        catalystOwner
      );

      const {gemEvents} = await prepareGemEventData(assetAttributesRegistry, [
        await getReceiptObject(mintReceipt, 1),
        await getReceiptObject(upgradeReceipt, 3),
      ]);
      const attributes = await assetAttributesRegistry.getAttributes(
        assetId,
        gemEvents
      );

      expect(attributes[1]).to.be.within(minValue(3), 25);
      expect(attributes[2]).to.be.within(minValue(3), 25);
      expect(attributes[3]).to.be.within(minValue(3), 25);
    });

    it('can get attributes when adding 4 different gems to an asset with an empty catalyst', async function () {
      const {
        catalystOwner,
        sandContract,
        assetAttributesRegistry,
        assetMinterAsUser0,
        assetUpgraderAsUser0,
      } = await setupAssetAttributesRegistryGemsAndCatalysts();
      await transferSand(
        sandContract,
        catalystOwner,
        BigNumber.from(100000).mul(`1000000000000000000`)
      );
      const {id: assetId, receipt: mintReceipt} = await getAssetId(
        catalystOwner,
        assetAttributesRegistry,
        4,
        [],
        assetMinterAsUser0
      );
      const upgradeReceipt = await assetUpgraderAsUser0.addGems(
        catalystOwner,
        assetId,
        [1, 2, 3, 4],
        catalystOwner
      );

      const {gemEvents} = await prepareGemEventData(assetAttributesRegistry, [
        await getReceiptObject(mintReceipt, 1),
        await getReceiptObject(upgradeReceipt, 3),
      ]);
      const attributes = await assetAttributesRegistry.getAttributes(
        assetId,
        gemEvents
      );

      expect(attributes[1]).to.be.within(minValue(4), 25);
      expect(attributes[2]).to.be.within(minValue(4), 25);
      expect(attributes[3]).to.be.within(minValue(4), 25);
      expect(attributes[4]).to.be.within(minValue(4), 25);
    });

    it('can get attributes when adding 1 similar gem to an asset with existing gems', async function () {
      const {
        catalystOwner,
        sandContract,
        assetAttributesRegistry,
        assetMinterAsUser0,
        assetUpgraderAsUser0,
      } = await setupAssetAttributesRegistryGemsAndCatalysts();
      await transferSand(
        sandContract,
        catalystOwner,
        BigNumber.from(100000).mul(`1000000000000000000`)
      );
      const {id: assetId, receipt: mintReceipt} = await getAssetId(
        catalystOwner,
        assetAttributesRegistry,
        4,
        [1],
        assetMinterAsUser0
      );
      const upgradeReceipt = await assetUpgraderAsUser0.addGems(
        catalystOwner,
        assetId,
        [1],
        catalystOwner
      );

      const {gemEvents} = await prepareGemEventData(assetAttributesRegistry, [
        await getReceiptObject(mintReceipt, 1),
        await getReceiptObject(upgradeReceipt, 3),
      ]);
      const attributes = await assetAttributesRegistry.getAttributes(
        assetId,
        gemEvents
      );

      expect(attributes[1]).to.be.within(26, 50);
    });

    it('can get attributes when adding 1 different gem to an asset with existing gems', async function () {
      const {
        catalystOwner,
        sandContract,
        assetAttributesRegistry,
        assetMinterAsUser0,
        assetUpgraderAsUser0,
      } = await setupAssetAttributesRegistryGemsAndCatalysts();
      await transferSand(
        sandContract,
        catalystOwner,
        BigNumber.from(100000).mul(`1000000000000000000`)
      );
      const {id: assetId, receipt: mintReceipt} = await getAssetId(
        catalystOwner,
        assetAttributesRegistry,
        4,
        [1],
        assetMinterAsUser0
      );
      const upgradeReceipt = await assetUpgraderAsUser0.addGems(
        catalystOwner,
        assetId,
        [2],
        catalystOwner
      );

      const {gemEvents} = await prepareGemEventData(assetAttributesRegistry, [
        await getReceiptObject(mintReceipt, 1),
        await getReceiptObject(upgradeReceipt, 3),
      ]);
      const attributes = await assetAttributesRegistry.getAttributes(
        assetId,
        gemEvents
      );

      expect(attributes[1]).to.be.within(minValue(2), 25);
      expect(attributes[2]).to.be.within(minValue(2), 25);
    });

    it('can get attributes when adding 2 similar gems to an asset with existing gems', async function () {
      const {
        catalystOwner,
        sandContract,
        assetAttributesRegistry,
        assetMinterAsUser0,
        assetUpgraderAsUser0,
      } = await setupAssetAttributesRegistryGemsAndCatalysts();
      await transferSand(
        sandContract,
        catalystOwner,
        BigNumber.from(100000).mul(`1000000000000000000`)
      );
      const {id: assetId, receipt: mintReceipt} = await getAssetId(
        catalystOwner,
        assetAttributesRegistry,
        4,
        [1],
        assetMinterAsUser0
      );
      const upgradeReceipt = await assetUpgraderAsUser0.addGems(
        catalystOwner,
        assetId,
        [1, 1],
        catalystOwner
      );

      const {gemEvents} = await prepareGemEventData(assetAttributesRegistry, [
        await getReceiptObject(mintReceipt, 1),
        await getReceiptObject(upgradeReceipt, 3),
      ]);
      const attributes = await assetAttributesRegistry.getAttributes(
        assetId,
        gemEvents
      );

      expect(attributes[1]).to.be.within(51, 75);
    });

    it('can get attributes when adding 2 different gems to an asset with existing gems', async function () {
      const {
        catalystOwner,
        sandContract,
        assetAttributesRegistry,
        assetMinterAsUser0,
        assetUpgraderAsUser0,
      } = await setupAssetAttributesRegistryGemsAndCatalysts();
      await transferSand(
        sandContract,
        catalystOwner,
        BigNumber.from(100000).mul(`1000000000000000000`)
      );
      const {id: assetId, receipt: mintReceipt} = await getAssetId(
        catalystOwner,
        assetAttributesRegistry,
        4,
        [1],
        assetMinterAsUser0
      );
      const upgradeReceipt = await assetUpgraderAsUser0.addGems(
        catalystOwner,
        assetId,
        [2, 3],
        catalystOwner
      );

      const {gemEvents} = await prepareGemEventData(assetAttributesRegistry, [
        await getReceiptObject(mintReceipt, 1),
        await getReceiptObject(upgradeReceipt, 3),
      ]);
      const attributes = await assetAttributesRegistry.getAttributes(
        assetId,
        gemEvents
      );

      expect(attributes[1]).to.be.within(minValue(3), 25);
      expect(attributes[2]).to.be.within(minValue(3), 25);
      expect(attributes[3]).to.be.within(minValue(3), 25);
    });

    it('can get attributes when adding 3 similar gems to an asset with existing gems', async function () {
      const {
        catalystOwner,
        sandContract,
        assetAttributesRegistry,
        assetMinterAsUser0,
        assetUpgraderAsUser0,
      } = await setupAssetAttributesRegistryGemsAndCatalysts();
      await transferSand(
        sandContract,
        catalystOwner,
        BigNumber.from(100000).mul(`1000000000000000000`)
      );
      const {id: assetId, receipt: mintReceipt} = await getAssetId(
        catalystOwner,
        assetAttributesRegistry,
        4,
        [5],
        assetMinterAsUser0
      );
      const upgradeReceipt = await assetUpgraderAsUser0.addGems(
        catalystOwner,
        assetId,
        [5, 5, 5],
        catalystOwner
      );

      const {gemEvents} = await prepareGemEventData(assetAttributesRegistry, [
        await getReceiptObject(mintReceipt, 1),
        await getReceiptObject(upgradeReceipt, 3),
      ]);
      const attributes = await assetAttributesRegistry.getAttributes(
        assetId,
        gemEvents
      );

      expect(attributes[5]).to.be.within(76, 100);
    });

    it('can get attributes when adding 3 different gems to an asset with existing gems', async function () {
      const {
        catalystOwner,
        sandContract,
        assetAttributesRegistry,
        assetMinterAsUser0,
        assetUpgraderAsUser0,
      } = await setupAssetAttributesRegistryGemsAndCatalysts();
      await transferSand(
        sandContract,
        catalystOwner,
        BigNumber.from(100000).mul(`1000000000000000000`)
      );
      const {id: assetId, receipt: mintReceipt} = await getAssetId(
        catalystOwner,
        assetAttributesRegistry,
        4,
        [1],
        assetMinterAsUser0
      );
      const upgradeReceipt = await assetUpgraderAsUser0.addGems(
        catalystOwner,
        assetId,
        [2, 3, 4],
        catalystOwner
      );

      const {gemEvents} = await prepareGemEventData(assetAttributesRegistry, [
        await getReceiptObject(mintReceipt, 1),
        await getReceiptObject(upgradeReceipt, 3),
      ]);
      const attributes = await assetAttributesRegistry.getAttributes(
        assetId,
        gemEvents
      );

      expect(attributes[1]).to.be.within(minValue(4), 25);
      expect(attributes[2]).to.be.within(minValue(4), 25);
      expect(attributes[3]).to.be.within(minValue(4), 25);
      expect(attributes[4]).to.be.within(minValue(4), 25);
    });

    it('can get attributes when adding gems to an asset multiple times', async function () {
      const {
        catalystOwner,
        sandContract,
        assetAttributesRegistry,
        assetMinterAsUser0,
        assetUpgraderAsUser0,
      } = await setupAssetAttributesRegistryGemsAndCatalysts();
      await transferSand(
        sandContract,
        catalystOwner,
        BigNumber.from(100000).mul(`1000000000000000000`)
      );
      const {id: assetId, receipt: mintReceipt} = await getAssetId(
        catalystOwner,
        assetAttributesRegistry,
        4,
        [1],
        assetMinterAsUser0
      );
      const upgradeReceipt1 = await assetUpgraderAsUser0.addGems(
        catalystOwner,
        assetId,
        [1],
        catalystOwner
      );
      const upgradeReceipt2 = await assetUpgraderAsUser0.addGems(
        catalystOwner,
        assetId,
        [1, 2],
        catalystOwner
      );

      const {gemEvents} = await prepareGemEventData(assetAttributesRegistry, [
        await getReceiptObject(mintReceipt, 1),
        await getReceiptObject(upgradeReceipt1, 3),
        await getReceiptObject(upgradeReceipt2, 3),
      ]);
      const attributes = await assetAttributesRegistry.getAttributes(
        assetId,
        gemEvents
      );

      expect(attributes[1]).to.be.within(51, 75);
      expect(attributes[2]).to.be.within(minValue(4), 25);
    });

    it('can get attributes when upgrading an asset multiple times', async function () {
      const {
        catalystOwner,
        sandContract,
        assetAttributesRegistry,
        assetMinterAsUser0,
        assetUpgraderAsUser0,
      } = await setupAssetAttributesRegistryGemsAndCatalysts();
      await transferSand(
        sandContract,
        catalystOwner,
        BigNumber.from(100000).mul(`1000000000000000000`)
      );
      const {id: assetId, receipt: mintReceipt} = await getAssetId(
        catalystOwner,
        assetAttributesRegistry,
        4,
        [1],
        assetMinterAsUser0
      );

      const {
        gemEvents: gemEvnt1,
      } = await prepareGemEventData(assetAttributesRegistry, [
        await getReceiptObject(mintReceipt, 1),
      ]);
      const attributes1 = await assetAttributesRegistry.getAttributes(
        assetId,
        gemEvnt1
      );
      expect(attributes1[0]).to.equal(0);
      expect(attributes1[1]).to.be.within(1, 25);
      expect(attributes1[2]).to.equal(0);
      expect(attributes1[3]).to.equal(0);
      expect(attributes1[4]).to.equal(0);
      expect(attributes1[5]).to.equal(0);

      const upgradeReceipt1 = await assetUpgraderAsUser0.addGems(
        catalystOwner,
        assetId,
        [1, 4],
        catalystOwner
      );
      const {
        gemEvents: gemEvnt2,
      } = await prepareGemEventData(assetAttributesRegistry, [
        await getReceiptObject(mintReceipt, 1),
        await getReceiptObject(upgradeReceipt1, 3),
      ]);
      const attributes2 = await assetAttributesRegistry.getAttributes(
        assetId,
        gemEvnt2
      );
      expect(attributes2[0]).to.equal(0);
      expect(attributes2[1]).to.be.within(26, 50);
      expect(attributes2[2]).to.equal(0);
      expect(attributes2[3]).to.equal(0);
      expect(attributes2[4]).to.be.within(minValue(3), 25);
      expect(attributes2[5]).to.equal(0);

      const changeCatReceipt = await assetUpgraderAsUser0.changeCatalyst(
        catalystOwner,
        assetId,
        4,
        [5, 5, 5, 5],
        catalystOwner
      );

      const {
        gemEvents: gemEvnt3,
      } = await prepareGemEventData(assetAttributesRegistry, [
        await getReceiptObject(changeCatReceipt, 2),
      ]);
      const attributes3 = await assetAttributesRegistry.getAttributes(
        assetId,
        gemEvnt3
      );

      expect(attributes3[0]).to.equal(0);
      expect(attributes3[1]).to.equal(0);
      expect(attributes3[2]).to.equal(0);
      expect(attributes3[3]).to.equal(0);
      expect(attributes3[4]).to.equal(0);
      expect(attributes3[5]).to.be.within(76, 100);
    });

    it('attributes after multiple upgrades are correct', async function () {
      const {
        catalystOwner,
        sandContract,
        assetAttributesRegistry,
        assetMinterAsUser0,
        assetUpgraderAsUser0,
      } = await setupAssetAttributesRegistryGemsAndCatalysts();
      await transferSand(
        sandContract,
        catalystOwner,
        BigNumber.from(100000).mul(`1000000000000000000`)
      );
      const {id: assetId} = await getAssetId(
        catalystOwner,
        assetAttributesRegistry,
        4,
        [1, 1],
        assetMinterAsUser0
      );

      await assetUpgraderAsUser0.addGems(
        catalystOwner,
        assetId,
        [2, 5],
        catalystOwner
      );

      const upgradeCatalystReceipt1 = await assetUpgraderAsUser0.changeCatalyst(
        catalystOwner,
        assetId,
        2,
        [1, 1],
        catalystOwner
      );

      const {gemEvents} = await prepareGemEventData(assetAttributesRegistry, [
        await getReceiptObject(upgradeCatalystReceipt1, 2),
      ]);

      const attributes = await assetAttributesRegistry.getAttributes(
        assetId,
        gemEvents
      );

      expect(attributes[0]).to.equal(0);
      expect(attributes[1]).to.be.within(26, 50);
      expect(attributes[2]).to.equal(0);
      expect(attributes[3]).to.equal(0);
      expect(attributes[4]).to.equal(0);
      expect(attributes[5]).to.equal(0);
    });

    it('should fail if numGems > MAX-NUM_GEMS', async function () {
      const {
        catalystOwner,
        sandContract,
        assetAttributesRegistry,
        assetMinterAsUser0,
        assetUpgraderAsUser0,
      } = await setupAssetAttributesRegistryGemsAndCatalysts();
      await transferSand(
        sandContract,
        catalystOwner,
        BigNumber.from(100000).mul(`1000000000000000000`)
      );
      const {id: assetId, receipt: mintReceipt} = await getAssetId(
        catalystOwner,
        assetAttributesRegistry,
        4,
        [1, 1, 1, 1],
        assetMinterAsUser0
      );

      const upgradeCatalystReceipt1 = await assetUpgraderAsUser0.changeCatalyst(
        catalystOwner,
        assetId,
        2,
        [1, 1],
        catalystOwner
      );
      const upgradeCatalystReceipt2 = await assetUpgraderAsUser0.changeCatalyst(
        catalystOwner,
        assetId,
        4,
        [5, 5, 5, 5],
        catalystOwner
      );
      const upgradeCatalystReceipt3 = await assetUpgraderAsUser0.changeCatalyst(
        catalystOwner,
        assetId,
        3,
        [4, 2, 5],
        catalystOwner
      );
      const upgradeCatalystReceipt4 = await assetUpgraderAsUser0.changeCatalyst(
        catalystOwner,
        assetId,
        4,
        [1, 3, 5, 2],
        catalystOwner
      );

      const {gemEvents} = await prepareGemEventData(assetAttributesRegistry, [
        await getReceiptObject(mintReceipt, 1),
        await getReceiptObject(upgradeCatalystReceipt1, 2),
        await getReceiptObject(upgradeCatalystReceipt2, 2),
        await getReceiptObject(upgradeCatalystReceipt3, 2),
        await getReceiptObject(upgradeCatalystReceipt4, 2),
      ]);

      await expect(
        assetAttributesRegistry.getAttributes(assetId, gemEvents)
      ).to.be.revertedWith('TOO_MANY_GEMS');
    });
  });
});
