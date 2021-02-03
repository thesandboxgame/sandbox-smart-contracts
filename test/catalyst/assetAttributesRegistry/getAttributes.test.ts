import {ethers} from 'hardhat';
import {Address, Receipt} from 'hardhat-deploy/types';
import {BigNumber, Contract, Event} from 'ethers';
import {expect} from '../../chai-setup';
import catalysts from '../../../data/catalysts';
import gems from '../../../data/gems';
import {setupGemsAndCatalysts} from '../gemsCatalystsRegistry/fixtures';
import {setupAssetAttributesRegistry} from '../assetAttributesRegistry/fixtures';
import {
  setupAssetMinter,
  MintOptions,
  MintMultiOptions,
} from '../assetMinter/fixtures';
import {findEvents, waitFor} from '../../utils';
import {prepareGemEventData} from '../utils';
import {setupAssetUpgrader} from '../assetUpgrader/fixtures';

const NFT_SUPPLY = 1;

const mintOptions: MintOptions = {
  from: ethers.constants.AddressZero,
  packId: BigNumber.from('1'),
  metaDataHash: ethers.utils.keccak256('0x42'),
  catalystId: catalysts[1].catalystId,
  gemIds: [gems[0].gemId],
  quantity: NFT_SUPPLY,
  rarity: 0,
  to: ethers.constants.AddressZero,
  data: Buffer.from(''),
};

const mintMultiOptions: MintMultiOptions = {
  from: ethers.constants.AddressZero,
  packId: BigNumber.from('1'),
  metadataHash: ethers.utils.keccak256('0x42'),
  gemsQuantities: [0, 2, 0, 0, 0, 0],
  catalystsQuantities: [0, 2, 0, 0, 0],
  assets: [
    {
      gemIds: [1],
      quantity: 1,
      catalystId: 1,
    },
    {
      gemIds: [1],
      quantity: 1,
      catalystId: 1,
    },
  ],
  to: ethers.constants.AddressZero,
  data: Buffer.from(''),
};

function minValue(gems: number): number {
  return (gems - 1) * 5 + 1;
}

// async function getMintReceipt(
//   catId: number,
//   gemIds: number[],
//   minter: Contract,
//   creator: Address,
//   owner: Address,
//   mintOptions: MintOptions
// ): Promise<Receipt> {
//   const mintReceipt = await minter.mint(
//     creator,
//     mintOptions.packId,
//     mintOptions.metaDataHash,
//     catId,
//     gemIds,
//     NFT_SUPPLY,
//     mintOptions.rarity,
//     owner,
//     mintOptions.data
//   );
//   return mintReceipt;
// }

