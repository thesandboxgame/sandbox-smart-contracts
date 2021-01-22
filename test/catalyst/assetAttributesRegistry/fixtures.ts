import {ethers, deployments, getNamedAccounts} from 'hardhat';
import {BigNumber, Contract} from 'ethers';
import {waitFor} from '../../utils';

export const setupAssetAttributesRegistry = deployments.createFixture(
  async () => {
    await deployments.fixture();
    const assetAttributesRegistry: Contract = await ethers.getContract(
      'AssetAttributesRegistry'
    );
    const {assetAttributesRegistryAdmin} = await getNamedAccounts();

    await waitFor(
      assetAttributesRegistry
        .connect(ethers.provider.getSigner(assetAttributesRegistryAdmin))
        .changeMinter(assetAttributesRegistryAdmin)
    );
    return {
      assetAttributesRegistry,
      assetAttributesRegistryAdmin,
    };
  }
);
export async function setCatalyst(
  assetId: BigNumber,
  catalystId: number,
  gemsIds: number[]
): Promise<{record: any; event: any; block: any}> {
  const {
    assetAttributesRegistry,
    assetAttributesRegistryAdmin,
  } = await setupAssetAttributesRegistry();

  await assetAttributesRegistry
    .connect(ethers.provider.getSigner(assetAttributesRegistryAdmin))
    .setCatalyst(assetId, catalystId, gemsIds);
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
