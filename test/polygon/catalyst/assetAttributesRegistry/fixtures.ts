import {deployments, ethers} from 'hardhat';
import {BigNumber, Contract, Event} from 'ethers';
import {Block} from '@ethersproject/providers';
import {waitFor} from '../../../utils';
import {assetAttributesRegistryFixture} from '../../../common/fixtures/assetAttributesRegistry';
import {gemsAndCatalystsFixtures} from '../../../common/fixtures/gemAndCatalysts';

export const setupAssetAttributesRegistry = deployments.createFixture(
  assetAttributesRegistryFixture
);

export const setupGemsAndCatalysts = deployments.createFixture(
  gemsAndCatalystsFixtures
);

export async function setCatalyst(
  from: string,
  assetId: BigNumber,
  catalystId: number,
  gemsIds: number[],
  to: string,
  assetUpgrader: Contract,
  assetAttributesRegistry: Contract,
  collectionId?: BigNumber
): Promise<{
  record: {catalystId: number; exists: boolean; gemIds: []};
  event: Event;
  block: Block;
}> {
  if (collectionId) {
    await waitFor(
      assetUpgrader
        .connect(ethers.provider.getSigner(from))
        .changeCatalyst(from, collectionId, catalystId, gemsIds, to)
    );
  } else {
    await waitFor(
      assetUpgrader
        .connect(ethers.provider.getSigner(from))
        .changeCatalyst(from, assetId, catalystId, gemsIds, to)
    );
  }
  const record = await assetAttributesRegistry.getRecord(assetId);

  const assetAttributesRegistryEvents = await assetAttributesRegistry.queryFilter(
    assetAttributesRegistry.filters.CatalystApplied()
  );
  const event = assetAttributesRegistryEvents.filter(
    (e) => e.event === 'CatalystApplied'
  )[0];
  const block = await ethers.provider.getBlock('latest');
  return {record, event, block};
}
