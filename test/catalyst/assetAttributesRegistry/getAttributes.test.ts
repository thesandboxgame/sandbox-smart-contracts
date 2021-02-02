import {ethers, getUnnamedAccounts, getNamedAccounts} from 'hardhat';
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
import {mintCatalyst, mintGem} from '../utils';
import {findEvents, waitFor} from '../../utils';
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

class GemEvent {
  gemIds: number[];
  blockHash: string;
  constructor(ids: number[], hash: string) {
    this.gemIds = ids;
    this.blockHash = hash;
  }
}
interface AttributesObj {
  assetId: BigNumber;
  gemEvents: GemEvent[];
}

async function getGemEvent(ids: number[], hash: string): Promise<GemEvent> {
  return new GemEvent(ids, hash);
}

function minValue(gems: number): number {
  return (gems - 1) * 5 + 1;
}

async function findFilteredGemEvents(
  blockHash: string,
  id: BigNumber,
  registry: Contract
): Promise<Event[]> {
  const filter = registry.filters.GemsAdded(id);
  const events = await registry.queryFilter(filter, blockHash);
  return events;
}

async function prepareGemEventData(
  registry: Contract,
  mintReceipt: Receipt,
  upgradeReceipt?: Receipt
): Promise<AttributesObj> {
  const catalystAppliedEvents = await findEvents(
    registry,
    'CatalystApplied',
    mintReceipt.blockHash
  );
  let assetId;
  let initialGemEvent: GemEvent;
  const gemEvents: GemEvent[] = [];

  if (catalystAppliedEvents[0].args) {
    assetId = catalystAppliedEvents[0].args[0];
    initialGemEvent = await getGemEvent(
      catalystAppliedEvents[0].args[2],
      mintReceipt.blockHash
    );
    gemEvents.push(initialGemEvent);
  }

  if (upgradeReceipt) {
    const gemsAddedEvents = await findFilteredGemEvents(
      upgradeReceipt.blockHash,
      assetId,
      registry
    );
    for (const event of gemsAddedEvents) {
      if (event.args) {
        const gemEvent = await getGemEvent(
          event.args[1],
          upgradeReceipt.blockHash
        );
        gemEvents.push(gemEvent);
      }
    }
  }
  return {assetId, gemEvents};
}