// on minting an asset, the CatalystApplied event is emitted. When gems are added(upgrade) the GemsAdded event is emitted. In order to getAttributes, we need to collect all CatalystApplied && GemsAdded events, from the blocknumber when the catalyst was applied onwards...
// so:
// 1.) mint the asset w/catalyst and get the assetId & blockNumber
// 2.) find all GemsAdded events after this filtered by assetId
// 3.) from each found event (including the original CatalystApplied event) construct a GemEvent{} and add to an array  gemEvents[]
// 4.) call getAttributes with assetId and gemEvents
describe('AssetAttributesRegistry: getAttributes', function () {
  let assetMinterContract: Contract;
  let assetMinterAsCatalystOwner: Contract;
  let assetUpgraderContract: Contract;
  let assetAttributesRegistry: Contract;
  let catalystOwner: Address;
  let commonCatalyst: Contract;
  let rareCatalyst: Contract;
  let epicCatalyst: Contract;
  let legendaryCatalyst: Contract;
  let powerGem: Contract;
  let defenseGem: Contract;
  let speedGem: Contract;
  let magicGem: Contract;
  let luckGem: Contract;

  async function getMintReceipt(
    catId: number,
    gemIds: number[]
  ): Promise<Receipt> {
    const mintReceipt = await assetMinterAsCatalystOwner.mint(
      catalystOwner,
      mintOptions.packId,
      mintOptions.metaDataHash,
      catId,
      gemIds,
      NFT_SUPPLY,
      mintOptions.rarity,
      catalystOwner,
      mintOptions.data
    );
    return mintReceipt;
  }

  async function getCatEvents(receipt: Receipt): Promise<Event[]> {
    const events = await findEvents(
      assetAttributesRegistry,
      'CatalystApplied',
      receipt.blockHash
    );
    return events;
  }

  interface AssetMintObj {
    id: BigNumber;
    receipt: Receipt;
  }

  async function getAssetId(
    catalystId: number,
    gemIds: number[]
  ): Promise<AssetMintObj> {
    const mintReceipt = await getMintReceipt(catalystId, gemIds);
    const catalystAppliedEvents = await getCatEvents(mintReceipt);
    const args = catalystAppliedEvents[0].args;
    const assetId = args ? args[0] : null;
    return {id: assetId, receipt: mintReceipt};
  }

  beforeEach(async function () {
    ({assetMinterContract} = await setupAssetMinter());
    ({assetUpgraderContract} = await setupAssetUpgrader());
    ({assetAttributesRegistry} = await setupAssetAttributesRegistry());
    ({catalystOwner} = await setupGemsAndCatalysts());
    assetMinterAsCatalystOwner = await assetMinterContract.connect(
      ethers.provider.getSigner(catalystOwner)
    );
  });

  describe('getAttributes: minting', function () {
    it('can get attributes for 1 gem', async function () {
      const {id: assetId, receipt: mintReceipt} = await getAssetId(1, [1]);
      const {gemEvents} = await prepareGemEventData(
        assetAttributesRegistry,
        mintReceipt,
        []
      );
      const attributes = await assetAttributesRegistry.getAttributes(
        assetId,
        gemEvents
      );

      expect(attributes[1]).to.be.within(minValue(1), 25);
    });

    it('can get attributes for 2 identical gems', async function () {
      const {id: assetId, receipt: mintReceipt} = await getAssetId(2, [2, 2]);
      const {gemEvents} = await prepareGemEventData(
        assetAttributesRegistry,
        mintReceipt,
        []
      );
      const attributes = await assetAttributesRegistry.getAttributes(
        assetId,
        gemEvents
      );

      expect(attributes[2]).to.be.within(26, 50);
    });

    it('can get attributes for 3 identical gems', async function () {
      const {id: assetId, receipt: mintReceipt} = await getAssetId(3, [
        3,
        3,
        3,
      ]);
      const {gemEvents} = await prepareGemEventData(
        assetAttributesRegistry,
        mintReceipt,
        []
      );
      const attributes = await assetAttributesRegistry.getAttributes(
        assetId,
        gemEvents
      );

      expect(attributes[3]).to.be.within(51, 75);
    });

    it('can get attributes for 4 identical gems', async function () {
      const {id: assetId, receipt: mintReceipt} = await getAssetId(4, [
        4,
        4,
        4,
        4,
      ]);
      const {gemEvents} = await prepareGemEventData(
        assetAttributesRegistry,
        mintReceipt,
        []
      );
      const attributes = await assetAttributesRegistry.getAttributes(
        assetId,
        gemEvents
      );

      expect(attributes[4]).to.be.within(76, 100);
    });

    it('can get attributes for 2 different gems', async function () {
      const {id: assetId, receipt: mintReceipt} = await getAssetId(2, [1, 2]);
      const {gemEvents} = await prepareGemEventData(
        assetAttributesRegistry,
        mintReceipt,
        []
      );
      const attributes = await assetAttributesRegistry.getAttributes(
        assetId,
        gemEvents
      );

      expect(attributes[1]).to.be.within(minValue(2), 25);
      expect(attributes[2]).to.be.within(minValue(2), 25);
    });

    it('can get attributes for 3 different gems', async function () {
      const {id: assetId, receipt: mintReceipt} = await getAssetId(3, [
        1,
        2,
        3,
      ]);
      const {gemEvents} = await prepareGemEventData(
        assetAttributesRegistry,
        mintReceipt,
        []
      );
      const attributes = await assetAttributesRegistry.getAttributes(
        assetId,
        gemEvents
      );

      expect(attributes[1]).to.be.within(minValue(3), 25);
      expect(attributes[2]).to.be.within(minValue(3), 25);
      expect(attributes[3]).to.be.within(minValue(3), 25);
    });

    it('can get attributes for 4 different gems', async function () {
      const {id: assetId, receipt: mintReceipt} = await getAssetId(4, [
        1,
        2,
        3,
        4,
      ]);
      const {gemEvents} = await prepareGemEventData(
        assetAttributesRegistry,
        mintReceipt,
        []
      );
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
      const {id: assetId, receipt: mintReceipt} = await getAssetId(3, [
        1,
        1,
        2,
      ]);
      const {gemEvents} = await prepareGemEventData(
        assetAttributesRegistry,
        mintReceipt,
        []
      );
      const attributes = await assetAttributesRegistry.getAttributes(
        assetId,
        gemEvents
      );

      expect(attributes[1]).to.be.within(26, 50);
      expect(attributes[2]).to.be.within(minValue(3), 25);
    });

    it('can get attributes for 3 identical gems + 1 different gem', async function () {
      const {id: assetId, receipt: mintReceipt} = await getAssetId(4, [
        2,
        2,
        2,
        3,
      ]);
      const {gemEvents} = await prepareGemEventData(
        assetAttributesRegistry,
        mintReceipt,
        []
      );
      const attributes = await assetAttributesRegistry.getAttributes(
        assetId,
        gemEvents
      );

      expect(attributes[2]).to.be.within(51, 75);
      expect(attributes[3]).to.be.within(minValue(4), 25);
    });

    it('can get attributes for 2 identical gems + 2 different identical gems', async function () {
      const {id: assetId, receipt: mintReceipt} = await getAssetId(4, [
        2,
        2,
        3,
        3,
      ]);
      const {gemEvents} = await prepareGemEventData(
        assetAttributesRegistry,
        mintReceipt,
        []
      );
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
      const {id: assetId, receipt: mintReceipt} = await getAssetId(4, []);
      const upgradeReceipt = await assetUpgraderContract.addGems(
        catalystOwner,
        assetId,
        [1],
        catalystOwner
      );

      const {gemEvents} = await prepareGemEventData(
        assetAttributesRegistry,
        mintReceipt,
        [upgradeReceipt]
      );
      const attributes = await assetAttributesRegistry.getAttributes(
        assetId,
        gemEvents
      );

      expect(attributes[1]).to.be.within(minValue(1), 25);
    });

    it('can get attributes when adding 2 identical gems to an asset with an empty catalyst', async function () {
      const {id: assetId, receipt: mintReceipt} = await getAssetId(4, []);
      const upgradeReceipt = await assetUpgraderContract.addGems(
        catalystOwner,
        assetId,
        [2, 2],
        catalystOwner
      );

      const {gemEvents} = await prepareGemEventData(
        assetAttributesRegistry,
        mintReceipt,
        [upgradeReceipt]
      );
      const attributes = await assetAttributesRegistry.getAttributes(
        assetId,
        gemEvents
      );

      expect(attributes[2]).to.be.within(26, 50);
    });

    it('can get attributes when adding 3 identical gems to an asset with an empty catalyst', async function () {
      const {id: assetId, receipt: mintReceipt} = await getAssetId(4, []);
      const upgradeReceipt = await assetUpgraderContract.addGems(
        catalystOwner,
        assetId,
        [3, 3, 3],
        catalystOwner
      );

      const {gemEvents} = await prepareGemEventData(
        assetAttributesRegistry,
        mintReceipt,
        [upgradeReceipt]
      );
      const attributes = await assetAttributesRegistry.getAttributes(
        assetId,
        gemEvents
      );

      expect(attributes[3]).to.be.within(51, 75);
    });

    it('can get attributes when adding 4 identical gems to an asset with an empty catalyst', async function () {
      const {id: assetId, receipt: mintReceipt} = await getAssetId(4, []);
      const upgradeReceipt = await assetUpgraderContract.addGems(
        catalystOwner,
        assetId,
        [4, 4, 4, 4],
        catalystOwner
      );

      const {gemEvents} = await prepareGemEventData(
        assetAttributesRegistry,
        mintReceipt,
        [upgradeReceipt]
      );
      const attributes = await assetAttributesRegistry.getAttributes(
        assetId,
        gemEvents
      );

      expect(attributes[4]).to.be.within(76, 100);
    });

    it('can get attributes when adding 2 different gems to an asset with an empty catalyst', async function () {
      const {id: assetId, receipt: mintReceipt} = await getAssetId(4, []);
      const upgradeReceipt = await assetUpgraderContract.addGems(
        catalystOwner,
        assetId,
        [1, 2],
        catalystOwner
      );

      const {gemEvents} = await prepareGemEventData(
        assetAttributesRegistry,
        mintReceipt,
        [upgradeReceipt]
      );
      const attributes = await assetAttributesRegistry.getAttributes(
        assetId,
        gemEvents
      );

      expect(attributes[1]).to.be.within(minValue(2), 25);
      expect(attributes[2]).to.be.within(minValue(2), 25);
    });

    it('can get attributes when adding 3 different gems to an asset with an empty catalyst', async function () {
      const {id: assetId, receipt: mintReceipt} = await getAssetId(4, []);
      const upgradeReceipt = await assetUpgraderContract.addGems(
        catalystOwner,
        assetId,
        [1, 2, 3],
        catalystOwner
      );

      const {gemEvents} = await prepareGemEventData(
        assetAttributesRegistry,
        mintReceipt,
        [upgradeReceipt]
      );
      const attributes = await assetAttributesRegistry.getAttributes(
        assetId,
        gemEvents
      );

      expect(attributes[1]).to.be.within(minValue(3), 25);
      expect(attributes[2]).to.be.within(minValue(3), 25);
      expect(attributes[3]).to.be.within(minValue(3), 25);
    });

    it('can get attributes when adding 4 different gems to an asset with an empty catalyst', async function () {
      const {id: assetId, receipt: mintReceipt} = await getAssetId(4, []);
      const upgradeReceipt = await assetUpgraderContract.addGems(
        catalystOwner,
        assetId,
        [1, 2, 3, 4],
        catalystOwner
      );

      const {gemEvents} = await prepareGemEventData(
        assetAttributesRegistry,
        mintReceipt,
        [upgradeReceipt]
      );
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
      const {id: assetId, receipt: mintReceipt} = await getAssetId(4, [1]);
      const upgradeReceipt = await assetUpgraderContract.addGems(
        catalystOwner,
        assetId,
        [1],
        catalystOwner
      );

      const {gemEvents} = await prepareGemEventData(
        assetAttributesRegistry,
        mintReceipt,
        [upgradeReceipt]
      );
      const attributes = await assetAttributesRegistry.getAttributes(
        assetId,
        gemEvents
      );

      expect(attributes[1]).to.be.within(26, 50);
    });

    it('can get attributes when adding 1 different gem to an asset with existing gems', async function () {
      const {id: assetId, receipt: mintReceipt} = await getAssetId(4, [1]);
      const upgradeReceipt = await assetUpgraderContract.addGems(
        catalystOwner,
        assetId,
        [2],
        catalystOwner
      );

      const {gemEvents} = await prepareGemEventData(
        assetAttributesRegistry,
        mintReceipt,
        [upgradeReceipt]
      );
      const attributes = await assetAttributesRegistry.getAttributes(
        assetId,
        gemEvents
      );

      expect(attributes[1]).to.be.within(minValue(2), 25);
      expect(attributes[2]).to.be.within(minValue(2), 25);
    });

    it('can get attributes when adding 2 similar gems to an asset with existing gems', async function () {
      const {id: assetId, receipt: mintReceipt} = await getAssetId(4, [1]);
      const upgradeReceipt = await assetUpgraderContract.addGems(
        catalystOwner,
        assetId,
        [1, 1],
        catalystOwner
      );

      const {gemEvents} = await prepareGemEventData(
        assetAttributesRegistry,
        mintReceipt,
        [upgradeReceipt]
      );
      const attributes = await assetAttributesRegistry.getAttributes(
        assetId,
        gemEvents
      );

      console.log(`attributes: ${attributes}`);
      expect(attributes[1]).to.be.within(51, 75);
    });

    it('can get attributes when adding 2 different gems to an asset with existing gems', async function () {
      const {id: assetId, receipt: mintReceipt} = await getAssetId(4, [1]);
      const upgradeReceipt = await assetUpgraderContract.addGems(
        catalystOwner,
        assetId,
        [2, 3],
        catalystOwner
      );

      const {gemEvents} = await prepareGemEventData(
        assetAttributesRegistry,
        mintReceipt,
        [upgradeReceipt]
      );
      const attributes = await assetAttributesRegistry.getAttributes(
        assetId,
        gemEvents
      );

      console.log(`attributes: ${attributes}`);
      expect(attributes[1]).to.be.within(minValue(3), 25);
      expect(attributes[2]).to.be.within(minValue(3), 25);
      expect(attributes[3]).to.be.within(minValue(3), 25);
    });

    it('can get attributes when adding 3 similar gems to an asset with existing gems', async function () {
      const {id: assetId, receipt: mintReceipt} = await getAssetId(4, [5]);
      const upgradeReceipt = await assetUpgraderContract.addGems(
        catalystOwner,
        assetId,
        [5, 5, 5],
        catalystOwner
      );

      const {gemEvents} = await prepareGemEventData(
        assetAttributesRegistry,
        mintReceipt,
        [upgradeReceipt]
      );
      const attributes = await assetAttributesRegistry.getAttributes(
        assetId,
        gemEvents
      );

      console.log(`attributes: ${attributes}`);
      expect(attributes[5]).to.be.within(76, 100);
    });

    it('can get attributes when adding 3 different gems to an asset with existing gems', async function () {
      const {id: assetId, receipt: mintReceipt} = await getAssetId(4, [1]);
      const upgradeReceipt = await assetUpgraderContract.addGems(
        catalystOwner,
        assetId,
        [2, 3, 4],
        catalystOwner
      );

      const {gemEvents} = await prepareGemEventData(
        assetAttributesRegistry,
        mintReceipt,
        [upgradeReceipt]
      );
      const attributes = await assetAttributesRegistry.getAttributes(
        assetId,
        gemEvents
      );

      console.log(`attributes: ${attributes}`);
      expect(attributes[1]).to.be.within(minValue(4), 25);
      expect(attributes[2]).to.be.within(minValue(4), 25);
      expect(attributes[3]).to.be.within(minValue(4), 25);
      expect(attributes[4]).to.be.within(minValue(4), 25);
    });

    it('can get attributes when adding gems to an asset with multiple upgrades', async function () {
      const {id: assetId, receipt: mintReceipt} = await getAssetId(4, [1]);
      const upgradeReceipt1 = await assetUpgraderContract.addGems(
        catalystOwner,
        assetId,
        [1, 2],
        catalystOwner
      );
      const upgradeReceipt2 = await assetUpgraderContract.addGems(
        catalystOwner,
        assetId,
        [1, 2],
        catalystOwner
      );

      const {gemEvents} = await prepareGemEventData(
        assetAttributesRegistry,
        mintReceipt,
        [upgradeReceipt1, upgradeReceipt2]
      );
      const attributes = await assetAttributesRegistry.getAttributes(
        assetId,
        gemEvents
      );

      console.log(`attributes: ${attributes}`);
      expect(attributes[1]).to.be.within(minValue(4), 25);
      expect(attributes[2]).to.be.within(minValue(4), 25);
      expect(attributes[3]).to.be.within(minValue(4), 25);
      expect(attributes[4]).to.be.within(minValue(4), 25);
    });

    it.skip('attributes after multiple upgrades are correct', async function () {});

    // require(numGems <= MAX_NUM_GEMS, "TOO_MANY_GEMS");
    it.skip('should fail if numGems > MAX-NUM_GEMS', async function () {});
  });
});
