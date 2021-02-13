import { ethers, deployments, getNamedAccounts, getUnnamedAccounts } from 'hardhat';
import { BigNumber, Contract, Event } from 'ethers';
import { Block } from '@ethersproject/providers';
import { waitFor } from '../../utils';
import { setupGemsAndCatalysts } from '../gemsCatalystsRegistry/fixtures';

export const setupAssetAttributesRegistry = deployments.createFixture(
  async () => {
    await deployments.fixture();
    await setupGemsAndCatalysts();
    const assetAttributesRegistry: Contract = await ethers.getContract(
      'AssetAttributesRegistry'
    );
    const assetUpgrader: Contract = await ethers.getContract('AssetUpgrader');
    const { assetAttributesRegistryAdmin } = await getNamedAccounts();
    const users = await getUnnamedAccounts();
    const mockedMigrationContractAddress = users[1];

    const assetAttributesRegistryAsUser0 = await assetAttributesRegistry.connect(
      ethers.provider.getSigner(users[0])
    );
    const assetAttributesRegistryAsRegistryAdmin = await assetAttributesRegistry.connect(
      ethers.provider.getSigner(assetAttributesRegistryAdmin)
    );
    const assetUpgraderAsUser0 = await assetUpgrader.connect(
      ethers.provider.getSigner(users[0])
    );
    const assetAttributesRegistryAsmockedMigrationContract = await assetAttributesRegistry.connect(
      ethers.provider.getSigner(mockedMigrationContractAddress)
    );
    return {
      assetAttributesRegistry,
      assetAttributesRegistryAdmin,
      assetUpgrader,
      assetAttributesRegistryAsUser0,
      assetAttributesRegistryAsRegistryAdmin,
      assetAttributesRegistryAsmockedMigrationContract,
      assetUpgraderAsUser0
    };
  }
);
export async function setCatalyst(
  from: string,
  assetId: BigNumber,
  catalystId: number,
  gemsIds: number[],
  to: string,
  collectionId?: BigNumber
): Promise<{
  record: { catalystId: number; exists: boolean; gemIds: [] };
  event: Event;
  block: Block;
}> {
  const {
    assetAttributesRegistry,
    assetUpgrader,
  } = await setupAssetAttributesRegistry();
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
  return { record, event, block };
}