// on minting an asset, the CatalystApplied event is emitted. When gems are added(upgrade) the GemsAdded event is emitted. In order to getAttributes, we need to collect all CatalystApplied && GemsAdded events, from the blocknumber when the catalyst was applied onwards...
// so:
// 1.) mint the asset w/catalyst and get the assetId & blockNumber
// 2.) find all GemsAdded events after this with matching assetId
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

  beforeEach(async function () {
    ({assetMinterContract} = await setupAssetMinter());
    ({assetUpgraderContract} = await setupAssetUpgrader());
    ({assetAttributesRegistry} = await setupAssetAttributesRegistry());
    ({
      commonCatalyst,
      rareCatalyst,
      epicCatalyst,
      legendaryCatalyst,
      powerGem,
      defenseGem,
      speedGem,
      magicGem,
      luckGem,
      catalystOwner,
    } = await setupGemsAndCatalysts());
    assetMinterAsCatalystOwner = await assetMinterContract.connect(
      ethers.provider.getSigner(catalystOwner)
    );
  });

  it('can get attributes for 1 gem', async function () {
    // expected range = minValue(1) - 25
    const mintReceipt = await waitFor(
      assetMinterAsCatalystOwner.mint(
        catalystOwner,
        mintOptions.packId,
        mintOptions.metaDataHash,
        catalysts[0].catalystId,
        [gems[0].gemId],
        NFT_SUPPLY,
        mintOptions.rarity,
        catalystOwner,
        mintOptions.data
      )
    );

    const {assetId, gemEvents} = await prepareGemEventData(
      assetAttributesRegistry,
      mintReceipt
    );
    const attributes = await assetAttributesRegistry.getAttributes(
      assetId,
      gemEvents
    );
    expect(attributes[1]).to.be.within(minValue(1), 25);
  });

  it('can get attributes for 2 identical gems', async function () {
    const mintReceipt = await waitFor(
      assetMinterAsCatalystOwner.mint(
        catalystOwner,
        mintOptions.packId,
        mintOptions.metaDataHash,
        catalysts[1].catalystId,
        [gems[1].gemId, gems[1].gemId],
        NFT_SUPPLY,
        mintOptions.rarity,
        catalystOwner,
        mintOptions.data
      )
    );

    const {assetId, gemEvents} = await prepareGemEventData(
      assetAttributesRegistry,
      mintReceipt
    );
    const attributes = await assetAttributesRegistry.getAttributes(
      assetId,
      gemEvents
    );
    console.log(`attributes: ${attributes}`);
    expect(attributes[2]).to.be.within(26, 50);
  });
  it('can get attributes for 3 identical gems', async function () {
    const mintReceipt = await waitFor(
      assetMinterAsCatalystOwner.mint(
        catalystOwner,
        mintOptions.packId,
        mintOptions.metaDataHash,
        catalysts[2].catalystId,
        [gems[2].gemId, gems[2].gemId, gems[2].gemId],
        NFT_SUPPLY,
        mintOptions.rarity,
        catalystOwner,
        mintOptions.data
      )
    );

    const {assetId, gemEvents} = await prepareGemEventData(
      assetAttributesRegistry,
      mintReceipt
    );
    const attributes = await assetAttributesRegistry.getAttributes(
      assetId,
      gemEvents
    );
    console.log(`attributes: ${attributes}`);
    expect(attributes[3]).to.be.within(51, 75);
  });
  it('can get attributes for 4 identical gems', async function () {
    const mintReceipt = await waitFor(
      assetMinterAsCatalystOwner.mint(
        catalystOwner,
        mintOptions.packId,
        mintOptions.metaDataHash,
        catalysts[3].catalystId,
        [gems[3].gemId, gems[3].gemId, gems[3].gemId, gems[3].gemId],
        NFT_SUPPLY,
        mintOptions.rarity,
        catalystOwner,
        mintOptions.data
      )
    );

    const {assetId, gemEvents} = await prepareGemEventData(
      assetAttributesRegistry,
      mintReceipt
    );
    const attributes = await assetAttributesRegistry.getAttributes(
      assetId,
      gemEvents
    );
    console.log(`attributes: ${attributes}`);
    expect(attributes[4]).to.be.within(76, 100);
  });
  it('can get attributes for 2 different gems', async function () {
    const mintReceipt = await waitFor(
      assetMinterAsCatalystOwner.mint(
        catalystOwner,
        mintOptions.packId,
        mintOptions.metaDataHash,
        catalysts[1].catalystId,
        [gems[0].gemId, gems[1].gemId],
        NFT_SUPPLY,
        mintOptions.rarity,
        catalystOwner,
        mintOptions.data
      )
    );

    const {assetId, gemEvents} = await prepareGemEventData(
      assetAttributesRegistry,
      mintReceipt
    );
    const attributes = await assetAttributesRegistry.getAttributes(
      assetId,
      gemEvents
    );
    console.log(`attributes: ${attributes}`);
    expect(attributes[1]).to.be.within(minValue(2), 25);
    expect(attributes[2]).to.be.within(minValue(2), 25);
  });
  it('can get attributes for 3 different gems', async function () {
    const mintReceipt = await waitFor(
      assetMinterAsCatalystOwner.mint(
        catalystOwner,
        mintOptions.packId,
        mintOptions.metaDataHash,
        catalysts[2].catalystId,
        [gems[0].gemId, gems[1].gemId, gems[2].gemId],
        NFT_SUPPLY,
        mintOptions.rarity,
        catalystOwner,
        mintOptions.data
      )
    );

    const {assetId, gemEvents} = await prepareGemEventData(
      assetAttributesRegistry,
      mintReceipt
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
  it('can get attributes for 4 different gems', async function () {
    const mintReceipt = await waitFor(
      assetMinterAsCatalystOwner.mint(
        catalystOwner,
        mintOptions.packId,
        mintOptions.metaDataHash,
        catalysts[3].catalystId,
        [gems[0].gemId, gems[1].gemId, gems[2].gemId, gems[3].gemId],
        NFT_SUPPLY,
        mintOptions.rarity,
        catalystOwner,
        mintOptions.data
      )
    );

    const {assetId, gemEvents} = await prepareGemEventData(
      assetAttributesRegistry,
      mintReceipt
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
  it('can get attributes for 2 identical gems + 1 different gem', async function () {
    const mintReceipt = await waitFor(
      assetMinterAsCatalystOwner.mint(
        catalystOwner,
        mintOptions.packId,
        mintOptions.metaDataHash,
        catalysts[2].catalystId,
        [gems[0].gemId, gems[0].gemId, gems[1].gemId],
        NFT_SUPPLY,
        mintOptions.rarity,
        catalystOwner,
        mintOptions.data
      )
    );

    const {assetId, gemEvents} = await prepareGemEventData(
      assetAttributesRegistry,
      mintReceipt
    );
    const attributes = await assetAttributesRegistry.getAttributes(
      assetId,
      gemEvents
    );
    console.log(`attributes: ${attributes}`);
    expect(attributes[1]).to.be.within(26, 50);
    expect(attributes[2]).to.be.within(minValue(3), 25);
  });
  it('can get attributes for 3 identical gems + 1 different gem', async function () {
    const mintReceipt = await waitFor(
      assetMinterAsCatalystOwner.mint(
        catalystOwner,
        mintOptions.packId,
        mintOptions.metaDataHash,
        catalysts[3].catalystId,
        [gems[1].gemId, gems[1].gemId, gems[1].gemId, gems[2].gemId],
        NFT_SUPPLY,
        mintOptions.rarity,
        catalystOwner,
        mintOptions.data
      )
    );

    const {assetId, gemEvents} = await prepareGemEventData(
      assetAttributesRegistry,
      mintReceipt
    );
    const attributes = await assetAttributesRegistry.getAttributes(
      assetId,
      gemEvents
    );
    console.log(`attributes: ${attributes}`);
    expect(attributes[2]).to.be.within(51, 75);
    expect(attributes[3]).to.be.within(minValue(4), 25);
  });
  it('can get attributes for 2 identical gems + 2 different identical gems', async function () {
    const mintReceipt = await waitFor(
      assetMinterAsCatalystOwner.mint(
        catalystOwner,
        mintOptions.packId,
        mintOptions.metaDataHash,
        catalysts[3].catalystId,
        [gems[1].gemId, gems[1].gemId, gems[2].gemId, gems[2].gemId],
        NFT_SUPPLY,
        mintOptions.rarity,
        catalystOwner,
        mintOptions.data
      )
    );

    const {assetId, gemEvents} = await prepareGemEventData(
      assetAttributesRegistry,
      mintReceipt
    );
    const attributes = await assetAttributesRegistry.getAttributes(
      assetId,
      gemEvents
    );
    console.log(`attributes: ${attributes}`);
    expect(attributes[2]).to.be.within(26, 50);
    expect(attributes[3]).to.be.within(26, 50);
  });
  // require(numGems <= MAX_NUM_GEMS, "TOO_MANY_GEMS");
  it('should fail if numGems > MAX-NUM_GEMS', async function () {});
});
