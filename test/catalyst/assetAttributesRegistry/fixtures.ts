import {
  ethers,
  deployments,
  getNamedAccounts,
  getUnnamedAccounts,
} from 'hardhat';
import {BigNumber, Contract, Event} from 'ethers';
import {Block} from '@ethersproject/providers';
import {waitFor} from '../../utils';
import {transferSand} from '../utils';
import {setupGemsAndCatalysts} from '../gemsCatalystsRegistry/fixtures';

export const setupAssetAttributesRegistry = deployments.createFixture(
  async () => {
    await deployments.fixture();
    await setupGemsAndCatalysts();
    const assetAttributesRegistry: Contract = await ethers.getContract(
      'AssetAttributesRegistry'
    );
    const assetUpgrader: Contract = await ethers.getContract('AssetUpgrader');
    const assetMinter: Contract = await ethers.getContract('AssetMinter');
    const {assetAttributesRegistryAdmin} = await getNamedAccounts();
    const users = await getUnnamedAccounts();
    const user0 = users[0];
    const mockedMigrationContractAddress = users[1];
    const sandContract = await ethers.getContract('Sand');
    await transferSand(
      sandContract,
      user0,
      BigNumber.from(100000).mul('1000000000000000000')
    );

    const assetAttributesRegistryAsUser0 = await assetAttributesRegistry.connect(
      ethers.provider.getSigner(user0)
    );
    const assetAttributesRegistryAsRegistryAdmin = await assetAttributesRegistry.connect(
      ethers.provider.getSigner(assetAttributesRegistryAdmin)
    );
    const assetUpgraderAsUser0 = await assetUpgrader.connect(
      ethers.provider.getSigner(user0)
    );
    const assetMinterAsUser0 = await assetMinter.connect(
      ethers.provider.getSigner(user0)
    );
    const assetAttributesRegistryAsmockedMigrationContract = await assetAttributesRegistry.connect(
      ethers.provider.getSigner(mockedMigrationContractAddress)
    );

    return {
      mockedMigrationContractAddress,
      user0,
      assetAttributesRegistry,
      assetAttributesRegistryAdmin,
      assetUpgrader,
      assetAttributesRegistryAsUser0,
      assetAttributesRegistryAsRegistryAdmin,
      assetAttributesRegistryAsmockedMigrationContract,
      assetUpgraderAsUser0,
      assetMinterAsUser0,
    };
  }
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
