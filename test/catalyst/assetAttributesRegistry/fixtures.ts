import {ethers, deployments, getNamedAccounts} from 'hardhat';
import {BigNumber, Contract, Event} from 'ethers';
import {Block} from '@ethersproject/providers';

export const setupAssetAttributesRegistry = deployments.createFixture(
  async () => {
    await deployments.fixture();
    const assetAttributesRegistry: Contract = await ethers.getContract(
      'AssetAttributesRegistry'
    );
    const {assetAttributesRegistryAdmin} = await getNamedAccounts();

    return {
      assetAttributesRegistry,
      assetAttributesRegistryAdmin,
    };
  }
);
export async function setCatalyst(
  assetId: BigNumber,
  catalystId: number,
  gemsIds: number[],
  collectionId?: BigNumber
): Promise<{
  record: {catalystId: number; exists: boolean; gemIds: []};
  event: Event;
  block: Block;
}> {
  const {
    assetAttributesRegistry,
    assetAttributesRegistryAdmin,
  } = await setupAssetAttributesRegistry();
  if (collectionId) {
    await waitFor(
      assetAttributesRegistry
        .connect(ethers.provider.getSigner(assetAttributesRegistryAdmin))
        .setCatalyst(collectionId, catalystId, gemsIds)
    );
  } else {
    await waitFor(
      assetAttributesRegistry
        .connect(ethers.provider.getSigner(assetAttributesRegistryAdmin))
        .setCatalyst(assetId, catalystId, gemsIds)
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
